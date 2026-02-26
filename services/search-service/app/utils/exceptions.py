"""
Custom exception classes for the search service.
Provides specific error types for better error handling and debugging.
"""

from typing import Optional, Any


class SearchServiceException(Exception):
    """Base exception for all search service errors"""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class DatabaseConnectionError(SearchServiceException):
    """Raised when database connection fails"""


class DatabaseQueryError(SearchServiceException):
    """Raised when database query execution fails"""


class CacheConnectionError(SearchServiceException):
    """Raised when Redis connection fails"""


class CacheOperationError(SearchServiceException):
    """Raised when Redis operation fails"""


class BedrockAPIError(SearchServiceException):
    """Raised when AWS Bedrock API call fails"""


class BedrockResponseError(SearchServiceException):
    """Raised when Bedrock response cannot be parsed"""


class InvalidSearchRequestError(SearchServiceException):
    """Raised when search request validation fails"""


class QueryHistoryNotFoundError(SearchServiceException):
    """Raised when query history record is not found"""


class UnauthorizedAccessError(SearchServiceException):
    """Raised when user tries to access another user's data"""


class ValidationError(SearchServiceException):
    """Raised when input validation fails"""
