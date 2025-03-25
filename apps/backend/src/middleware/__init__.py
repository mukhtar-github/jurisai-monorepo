"""
Middleware package for JurisAI backend.
"""

from src.middleware.request_logger import RequestLoggingMiddleware

__all__ = ["RequestLoggingMiddleware"]
