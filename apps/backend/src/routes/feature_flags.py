"""
Feature flags management routes for the JurisAI API.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.user import User
from src.models.feature_flag import FeatureFlag
from src.services.feature_flags import FeatureFlagService, get_feature_flag_service
from src.routes.auth import get_current_user

# Create router
router = APIRouter(prefix="/api/v1/feature-flags", tags=["feature-flags"])

# Pydantic models
class FeatureFlagCreate(BaseModel):
    key: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    enabled: bool = False
    rollout_percentage: float = Field(0.0, ge=0.0, le=100.0)
    targeted_user_ids: List[str] = []
    targeted_user_groups: List[str] = []
    excluded_user_ids: List[str] = []
    environment: str = Field("production", regex="^(development|staging|production)$")
    context_filters: Dict[str, Any] = {}
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    @validator('key')
    def validate_key(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Key must contain only alphanumeric characters, hyphens, and underscores')
        return v.lower()
    
    @validator('end_date')
    def validate_end_date(cls, v, values):
        if v and 'start_date' in values and values['start_date'] and v <= values['start_date']:
            raise ValueError('End date must be after start date')
        return v


class FeatureFlagUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    enabled: Optional[bool] = None
    rollout_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    targeted_user_ids: Optional[List[str]] = None
    targeted_user_groups: Optional[List[str]] = None
    excluded_user_ids: Optional[List[str]] = None
    environment: Optional[str] = Field(None, regex="^(development|staging|production)$")
    context_filters: Optional[Dict[str, Any]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class FeatureFlagResponse(BaseModel):
    id: int
    key: str
    name: str
    description: Optional[str]
    enabled: bool
    rollout_percentage: float
    targeted_user_ids: List[str]
    targeted_user_groups: List[str]
    excluded_user_ids: List[str]
    environment: str
    context_filters: Dict[str, Any]
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    
    class Config:
        orm_mode = True


class UserFlagsResponse(BaseModel):
    user_id: str
    flags: Dict[str, bool]
    context: Optional[Dict[str, Any]] = None


class FlagEvaluationRequest(BaseModel):
    flag_key: str
    user_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class FlagEvaluationResponse(BaseModel):
    flag_key: str
    enabled: bool
    user_id: Optional[str]
    context: Optional[Dict[str, Any]]
    evaluation_time: datetime


# Helper function to check admin access
def require_admin_access(current_user: User = Depends(get_current_user)):
    """Dependency to ensure user has admin access to manage feature flags."""
    if not current_user.has_role("admin") and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required to manage feature flags"
        )
    return current_user


# Routes
@router.get("/user-flags", response_model=UserFlagsResponse)
async def get_user_feature_flags(
    context: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    feature_service: FeatureFlagService = Depends(get_feature_flag_service)
):
    """Get all feature flags for the current user."""
    context_dict = {}
    if context:
        try:
            import json
            context_dict = json.loads(context)
        except:
            pass
    
    user_flags = await feature_service.get_user_flags(str(current_user.id), context_dict)
    
    return UserFlagsResponse(
        user_id=str(current_user.id),
        flags=user_flags,
        context=context_dict
    )


@router.get("/check/{flag_key}", response_model=FlagEvaluationResponse)
async def check_feature_flag(
    flag_key: str,
    current_user: User = Depends(get_current_user),
    feature_service: FeatureFlagService = Depends(get_feature_flag_service)
):
    """Check if a specific feature flag is enabled for the current user."""
    is_enabled = await feature_service.is_enabled(flag_key, str(current_user.id))
    
    return FlagEvaluationResponse(
        flag_key=flag_key,
        enabled=is_enabled,
        user_id=str(current_user.id),
        context=None,
        evaluation_time=datetime.now()
    )


@router.post("/evaluate", response_model=FlagEvaluationResponse)
async def evaluate_feature_flag(
    request: FlagEvaluationRequest,
    current_user: User = Depends(get_current_user),
    feature_service: FeatureFlagService = Depends(get_feature_flag_service)
):
    """Evaluate a feature flag with custom context."""
    user_id = request.user_id or str(current_user.id)
    
    # Only allow users to check their own flags unless they're admin
    if user_id != str(current_user.id) and not current_user.has_role("admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only check your own feature flags"
        )
    
    is_enabled = await feature_service.is_enabled(
        request.flag_key, user_id, request.context
    )
    
    return FlagEvaluationResponse(
        flag_key=request.flag_key,
        enabled=is_enabled,
        user_id=user_id,
        context=request.context,
        evaluation_time=datetime.now()
    )


# Admin-only routes
@router.get("/admin/flags", response_model=List[FeatureFlagResponse])
async def get_all_feature_flags(
    admin_user: User = Depends(require_admin_access),
    feature_service: FeatureFlagService = Depends(get_feature_flag_service)
):
    """Get all feature flags (admin only)."""
    flags = await feature_service.get_all_flags()
    return [FeatureFlagResponse.from_orm(flag) for flag in flags]


@router.post("/admin/flags", response_model=FeatureFlagResponse)
async def create_feature_flag(
    flag_data: FeatureFlagCreate,
    admin_user: User = Depends(require_admin_access),
    feature_service: FeatureFlagService = Depends(get_feature_flag_service)
):
    """Create a new feature flag (admin only)."""
    try:
        flag = await feature_service.create_flag(
            flag_data.dict(), created_by=admin_user.id
        )
        return FeatureFlagResponse.from_orm(flag)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create feature flag: {str(e)}"
        )


@router.put("/admin/flags/{flag_key}", response_model=FeatureFlagResponse)
async def update_feature_flag(
    flag_key: str,
    update_data: FeatureFlagUpdate,
    admin_user: User = Depends(require_admin_access),
    feature_service: FeatureFlagService = Depends(get_feature_flag_service)
):
    """Update a feature flag (admin only)."""
    try:
        # Remove None values from update data
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        
        flag = await feature_service.update_flag(flag_key, update_dict)
        if not flag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Feature flag not found"
            )
        
        return FeatureFlagResponse.from_orm(flag)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update feature flag: {str(e)}"
        )


@router.delete("/admin/flags/{flag_key}")
async def delete_feature_flag(
    flag_key: str,
    admin_user: User = Depends(require_admin_access),
    feature_service: FeatureFlagService = Depends(get_feature_flag_service)
):
    """Delete a feature flag (admin only)."""
    success = await feature_service.delete_flag(flag_key)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature flag not found"
        )
    
    return {"message": f"Feature flag '{flag_key}' deleted successfully"}


@router.get("/admin/flags/{flag_key}", response_model=FeatureFlagResponse)
async def get_feature_flag_details(
    flag_key: str,
    admin_user: User = Depends(require_admin_access),
    db: Session = Depends(get_db)
):
    """Get details of a specific feature flag (admin only)."""
    flag = db.query(FeatureFlag).filter(FeatureFlag.key == flag_key).first()
    if not flag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature flag not found"
        )
    
    return FeatureFlagResponse.from_orm(flag)


@router.post("/admin/flags/{flag_key}/toggle")
async def toggle_feature_flag(
    flag_key: str,
    admin_user: User = Depends(require_admin_access),
    feature_service: FeatureFlagService = Depends(get_feature_flag_service)
):
    """Quick toggle a feature flag on/off (admin only)."""
    # Get current flag state
    flag = await feature_service._get_flag_config(flag_key)
    if not flag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature flag not found"
        )
    
    # Toggle the enabled state
    updated_flag = await feature_service.update_flag(
        flag_key, {"enabled": not flag.enabled}
    )
    
    return {
        "flag_key": flag_key,
        "enabled": updated_flag.enabled,
        "message": f"Feature flag '{flag_key}' {'enabled' if updated_flag.enabled else 'disabled'}"
    }