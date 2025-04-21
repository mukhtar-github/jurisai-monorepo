"""
Permission middleware for role-based access control.
"""

import logging
from typing import Dict, List, Optional

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# Define route permissions mapping
# Format: {path_prefix: {method: (resource, action)}}
ROUTE_PERMISSIONS: Dict[str, Dict[str, tuple]] = {
    "/documents": {
        "GET": ("document", "read"),
        "POST": ("document", "create"),
        "PUT": ("document", "update"),
        "DELETE": ("document", "delete"),
    },
    "/search": {
        "GET": ("search", "read"),
    },
    "/summarization": {
        "GET": ("summarization", "read"),
        "POST": ("summarization", "create"),
    },
    "/auth/users": {
        "GET": ("user", "read"),
        "POST": ("user", "create"),
        "PUT": ("user", "update"),
        "DELETE": ("user", "delete"),
    },
    "/auth/roles": {
        "GET": ("role", "read"),
        "POST": ("role", "create"),
        "PUT": ("role", "update"),
        "DELETE": ("role", "delete"),
    },
}

# Define open routes that don't need permission checks
OPEN_ROUTES = [
    "/",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/health",
    "/auth/login",
    "/auth/register",
]


class PermissionMiddleware(BaseHTTPMiddleware):
    """Middleware for checking permissions on protected routes."""

    async def dispatch(self, request: Request, call_next):
        """
        Check if the user has the required permissions for the requested route.
        """
        # Skip permission check for open routes
        path = request.url.path
        method = request.method
        
        # Check if path is in open routes
        for open_route in OPEN_ROUTES:
            if path.startswith(open_route):
                return await call_next(request)
        
        # Get user from request state (set by authentication middleware)
        user = getattr(request.state, "user", None)
        if not user:
            logger.warning(f"No authenticated user found for protected route: {path}")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Authentication required"},
            )
        
        # Check for admin users - they have access to everything
        if user.role == "admin" or any(role.name == "admin" for role in user.roles):
            return await call_next(request)
        
        # Find the matching route permission
        permission_needed = None
        for route_prefix, methods in ROUTE_PERMISSIONS.items():
            if path.startswith(route_prefix) and method in methods:
                permission_needed = methods[method]
                break
        
        # If no permission mapping exists, allow access (this can be changed to deny by default)
        if not permission_needed:
            logger.debug(f"No permission mapping for route: {path} with method: {method}")
            return await call_next(request)
        
        # Check if the user has the required permission
        resource, action = permission_needed
        if not user.has_permission(resource, action):
            logger.warning(
                f"Permission denied for user {user.id} on route {path}: "
                f"required permission {resource}:{action}"
            )
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Insufficient permissions"},
            )
        
        # User has the required permission, proceed
        return await call_next(request)
