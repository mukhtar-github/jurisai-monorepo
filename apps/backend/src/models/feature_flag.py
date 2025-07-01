"""
Feature Flag model for dynamic feature control.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
from sqlalchemy.sql import func
from src.core.database import Base


class FeatureFlag(Base):
    """Model for storing and managing feature flags."""
    
    __tablename__ = "feature_flags"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    is_enabled = Column(Boolean, default=False, nullable=False)
    
    # Configuration for complex feature flags
    config = Column(JSON, default=dict)
    
    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_by = Column(String(100))  # User who created the flag
    
    def __repr__(self):
        return f"<FeatureFlag(key='{self.key}', enabled={self.is_enabled})>"
    
    def to_dict(self):
        """Convert feature flag to dictionary."""
        return {
            'id': self.id,
            'key': self.key,
            'name': self.name,
            'description': self.description,
            'is_enabled': self.is_enabled,
            'config': self.config,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by
        }