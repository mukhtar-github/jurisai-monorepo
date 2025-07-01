"""
Feature flags API routes
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from src.core.database import get_db
from src.services.feature_flags import FeatureFlagService
from src.models.feature_flag import FeatureFlag

router = APIRouter(prefix="/feature-flags", tags=["feature-flags"])


class FeatureFlagCreate(BaseModel):
    key: str
    name: str
    description: Optional[str] = None
    is_enabled: bool = False
    config: Optional[Dict[str, Any]] = None


class FeatureFlagUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None


def get_feature_flag_service(db: Session = Depends(get_db)) -> FeatureFlagService:
    """Get feature flag service instance."""
    return FeatureFlagService(db)


@router.get("/")
async def get_all_feature_flags(
    feature_flags: FeatureFlagService = Depends(get_feature_flag_service)
) -> Dict[str, Any]:
    """Get all feature flags."""
    try:
        flags = feature_flags.get_all_flags()
        return {
            "status": "success",
            "data": flags,
            "count": len(flags)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve feature flags: {str(e)}"
        )


@router.get("/{flag_key}")
async def get_feature_flag(
    flag_key: str,
    feature_flags: FeatureFlagService = Depends(get_feature_flag_service)
) -> Dict[str, Any]:
    """Get a specific feature flag."""
    try:
        is_enabled = feature_flags.is_enabled(flag_key)
        config = feature_flags.get_config(flag_key)
        
        return {
            "status": "success",
            "data": {
                "key": flag_key,
                "enabled": is_enabled,
                "config": config
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve feature flag: {str(e)}"
        )


@router.post("/")
async def create_feature_flag(
    flag_data: FeatureFlagCreate,
    feature_flags: FeatureFlagService = Depends(get_feature_flag_service)
) -> Dict[str, Any]:
    """Create a new feature flag."""
    try:
        flag = feature_flags.create_flag(
            key=flag_data.key,
            name=flag_data.name,
            description=flag_data.description,
            is_enabled=flag_data.is_enabled,
            config=flag_data.config,
            created_by="api"  # Could be enhanced with user authentication
        )
        
        return {
            "status": "success",
            "message": f"Feature flag '{flag_data.key}' created successfully",
            "data": flag.to_dict()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create feature flag: {str(e)}"
        )


@router.put("/{flag_key}")
async def update_feature_flag(
    flag_key: str,
    flag_data: FeatureFlagUpdate,
    feature_flags: FeatureFlagService = Depends(get_feature_flag_service)
) -> Dict[str, Any]:
    """Update an existing feature flag."""
    try:
        flag = feature_flags.update_flag(
            key=flag_key,
            is_enabled=flag_data.is_enabled,
            config=flag_data.config
        )
        
        if not flag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Feature flag '{flag_key}' not found"
            )
        
        return {
            "status": "success",
            "message": f"Feature flag '{flag_key}' updated successfully",
            "data": flag.to_dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update feature flag: {str(e)}"
        )


@router.post("/refresh-cache")
async def refresh_feature_flag_cache(
    feature_flags: FeatureFlagService = Depends(get_feature_flag_service)
) -> Dict[str, Any]:
    """Refresh the feature flag cache."""
    try:
        feature_flags.refresh_cache()
        return {
            "status": "success",
            "message": "Feature flag cache refreshed successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh cache: {str(e)}"
        )