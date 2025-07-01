"""
Dependency injection helpers for JurisAI services.
"""

from typing import Callable
from functools import wraps

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.user import User
from src.routes.auth import get_current_user
from src.services.feature_flags import FeatureFlagService, get_feature_flag_service


def feature_flag_required(flag_key: str, fallback_allowed: bool = True):
    """
    Decorator/dependency factory to require a feature flag to be enabled.
    
    Args:
        flag_key: The feature flag key to check
        fallback_allowed: If True, allows the endpoint to work when flag is disabled
                         If False, returns 404 when flag is disabled
    
    Returns:
        Dependency function that checks the feature flag
    """
    def dependency(
        current_user: User = Depends(get_current_user),
        feature_service: FeatureFlagService = Depends(get_feature_flag_service)
    ):
        async def check_flag():
            is_enabled = await feature_service.is_enabled(flag_key, str(current_user.id))
            
            if not is_enabled and not fallback_allowed:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Feature '{flag_key}' is not available"
                )
            
            return {
                "flag_enabled": is_enabled,
                "user": current_user,
                "feature_service": feature_service
            }
        
        return check_flag()
    
    return dependency


def get_feature_context(
    current_user: User = Depends(get_current_user),
    feature_service: FeatureFlagService = Depends(get_feature_flag_service)
):
    """
    Dependency that provides feature flag context for a user.
    
    Returns:
        Dict with user_flags and helper functions
    """
    async def get_context():
        user_flags = await feature_service.get_user_flags(str(current_user.id))
        
        return {
            "user_flags": user_flags,
            "user": current_user,
            "feature_service": feature_service,
            "is_enabled": lambda flag: user_flags.get(flag, False)
        }
    
    return get_context()


class FeatureGatedService:
    """
    Base class for services that use feature flags.
    """
    
    def __init__(self, feature_service: FeatureFlagService):
        self.feature_service = feature_service
    
    async def is_feature_enabled(self, flag_key: str, user_id: str) -> bool:
        """Check if a feature is enabled for a user."""
        return await self.feature_service.is_enabled(flag_key, user_id)
    
    async def require_feature(self, flag_key: str, user_id: str) -> bool:
        """Require a feature to be enabled, raise exception if not."""
        is_enabled = await self.is_feature_enabled(flag_key, user_id)
        if not is_enabled:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Feature '{flag_key}' is not available"
            )
        return True


def feature_flag_decorator(flag_key: str, fallback_to_legacy: bool = True):
    """
    Decorator for route functions to check feature flags.
    
    Args:
        flag_key: Feature flag to check
        fallback_to_legacy: If True, sets flag_enabled=False when disabled
                           If False, raises 404 when disabled
    
    Usage:
        @feature_flag_decorator("agent_document_analysis")
        async def enhanced_analysis(flag_enabled: bool = False):
            if flag_enabled:
                return await agent_analysis()
            else:
                return await legacy_analysis()
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract dependencies from kwargs
            current_user = kwargs.get('current_user')
            feature_service = kwargs.get('feature_service')
            
            if not current_user or not feature_service:
                raise ValueError("Feature flag decorator requires current_user and feature_service dependencies")
            
            # Check feature flag
            is_enabled = await feature_service.is_enabled(flag_key, str(current_user.id))
            
            if not is_enabled and not fallback_to_legacy:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Feature '{flag_key}' is not available"
                )
            
            # Add flag status to kwargs
            kwargs['flag_enabled'] = is_enabled
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


# Common feature flag dependencies for agent system
def agent_document_analysis_flag(
    current_user: User = Depends(get_current_user),
    feature_service: FeatureFlagService = Depends(get_feature_flag_service)
):
    """Dependency for agent document analysis feature."""
    return feature_flag_required("agent_document_analysis")(current_user, feature_service)


def agent_legal_research_flag(
    current_user: User = Depends(get_current_user),
    feature_service: FeatureFlagService = Depends(get_feature_flag_service)
):
    """Dependency for agent legal research feature."""
    return feature_flag_required("agent_legal_research")(current_user, feature_service)


def agent_websocket_updates_flag(
    current_user: User = Depends(get_current_user),
    feature_service: FeatureFlagService = Depends(get_feature_flag_service)
):
    """Dependency for agent WebSocket updates feature."""
    return feature_flag_required("agent_websocket_updates")(current_user, feature_service)