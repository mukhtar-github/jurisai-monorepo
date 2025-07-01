"""
User model for authentication.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from src.core.database import Base
from src.models.role import user_role


class User(Base):
    """User model for authentication."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="user")  # Legacy field: 'admin' or 'user'
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Add relationships for RBAC
    roles = relationship("Role", secondary=user_role, back_populates="users")
    
    # Document ownership relationship
    documents = relationship("LegalDocument", back_populates="owner")
    
    def has_permission(self, resource, action):
        """Check if user has a specific permission."""
        if self.role == "admin":  # Legacy admin check
            return True
            
        for role in self.roles:
            for permission in role.permissions:
                if permission.resource == resource and permission.action == action:
                    return True
        return False
    
    def has_role(self, role_name):
        """Check if user has a specific role."""
        if self.role == role_name:  # Legacy role check
            return True
            
        for role in self.roles:
            if role.name == role_name:
                return True
        return False
