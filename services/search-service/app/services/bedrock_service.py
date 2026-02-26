"""
AWS Bedrock Service - AI Parameter Extraction
Integrates with AWS Bedrock to extract structured parameters from natural language queries.
"""

import json
import hashlib
import logging
from datetime import datetime
from typing import Optional

import aioboto3
import tiktoken
from botocore.exceptions import ClientError, BotoCoreError
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

from app.config.settings import settings
from app.cache.redis_client import redis_manager
from app.models.domain import ExtractedParams
from app.prompts.extraction_prompt import (
    SYSTEM_PROMPT,
    build_user_prompt,
    build_validation_rules,
)
from app.utils.logger import logger
from app.utils.exceptions import BedrockAPIError, BedrockResponseError


class BedrockService:
    """
    Service for extracting trade search parameters from natural language queries.
    Uses AWS Bedrock Claude 3.5 Sonnet with caching and retry logic.
    """

    def __init__(self):
        """Initialize Bedrock client with configuration"""
        # Configure aioboto3 session for Bedrock Runtime
        session_config = {}

        # Use explicit credentials if provided (dev/test), otherwise use IAM role (production)
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            session_config["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
            session_config["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
            logger.info(
                "Using explicit AWS credentials for Bedrock",
                extra={
                    "access_key_prefix": settings.AWS_ACCESS_KEY_ID[:10]
                    if settings.AWS_ACCESS_KEY_ID
                    else "N/A"
                },
            )
        else:
            logger.warning(
                "AWS credentials not found - will use IAM role",
                extra={
                    "has_access_key": bool(settings.AWS_ACCESS_KEY_ID),
                    "has_secret_key": bool(settings.AWS_SECRET_ACCESS_KEY),
                },
            )

        # Create aioboto3 session
        self.session = aioboto3.Session(**session_config)
        self.region = settings.BEDROCK_REGION
        self.cache = redis_manager
        self.validation_rules = build_validation_rules()

        logger.info(
            "Bedrock service initialized",
            extra={
                "region": settings.BEDROCK_REGION,
                "model": settings.BEDROCK_MODEL_ID,
            },
        )

    async def extract_parameters(
        self, query: str, user_id: str, current_date: Optional[datetime] = None
    ) -> ExtractedParams:
        """
        Extract structured parameters from a natural language query.

        Flow:
        1. Check cache for previous extraction of same query
        2. If cache miss, call Bedrock API
        3. Parse and validate response
        4. Cache result for future use
        5. Return ExtractedParams

        Args:
            query: Natural language query string
            user_id: User ID for logging and analytics
            current_date: Current date for relative date calculations (defaults to now)

        Returns:
            ExtractedParams model with extracted parameters

        Raises:
            BedrockAPIError: If Bedrock API call fails after retries
            BedrockResponseError: If response cannot be parsed or validated
        """
        # Normalize query for caching
        normalized_query = query.strip().lower()
        cache_key = self._generate_cache_key(normalized_query)

        logger.info(
            "Extracting parameters from query",
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

        logger.info("Cache miss - calling Bedrock API")

        # Step 2: Call Bedrock API (with automatic retries)
        try:
            raw_response = await self._invoke_bedrock(query, current_date)
        except Exception as e:
            logger.error(
                f"Bedrock API call failed: {e}",
                extra={"user_id": user_id, "query": query[:100]},
            )
            raise BedrockAPIError(
                "Failed to extract parameters from query using AI",
                details={"error": str(e), "query": query[:100], "user_id": user_id},
            )

        # Step 3: Parse and validate response
        try:
            extracted_params = self._parse_and_validate_response(raw_response)
        except Exception as e:
            logger.error(
                f"Failed to parse Bedrock response: {e}",
                extra={"user_id": user_id, "raw_response": raw_response[:500]},
            )
            raise BedrockResponseError(
                "Failed to parse AI response",
                details={"error": str(e), "response_preview": raw_response[:200]},
            )

        # Step 4: Cache result
        await self._save_to_cache(cache_key, extracted_params)

        logger.info(
            "Parameters extracted successfully",
            extra={
                "user_id": user_id,
                "extracted_params": extracted_params.model_dump(),
                "cached": True,
            },
        )

        return extracted_params

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(
            multiplier=settings.BEDROCK_RETRY_MIN_WAIT,
            max=settings.BEDROCK_RETRY_MAX_WAIT,
        ),
        retry=retry_if_exception_type((ClientError, BotoCoreError)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    async def _invoke_bedrock(
        self, query: str, current_date: Optional[datetime] = None
    ) -> str:
        """
        Invoke Bedrock API with retry logic using async boto3.

        Args:
            query: Natural language query
            current_date: Current date for prompt context

        Returns:
            Raw JSON response string from Bedrock

        Raises:
            ClientError: If Bedrock API returns an error
            BotoCoreError: If there's a network/boto3 error
        """
        # Build prompts
        user_prompt = build_user_prompt(query, current_date)

        # Log component sizes BEFORE constructing request
        logger.info(
            "Bedrock prompt component sizes",
            extra={
                "query_length": len(query),
                "system_prompt_length": len(SYSTEM_PROMPT),
                "user_prompt_length": len(user_prompt),
            },
        )

        # Construct Bedrock API request
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": settings.BEDROCK_MAX_TOKENS,
            "temperature": settings.BEDROCK_TEMPERATURE,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": user_prompt}],
        }

        logger.debug(
            "Invoking Bedrock",
            extra={
                "model": settings.BEDROCK_MODEL_ID,
                "max_tokens": settings.BEDROCK_MAX_TOKENS,
                "temperature": settings.BEDROCK_TEMPERATURE,
            },
        )

        # Log payload size before invoking
        payload_str = json.dumps(request_body)
        logger.info(
            "Bedrock payload size",
            extra={
                "bytes": len(payload_str.encode("utf-8")),
                "chars": len(payload_str),
                "max_tokens": request_body.get("max_tokens"),
            },
        )

        # Before invoking Bedrock, count tokens:
        encoding = tiktoken.get_encoding("cl100k_base")
        system_tokens = len(encoding.encode(SYSTEM_PROMPT))
        user_tokens = len(encoding.encode(user_prompt))

        logger.info(
            f"Token count - system: {system_tokens}, user: {user_tokens}, total_input: {system_tokens + user_tokens}, max_output: 500",
            extra={
                "system_tokens": system_tokens,
                "user_tokens": user_tokens,
                "total_input": system_tokens + user_tokens,
                "max_output_tokens": 500,
            },
        )

        try:
            # Use async context manager for the Bedrock client
            async with self.session.client(
                "bedrock-runtime", region_name=self.region
            ) as client:
                # Log invocation details
                logger.info(
                    "Bedrock invocation details",
                    extra={
                        "region": self.region,
                        "model_id": settings.BEDROCK_MODEL_ID,
                    },
                )

                # Call Bedrock API asynchronously
                response = await client.invoke_model(
                    modelId=settings.BEDROCK_MODEL_ID, body=json.dumps(request_body)
                )

                # Log token usage from response headers
                headers = response.get("ResponseMetadata", {}).get("HTTPHeaders", {})
                logger.info(
                    "Bedrock usage from headers",
                    extra={
                        "region": self.region,
                        "model_id": settings.BEDROCK_MODEL_ID,
                        "input_tokens": headers.get("x-amzn-bedrock-input-token-count"),
                        "output_tokens": headers.get(
                            "x-amzn-bedrock-output-token-count"
                        ),
                    },
                )

                # Parse response
                response_body = json.loads(response["body"].read())

                # Extract text from Claude's response
                if "content" not in response_body or len(response_body["content"]) == 0:
                    raise BedrockResponseError(
                        "Empty response from Bedrock",
                        details={"response_body": response_body},
                    )

                extracted_text = response_body["content"][0]["text"]

                # Log token usage for cost tracking
                usage = response_body.get("usage", {})
                logger.info(
                    "Bedrock API call successful",
                    extra={
                        "input_tokens": usage.get("input_tokens", 0),
                        "output_tokens": usage.get("output_tokens", 0),
                        "model": settings.BEDROCK_MODEL_ID,
                    },
                )

                return extracted_text

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            error_message = e.response.get("Error", {}).get("Message", str(e))

            logger.error(
                f"Bedrock ClientError: {error_code} - {error_message}",
                extra={"error_code": error_code},
            )
            raise

        except BotoCoreError as e:
            logger.error(f"Bedrock BotoCoreError: {e}")
            raise

    def _parse_and_validate_response(self, raw_response: str) -> ExtractedParams:
        """
        Parse Bedrock's JSON response and validate against rules.

        Args:
            raw_response: Raw text response from Bedrock

        Returns:
            Validated ExtractedParams instance

        Raises:
            BedrockResponseError: If response is invalid
        """
        # Clean response - sometimes Claude adds markdown formatting
        cleaned_response = raw_response.strip()

        # Remove markdown code blocks if present
        if cleaned_response.startswith("```json"):
            cleaned_response = cleaned_response[7:]
        if cleaned_response.startswith("```"):
            cleaned_response = cleaned_response[3:]
        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response[:-3]

        cleaned_response = cleaned_response.strip()

        try:
            # Parse JSON
            params_dict = json.loads(cleaned_response)
        except json.JSONDecodeError as e:
            raise BedrockResponseError(
                f"Invalid JSON in Bedrock response: {e}",
                details={"raw_response": raw_response[:500]},
            )

        # Validate and normalize parameters
        validated_params = self._validate_parameters(params_dict)

        # Create Pydantic model
        try:
            return ExtractedParams(**validated_params)
        except Exception as e:
            raise BedrockResponseError(
                f"Failed to create ExtractedParams model: {e}",
                details={"params": validated_params},
            )

    def _validate_parameters(self, params: dict) -> dict:
        """
        Validate extracted parameters against validation rules.

        Args:
            params: Dictionary of extracted parameters

        Returns:
            Validated and normalized parameters

        Raises:
            BedrockResponseError: If validation fails
        """
        validated = {}

        for field, rules in self.validation_rules.items():
            value = params.get(field)

            # Handle null values
            if value is None:
                if rules.get("nullable", True):
                    validated[field] = None
                    continue
                # Use default if not nullable
                validated[field] = rules.get("default")
                continue

            # Validate list types
            if rules["type"] == "list":
                if not isinstance(value, list):
                    # Convert single value to list
                    value = [value] if value else []

                # Validate allowed values
                if "allowed_values" in rules:
                    invalid_values = [
                        v for v in value if v not in rules["allowed_values"]
                    ]
                    if invalid_values:
                        logger.warning(
                            f"Invalid values in {field}: {invalid_values}",
                            extra={"field": field, "invalid": invalid_values},
                        )
                        # Filter out invalid values
                        value = [v for v in value if v in rules["allowed_values"]]

                validated[field] = value if value else None

            # Validate boolean types
            elif rules["type"] == "bool":
                validated[field] = bool(value)

            # Validate date types
            elif rules["type"] == "date":
                if isinstance(value, str):
                    # Basic date format validation
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
        """
        Generate a cache key for a query.
        Uses SHA256 hash of normalized query.

        Args:
            query: Normalized query string

        Returns:
            Cache key string
        """
        hash_object = hashlib.sha256(query.encode())
        hash_hex = hash_object.hexdigest()[:16]  # Use first 16 chars
        return f"bedrock:extraction:{hash_hex}"

    async def _get_from_cache(self, cache_key: str) -> Optional[ExtractedParams]:
        """
        Retrieve cached extraction result.

        Args:
            cache_key: Cache key

        Returns:
            ExtractedParams if found, None otherwise
        """
        try:
            cached_json = await self.cache.get(cache_key)

            if cached_json:
                params_dict = json.loads(cached_json)
                return ExtractedParams(**params_dict)

            return None

        except Exception as e:
            logger.warning(
                f"Cache retrieval error: {e}", extra={"cache_key": cache_key}
            )
            # Don't fail on cache errors
            return None

    async def _save_to_cache(self, cache_key: str, params: ExtractedParams) -> None:
        """
        Save extraction result to cache.

        Args:
            cache_key: Cache key
            params: Extracted parameters to cache
        """
        try:
            params_json = params.model_dump_json()
            await self.cache.set(
                cache_key, params_json, ttl=settings.CACHE_TTL_AI_EXTRACTION
            )

            logger.debug(
                "Cached extraction result",
                extra={"cache_key": cache_key, "ttl": settings.CACHE_TTL_AI_EXTRACTION},
            )

        except Exception as e:
            logger.warning(f"Cache save error: {e}", extra={"cache_key": cache_key})
            # Don't fail on cache errors


# Global singleton instance
bedrock_service = BedrockService()
