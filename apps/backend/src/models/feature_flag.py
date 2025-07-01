"""
Feature flag model for controlling feature rollouts and A/B testing.
"""

from datetime import datetime
from typing import Dict, Any, Optional

from sqlalchemy import Column, DateTime, Integer, String, Boolean, JSON, Float, Text
from sqlalchemy.orm import validates

from src.core.database import Base


class FeatureFlag(Base):
    """Feature flag model for controlling feature availability and rollouts."""

    __tablename__ = "feature_flags"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Core flag settings
    enabled = Column(Boolean, default=False, nullable=False)
    rollout_percentage = Column(Float, default=0.0, nullable=False)  # 0-100
    
    # Targeting settings
    targeted_user_ids = Column(JSON, default=list, nullable=True)  # List of specific user IDs
    targeted_user_groups = Column(JSON, default=list, nullable=True)  # List of user groups/roles
    excluded_user_ids = Column(JSON, default=list, nullable=True)  # Users to exclude
    
    # Environment and context
    environment = Column(String(50), default="production", nullable=False)  # dev, staging, production
    context_filters = Column(JSON, default=dict, nullable=True)  # Additional context-based filters
    
    # Metadata
    created_by = Column(Integer, nullable=True)  # User ID who created the flag
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)
    
    # Schedule settings (optional)
    start_date = Column(DateTime, nullable=True)  # When flag should become active
    end_date = Column(DateTime, nullable=True)    # When flag should automatically disable
    
    @validates('rollout_percentage')
    def validate_rollout_percentage(self, key, value):
        """Ensure rollout percentage is between 0 and 100."""
        if value < 0 or value > 100:
            raise ValueError("Rollout percentage must be between 0 and 100")
        return value
    
    @validates('key')
    def validate_key(self, key, value):
        """Ensure flag key follows naming conventions."""
        if not value or not value.replace('_', '').replace('-', '').isalnum():
            raise ValueError("Feature flag key must contain only alphanumeric characters, hyphens, and underscores")
        return value.lower()
    
    def is_active_for_user(self, user_id: str, user_groups: Optional[list] = None, 
                          context: Optional[Dict[str, Any]] = None) -> bool:
        """
        Check if this feature flag is active for a specific user.
        
        Args:
            user_id: The user's ID
            user_groups: List of groups/roles the user belongs to
            context: Additional context for flag evaluation
            
        Returns:
            bool: True if flag is active for this user
        """
        # Check if flag is globally enabled
        if not self.enabled:
            return False
        
        # Check time-based activation
        now = datetime.now()
        if self.start_date and now < self.start_date:
            return False
        if self.end_date and now > self.end_date:
            return False
        
        # Check explicit exclusions
        if self.excluded_user_ids and user_id in self.excluded_user_ids:
            return False
        
        # Check explicit inclusions (override percentage rollout)
        if self.targeted_user_ids and user_id in self.targeted_user_ids:
            return True
        
        # Check group targeting
        if self.targeted_user_groups and user_groups:
            for group in user_groups:
                if group in self.targeted_user_groups:
                    return True
        
        # Check percentage rollout
        if self.rollout_percentage > 0:
            import hashlib
            user_hash = int(hashlib.md5(f"{self.key}:{user_id}".encode()).hexdigest(), 16) % 100
            return user_hash < self.rollout_percentage
        
        return False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert feature flag to dictionary representation."""
        return {
            'id': self.id,
            'key': self.key,
            'name': self.name,
            'description': self.description,
            'enabled': self.enabled,
            'rollout_percentage': self.rollout_percentage,
            'targeted_user_ids': self.targeted_user_ids or [],
            'targeted_user_groups': self.targeted_user_groups or [],
            'excluded_user_ids': self.excluded_user_ids or [],
            'environment': self.environment,
            'context_filters': self.context_filters or {},
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'start_date': self.start_date,
            'end_date': self.end_date,
        }
    
    def __repr__(self):
        return f"<FeatureFlag(key='{self.key}', enabled={self.enabled}, rollout={self.rollout_percentage}%)>"