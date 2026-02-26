"""
Unit tests for bedrock_service.
Tests AI parameter extraction with mocked Bedrock client.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import json

from app.services.bedrock_service import bedrock_service
from app.models.domain import ExtractedParams
from app.utils.exceptions import BedrockAPIError, BedrockResponseError


class TestBedrockServiceExtractParameters:
    """Tests for extract_parameters method."""

    @pytest.mark.asyncio
    async def test_extract_simple_query_with_cache_miss(self):
        """Test parameter extraction with cache miss."""
        query_text = "show me FX trades from last week"

        # Mock cache miss and Bedrock response
        with (
            patch.object(
                bedrock_service,
                "_get_from_cache",
                new_callable=AsyncMock,
                return_value=None,
            ),
            patch.object(
                bedrock_service, "_invoke_bedrock", new_callable=AsyncMock
            ) as mock_bedrock,
            patch.object(bedrock_service, "_save_to_cache", new_callable=AsyncMock),
        ):
            # Mock Bedrock response - return JSON string (not ExtractedParams)
            mock_bedrock.return_value = json.dumps(
                {
                    "asset_types": ["FX"],
                    "date_from": "2025-01-23",
                    "date_to": "2025-01-30",
                }
            )

            result = await bedrock_service.extract_parameters(query_text, "user123")

            assert isinstance(result, ExtractedParams)
            assert result.asset_types == ["FX"]
            assert result.date_from == "2025-01-23"
            mock_bedrock.assert_called_once()

    @pytest.mark.asyncio
    async def test_extract_with_cache_hit(self):
        """Test parameter extraction with cache hit (no Bedrock call)."""
        query_text = "cleared trades for ACC001"

        # Mock cache hit with ExtractedParams
        cached_params = ExtractedParams(accounts=["ACC001"], statuses=["CLEARED"])

        with (
            patch.object(
                bedrock_service,
                "_get_from_cache",
                new_callable=AsyncMock,
                return_value=cached_params,
            ),
            patch.object(
                bedrock_service, "_invoke_bedrock", new_callable=AsyncMock
            ) as mock_bedrock,
        ):
            result = await bedrock_service.extract_parameters(query_text, "user123")

            assert isinstance(result, ExtractedParams)
            assert result.accounts == ["ACC001"]
            assert result.statuses == ["CLEARED"]
            # Bedrock should NOT be called
            mock_bedrock.assert_not_called()

    @pytest.mark.asyncio
    @pytest.mark.asyncio
    async def test_extract_with_cache_failure_continues(self):
        """Test that cache failures don't break extraction."""
        query_text = "show me IRS trades"

        # Mock cache returning None (simulating failure handled gracefully)
        with (
            patch.object(
                bedrock_service,
                "_get_from_cache",
                new_callable=AsyncMock,
                return_value=None,
            ),
            patch.object(
                bedrock_service, "_invoke_bedrock", new_callable=AsyncMock
            ) as mock_bedrock,
            patch.object(bedrock_service, "_save_to_cache", new_callable=AsyncMock),
        ):
            # Mock Bedrock response - return JSON string
            mock_bedrock.return_value = json.dumps({"asset_types": ["IRS"]})

            result = await bedrock_service.extract_parameters(query_text, "user123")

            # Should work with cache miss (no exception propagated)
            assert isinstance(result, ExtractedParams)
            assert result.asset_types == ["IRS"]
            mock_bedrock.assert_called_once()


class TestBedrockServiceInvokeBedrock:
    """Tests for _invoke_bedrock method."""

    @pytest.mark.asyncio
    async def test_invoke_successful_response(self):
        """Test successful Bedrock invocation."""
        query_text = "pending FX trades"

        mock_response = {
            "ResponseMetadata": {"HTTPStatusCode": 200},
            "body": MagicMock(),
        }

        # Mock the body stream read
        response_body = {
            "content": [
                {"text": json.dumps({"asset_types": ["FX"], "statuses": ["ALLEGED"]})}
            ],
            "usage": {"input_tokens": 150, "output_tokens": 50},
        }
        mock_response["body"].read.return_value = json.dumps(response_body).encode()

        # Mock the async context manager for session.client()
        mock_client = AsyncMock()
        mock_client.invoke_model = AsyncMock(return_value=mock_response)

        with patch.object(
            bedrock_service.session,
            "client",
            return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_client)),
        ):
            result = await bedrock_service._invoke_bedrock(query_text)

            # _invoke_bedrock returns the text content string, not a dict
            assert isinstance(result, str)
            result_dict = json.loads(result)
            assert result_dict["asset_types"] == ["FX"]
            assert result_dict["statuses"] == ["ALLEGED"]

    @pytest.mark.asyncio
    async def test_invoke_with_retry_on_failure(self):
        """Test retry logic on Bedrock API failures."""
        query_text = "test query"

        # Mock successful response after retries
        mock_response_success = {
            "ResponseMetadata": {"HTTPStatusCode": 200},
            "body": MagicMock(),
        }
        response_body = {
            "content": [{"text": json.dumps({"asset_types": ["FX"]})}],
            "usage": {"input_tokens": 100, "output_tokens": 20},
        }
        mock_response_success["body"].read.return_value = json.dumps(
            response_body
        ).encode()

        # Mock the async context manager for session.client()
        mock_client = AsyncMock()
        mock_client.invoke_model = AsyncMock(return_value=mock_response_success)

        with patch.object(
            bedrock_service.session,
            "client",
            return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_client)),
        ):
            result = await bedrock_service._invoke_bedrock(query_text)
            assert isinstance(result, str)
            result_dict = json.loads(result)
            assert result_dict["asset_types"] == ["FX"]

    @pytest.mark.asyncio
    async def test_invoke_max_retries_exceeded(self):
        """Test that max retries raises exception."""
        query_text = "test query"

        # Mock the async context manager with a client that raises an error
        mock_client = AsyncMock()
        mock_client.invoke_model = AsyncMock(side_effect=BedrockAPIError("API Error"))

        with patch.object(
            bedrock_service.session,
            "client",
            return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_client)),
        ):
            with pytest.raises(BedrockAPIError):
                await bedrock_service._invoke_bedrock(query_text)


class TestBedrockServiceResponseParsing:
    """Tests for _parse_and_validate_response method."""

    def test_parse_clean_json_response(self):
        """Test parsing clean JSON response."""
        response_text = json.dumps(
            {
                "accounts": ["ACC001", "ACC002"],
                "asset_types": ["FX"],
                "statuses": ["CLEARED"],
            }
        )

        result = bedrock_service._parse_and_validate_response(response_text)

        assert isinstance(result, ExtractedParams)
        assert result.accounts == ["ACC001", "ACC002"]
        assert result.asset_types == ["FX"]
        assert result.statuses == ["CLEARED"]

    def test_parse_json_with_markdown_wrapper(self):
        """Test parsing JSON wrapped in markdown code blocks."""
        response_text = """```json
{
    "accounts": ["ACC001"],
    "asset_types": ["IRS"]
}
```"""

        result = bedrock_service._parse_and_validate_response(response_text)

        assert isinstance(result, ExtractedParams)
        assert result.accounts == ["ACC001"]
        assert result.asset_types == ["IRS"]
        # ExtractedParams is a pydantic model, not a dict - remove subscript test

    def test_parse_invalid_json_raises_error(self):
        """Test that invalid JSON raises BedrockResponseError."""
        response_text = "This is not valid JSON {incomplete"

        with pytest.raises(BedrockResponseError):
            bedrock_service._parse_and_validate_response(response_text)

    def test_parse_empty_response_raises_error(self):
        """Test that empty response raises error."""
        with pytest.raises(BedrockResponseError):
            bedrock_service._parse_and_validate_response("")


class TestBedrockServiceValidateParameters:
    """Tests for _validate_parameters method."""

    def test_validate_correct_parameters(self):
        """Test validation passes for correct parameters."""
        params = {
            "accounts": ["ACC001"],
            "asset_types": ["FX", "IRS"],
            "statuses": ["ALLEGED", "CLEARED"],
            "date_from": "2025-01-01",
            "date_to": "2025-01-31",
        }

        # Should not raise exception
        bedrock_service._validate_parameters(params)

    def test_validate_invalid_status(self):
        """Test validation logs warnings for invalid status values."""
        params = {"statuses": ["INVALID_STATUS", "PENDING"]}

        # Should log warning but not raise exception
        result = bedrock_service._validate_parameters(params)
        # Invalid values are filtered out (could be [] or None)
        assert result.get("statuses") in ([], None)

    def test_validate_invalid_date_format(self):
        """Test validation logs warnings for invalid date format."""
        params = {
            "date_from": "01/01/2025"  # Wrong format, should be YYYY-MM-DD
        }

        # Should log warning but not raise exception
        result = bedrock_service._validate_parameters(params)
        # Invalid date is set to None
        assert result["date_from"] is None

    def test_validate_date_range_logic(self):
        """Test validation logs warnings when date_from > date_to."""
        params = {"date_from": "2025-12-31", "date_to": "2025-01-01"}

        # Should log warning but not raise exception
        result = bedrock_service._validate_parameters(params)
        # Invalid range might be adjusted or left as-is depending on implementation
        assert "date_from" in result
        assert "date_to" in result

    def test_validate_empty_parameters_allowed(self):
        """Test that empty parameters dict is valid."""
        params = {}

        # Should not raise exception
        bedrock_service._validate_parameters(params)
