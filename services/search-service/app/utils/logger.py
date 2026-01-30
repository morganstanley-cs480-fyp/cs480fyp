"""
Structured logging configuration for CloudWatch.
Outputs JSON-formatted logs for easy parsing and monitoring.
"""

import logging
import sys
from typing import Any
from pythonjsonlogger import jsonlogger
from app.config.settings import settings


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """Custom JSON formatter with additional context"""
    
    def add_fields(self, log_record: dict, record: logging.LogRecord, message_dict: dict) -> None:
        super().add_fields(log_record, record, message_dict)
        
        # Add service context
        log_record['service'] = settings.SERVICE_NAME
        log_record['version'] = settings.VERSION
        log_record['level'] = record.levelname
        log_record['logger'] = record.name
        
        # Add extra fields if provided
        if hasattr(record, 'user_id'):
            log_record['user_id'] = record.user_id
        if hasattr(record, 'query_id'):
            log_record['query_id'] = record.query_id
        if hasattr(record, 'duration_ms'):
            log_record['duration_ms'] = record.duration_ms


def setup_logger(name: str = settings.SERVICE_NAME) -> logging.Logger:
    """
    Setup structured JSON logger for CloudWatch.
    
    Args:
        name: Logger name (default: service name)
    
    Returns:
        Configured logger instance
    """
    log_instance = logging.getLogger(name)
    log_instance.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))
    
    # Remove existing handlers to avoid duplicates
    log_instance.handlers.clear()
    
    # Create console handler (outputs to stdout for Docker/ECS)
    handler = logging.StreamHandler(sys.stdout)
    
    # Use JSON formatter for production, simple format for local dev
    if settings.LOG_LEVEL.upper() == "DEBUG":
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    else:
        formatter = CustomJsonFormatter(
            '%(timestamp)s %(level)s %(service)s %(message)s',
            timestamp=True
        )
    
    handler.setFormatter(formatter)
    log_instance.addHandler(handler)
    
    # Prevent propagation to root logger
    log_instance.propagate = False
    
    return log_instance


# Global logger instance
logger = setup_logger()


def log_with_context(**context: Any):
    """
    Helper to add context to log messages.
    
    Usage:
        logger.info("Search executed", extra=log_with_context(
            user_id="user123",
            query_id=42,
            duration_ms=234
        ))
    """
    return context
