"""
User schemas for Pydantic models that can be used in API responses.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr


class PermissionBase(BaseModel):
    """Base permission information."""
    resource: str
    action: str

    class Config:
        orm_mode = True


class RoleBase(BaseModel):
    """Base role information."""
    name: str
    description: Optional[str] = None

    class Config:
        orm_mode = True


class UserBase(BaseModel):
    """Base User schema."""
    email: EmailStr
    name: str


class UserCreate(UserBase):
    """Schema for creating a user."""
    password: str


class UserResponse(UserBase):
    """Schema for user information in responses."""
    id: int
    role: str  # Legacy role
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True


class UserWithRoles(UserResponse):
    """User information including roles."""
    roles: List[RoleBase] = []
    
    class Config:
        orm_mode = True
