"""
Request logging middleware for FastAPI.
"""

import logging
import time
import uuid
from typing import Callable, Dict, Optional, Union

import json
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import os

# Configure logger
logger = logging.getLogger("request_logger")
handler = logging.StreamHandler()
handler.setFormatter(
    logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Get log level from environment or default to INFO
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
VALID_LOG_LEVELS = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
logger.setLevel(LOG_LEVEL if LOG_LEVEL in VALID_LOG_LEVELS else "INFO")

# Paths to exclude from detailed logging (e.g., health checks, static files)
EXCLUDE_PATHS = {
    "/health",
    "/health/system",
    "/health/ai-models",
    "/health/database",
    "/health/full",
    "/docs",
    "/redoc",
    "/openapi.json",
}

# Maximum body size to log (to avoid huge payloads in logs)
MAX_BODY_SIZE = 10000  # 10KB


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging request and response details.
    """

    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Get path and exclude certain paths from detailed logging
        path = request.url.path
        is_excluded = any(path.startswith(excluded) for excluded in EXCLUDE_PATHS)
        
        # Basic request info
        request_info = {
            "request_id": request_id,
            "method": request.method,
            "path": path,
            "client_host": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent", ""),
        }
        
        # Start timer
        start_time = time.time()
        
        # Log request start with basic info (always)
        logger.info(f"Request started: {json.dumps(request_info)}")
        
        # For non-excluded paths, log more detailed information at DEBUG level
        if not is_excluded and logger.level <= logging.DEBUG:
            # Get request headers (exclude authorization)
            headers = dict(request.headers)
            if "authorization" in headers:
                headers["authorization"] = "Bearer [REDACTED]"
                
            # Try to get request body for detailed logging
            try:
                # Make copy of body as we can only read it once
                body = await request.body()
                body_str = body.decode()
                
                # Truncate if too large
                if len(body_str) > MAX_BODY_SIZE:
                    body_str = body_str[:MAX_BODY_SIZE] + "... [truncated]"
                
                # For JSON, try to parse and redact sensitive fields
                if request.headers.get("content-type", "").startswith("application/json"):
                    try:
                        body_json = json.loads(body_str)
                        # Redact potential sensitive fields
                        for field in ["password", "token", "api_key", "secret", "credentials"]:
                            if field in body_json:
                                body_json[field] = "[REDACTED]"
                        body_str = json.dumps(body_json)
                    except json.JSONDecodeError:
                        # Not valid JSON, keep as is
                        pass
                
                request_info["body"] = body_str
                request_info["headers"] = headers
                logger.debug(f"Request details: {json.dumps(request_info)}")
                
                # Reattach body to request
                async def receive():
                    return {"type": "http.request", "body": body}
                request._receive = receive
            except Exception as e:
                logger.error(f"Error reading request body: {e}")
        
        # Process the request through the next middleware/route handler
        try:
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = round((time.time() - start_time) * 1000)
            
            # Log response info
            response_info = {
                "request_id": request_id,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            }
            
            # Always log basic response info
            logger.info(f"Response: {json.dumps(response_info)}")
            
            return response
            
        except Exception as e:
            # Log exceptions
            duration_ms = round((time.time() - start_time) * 1000)
            logger.error(
                f"Request {request_id} failed after {duration_ms}ms: {str(e)}",
                exc_info=True
            )
            raise
