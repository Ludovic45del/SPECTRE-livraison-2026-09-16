"""
Structured Logging Module for SPECTRE Backend

Provides JSON-formatted logging with context (request ID, user, action).
Compatible with centralized log aggregation (ELK, Datadog, etc.).
"""

import contextvars
import json
import logging
import sys
import traceback
from datetime import datetime, timezone
from typing import Any

# Thread-safe context storage for request-scoped data
_log_context: contextvars.ContextVar[dict] = contextvars.ContextVar(
    "log_context", default={}
)


class StructuredFormatter(logging.Formatter):
    """JSON formatter for structured logging."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add extra fields if present
        if hasattr(record, "request_id"):
            log_entry["request_id"] = record.request_id
        if hasattr(record, "user_id"):
            log_entry["user_id"] = record.user_id
        if hasattr(record, "action"):
            log_entry["action"] = record.action
        if hasattr(record, "entity_type"):
            log_entry["entity_type"] = record.entity_type
        if hasattr(record, "entity_id"):
            log_entry["entity_id"] = record.entity_id
        if hasattr(record, "duration_ms"):
            log_entry["duration_ms"] = record.duration_ms
        if hasattr(record, "extra_data"):
            log_entry["data"] = record.extra_data

        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": traceback.format_exception(*record.exc_info),
            }

        return json.dumps(log_entry, default=str)


def get_logger(name: str) -> logging.Logger:
    """
    Get a structured logger instance.

    Args:
        name: Logger name (usually __name__)

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)

    return logger


class LogContext:
    """Thread-safe context for adding request-scoped data to logs.

    Uses contextvars to ensure each request/thread gets its own context,
    preventing data leaks between concurrent requests.
    """

    @classmethod
    def set(cls, **kwargs: Any) -> None:
        """Set context values for current request."""
        ctx = _log_context.get().copy()
        ctx.update(kwargs)
        _log_context.set(ctx)

    @classmethod
    def get(cls, key: str, default: Any = None) -> Any:
        """Get a context value."""
        return _log_context.get().get(key, default)

    @classmethod
    def clear(cls) -> None:
        """Clear context (call at end of request)."""
        _log_context.set({})

    @classmethod
    def as_dict(cls) -> dict:
        """Get all context as dict."""
        return _log_context.get().copy()


# Pre-configured logger for API module
api_logger = get_logger("app.api")
