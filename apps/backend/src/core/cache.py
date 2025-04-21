"""
Caching module for JurisAI backend using Redis.
"""

import json
import logging
import os
from functools import wraps
from typing import Any, Callable, Dict, Optional

import redis

# Configure logging
logger = logging.getLogger(__name__)

# Get Redis URL from environment variable or use a default for local development
# Railway automatically provides REDIS_URL environment variable when using their Redis service
REDIS_URL = os.getenv("REDIS_URL")
if REDIS_URL:
    logger.info(f"Using REDIS_URL from environment: {REDIS_URL}")
else:
    REDIS_URL = "redis://localhost:6379/0"
    logger.warning(f"REDIS_URL not found in environment, using default: {REDIS_URL}")

# Create Redis client with connection pooling for better performance
try:
    redis_client = redis.Redis.from_url(
        REDIS_URL, socket_connect_timeout=5, socket_timeout=5, decode_responses=False
    )
    # Test connection
    redis_client.ping()
    logger.info("Successfully connected to Redis")
except redis.ConnectionError as e:
    logger.warning(f"Redis connection failed: {e}. Cache will be disabled.")
    redis_client = None


def cache_response(expire: int = 3600):
    """
    Decorator to cache API responses in Redis.

    Args:
        expire (int): Cache expiration time in seconds. Defaults to 3600 (1 hour).

    Returns:
        Callable: Decorated function
    """

    def decorator(func: Callable):
        @wraps(func)
        async def decorated_function(*args: Any, **kwargs: Any):
            # Skip caching if Redis is not available
            if redis_client is None:
                return await func(*args, **kwargs)

            try:
                # Create cache key based on function name and arguments
                request_path = kwargs.get("request_path", "")
                # Include function name in the key for uniqueness
                key = f"jurisai:cache:{func.__name__}:{request_path}:{json.dumps(kwargs, sort_keys=True)}"

                # Try to get response from cache
                cached_response = redis_client.get(key)
                if cached_response:
                    logger.debug(f"Cache hit for key: {key}")
                    return json.loads(cached_response)

                # Call original function if response not in cache
                logger.debug(f"Cache miss for key: {key}")
                response = await func(*args, **kwargs)

                # Cache the response
                redis_client.setex(key, expire, json.dumps(response))

                return response
            except redis.RedisError as e:
                # If Redis fails, just execute the function without caching
                logger.error(f"Redis error during caching: {e}")
                return await func(*args, **kwargs)

        return decorated_function

    return decorator
