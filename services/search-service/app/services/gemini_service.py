"""
Google Gemini Service - AI Parameter Extraction
Temporary replacement for AWS Bedrock for local development/testing.
Uses the same extract_parameters interface as BedrockService.

NOTE: BedrockService (bedrock_service.py) remains the production target.
      Switch search_orchestrator.py back to bedrock_service when ready.
"""

import asyncio
import hashlib
import json
from datetime import datetime
from typing import Optional

import google.generativeai as genai

from app.config.settings import settings
from app.cache.redis_client import redis_manager
from app.models.domain import ExtractedParams
from app.prompts.extraction_prompt import (
    SYSTEM_PROMPT,
    build_user_prompt,
    build_validation_rules
)
from app.utils.logger import logger
from app.utils.exceptions import (
    BedrockAPIError,
    BedrockResponseError
)


class GeminiService:
    """
    Service for extracting trade search parameters from natural language queries.
    Uses Google Gemini with caching and retry logic.
    Mirrors the BedrockService interface so the orchestrator can swap between them.
    """

    def __init__(self):
        """Initialize Gemini client with configuration."""
        api_key = settings.GOOGLE_API_KEY
        if not api_key:
            raise ValueError(
                "Google API key is required. Set GOOGLE_API_KEY environment variable."
            )

        genai.configure(api_key=api_key)

        # Use system_instruction so the model always has the extraction persona
        self.model = genai.GenerativeModel(
            model_name=settings.GOOGLE_MODEL_ID,
            system_instruction=SYSTEM_PROMPT,
        )

        self.cache = redis_manager
        self.validation_rules = build_validation_rules()

        logger.info(
            "Gemini service initialized",
            extra={"model": settings.GOOGLE_MODEL_ID}
        )

    # ------------------------------------------------------------------
    # Public interface (same signature as BedrockService)
    # ------------------------------------------------------------------

    async def extract_parameters(
        self,
        query: str,
        user_id: str,
        current_date: Optional[datetime] = None,
    ) -> ExtractedParams:
        """
        Extract structured parameters from a natural language query.

        Flow identical to BedrockService:
        1. Check cache
        2. On miss → call Gemini API
        3. Parse and validate JSON response
        4. Cache result
        5. Return ExtractedParams

        Args:
            query: Natural language query string
            user_id: User ID for logging
            current_date: Current date for relative date calculations

        Returns:
            ExtractedParams model with extracted parameters

        Raises:
            BedrockAPIError: Re-used for API-call failures (keeps orchestrator unchanged)
            BedrockResponseError: Re-used for parse/validation failures
        """
        normalized_query = query.strip().lower()
        cache_key = self._generate_cache_key(normalized_query)

        logger.info(
            "Extracting parameters from query (Gemini)",
            extra={
                "user_id": user_id,
                "query_length": len(query),
                "cache_key": cache_key,
            },
        )

        # Step 1: Check cache
        cached_params = await self._get_from_cache(cache_key)
        if cached_params:
            logger.info(
                "Cache hit for query extraction",
                extra={"user_id": user_id, "cache_key": cache_key},
            )
            return cached_params

        logger.info("Cache miss - calling Gemini API")

        # Step 2: Call Gemini API
        try:
            raw_response = await self._invoke_gemini(query, current_date)
        except Exception as e:
            logger.error(
                f"Gemini API call failed: {e}",
                extra={"user_id": user_id, "query": query[:100]},
            )
            raise BedrockAPIError(
                "Failed to extract parameters from query using AI (Gemini)",
                details={"error": str(e), "query": query[:100], "user_id": user_id},
            )

        # Step 3: Parse and validate
        try:
            extracted_params = self._parse_and_validate_response(raw_response)
        except Exception as e:
            logger.error(
                f"Failed to parse Gemini response: {e}",
                extra={"user_id": user_id, "raw_response": raw_response[:500]},
            )
            raise BedrockResponseError(
                "Failed to parse AI response (Gemini)",
                details={"error": str(e), "response_preview": raw_response[:200]},
            )

        # Step 4: Cache result
        await self._save_to_cache(cache_key, extracted_params)

        logger.info(
            "Parameters extracted successfully (Gemini)",
            extra={
                "user_id": user_id,
                "extracted_params": extracted_params.model_dump(),
                "cached": True,
            },
        )

        return extracted_params

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _invoke_gemini(
        self,
        query: str,
        current_date: Optional[datetime] = None,
    ) -> str:
        """
        Call Google Gemini synchronously via asyncio executor so the
        async orchestrator is not blocked.

        Returns:
            Raw JSON string from Gemini
        """
        user_prompt = build_user_prompt(query, current_date)

        generation_config = genai.types.GenerationConfig(
            temperature=0.0,           # Deterministic extraction
            max_output_tokens=500,
        )

        def _sync_call():
            response = self.model.generate_content(
                user_prompt,
                generation_config=generation_config,
            )
            if not response.text:
                raise RuntimeError("Empty response from Gemini.")
            return response.text.strip()

        loop = asyncio.get_event_loop()
        raw_text = await loop.run_in_executor(None, _sync_call)

        logger.info(
            "Gemini API call successful",
            extra={"model": settings.GOOGLE_MODEL_ID, "response_length": len(raw_text)},
        )
        logger.info(
            "[GEMINI RAW RESPONSE]\n%s",
            raw_text,
        )

        return raw_text

    def _parse_and_validate_response(self, raw_response: str) -> ExtractedParams:
        """Parse and validate Gemini's JSON response (identical logic to BedrockService)."""
        cleaned = raw_response.strip()

        # Strip markdown code fences if Gemini adds them
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

        cleaned = cleaned.strip()

        try:
            params_dict = json.loads(cleaned)
        except json.JSONDecodeError as e:
            raise BedrockResponseError(
                f"Invalid JSON in Gemini response: {e}",
                details={"raw_response": raw_response[:500]},
            )

        validated_params = self._validate_parameters(params_dict)

        try:
            return ExtractedParams(**validated_params)
        except Exception as e:
            raise BedrockResponseError(
                f"Failed to create ExtractedParams model: {e}",
                details={"params": validated_params},
            )

    def _validate_parameters(self, params: dict) -> dict:
        """Validate extracted parameters (identical logic to BedrockService)."""
        validated = {}

        for field, rules in self.validation_rules.items():
            value = params.get(field)

            if value is None:
                if rules.get("nullable", True):
                    validated[field] = None
                    continue
                validated[field] = rules.get("default")
                continue

            if rules["type"] == "int":
                try:
                    validated[field] = int(value)
                except (TypeError, ValueError):
                    logger.warning(
                        f"Invalid integer value for {field}: {value}",
                        extra={"field": field, "value": value},
                    )
                    validated[field] = None
                continue

            if rules["type"] == "list":
                if not isinstance(value, list):
                    value = [value] if value else []

                if "allowed_values" in rules:
                    invalid_values = [v for v in value if v not in rules["allowed_values"]]
                    if invalid_values:
                        logger.warning(
                            f"Invalid values in {field}: {invalid_values}",
                            extra={"field": field, "invalid": invalid_values},
                        )
                        value = [v for v in value if v in rules["allowed_values"]]

                validated[field] = value if value else None

            elif rules["type"] == "bool":
                validated[field] = bool(value)

            elif rules["type"] == "date":
                if isinstance(value, str):
                    try:
                        datetime.strptime(value, rules["format"])
                        validated[field] = value
                    except ValueError:
                        logger.warning(
                            f"Invalid date format for {field}: {value}",
                            extra={"field": field, "value": value},
                        )
                        validated[field] = None
                else:
                    validated[field] = None

            else:
                validated[field] = value

        return validated

    def _generate_cache_key(self, query: str) -> str:
        """Generate cache key (same hash logic as BedrockService, different prefix)."""
        hash_hex = hashlib.sha256(query.encode()).hexdigest()[:16]
        return f"gemini:extraction:{hash_hex}"

    async def _get_from_cache(self, cache_key: str) -> Optional[ExtractedParams]:
        """Retrieve cached extraction result."""
        try:
            cached_json = await self.cache.get(cache_key)
            if cached_json:
                return ExtractedParams(**json.loads(cached_json))
            return None
        except Exception as e:
            logger.warning(f"Cache retrieval error: {e}", extra={"cache_key": cache_key})
            return None

    async def _save_to_cache(self, cache_key: str, params: ExtractedParams) -> None:
        """Save extraction result to cache."""
        try:
            await self.cache.set(
                cache_key,
                params.model_dump_json(),
                ttl=settings.CACHE_TTL_AI_EXTRACTION,
            )
            logger.debug(
                "Cached extraction result",
                extra={"cache_key": cache_key, "ttl": settings.CACHE_TTL_AI_EXTRACTION},
            )
        except Exception as e:
            logger.warning(f"Cache save error: {e}", extra={"cache_key": cache_key})


# Global singleton instance
gemini_service = GeminiService()
