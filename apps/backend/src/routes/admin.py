"""
Admin routes for JurisAI API.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.user import User
from src.routes.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


class UserRoleUpdate(BaseModel):
    role: str


@router.put("/users/{user_id}/role", response_model=dict)
async def update_user_role(
    user_id: int,
    user_role: UserRoleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a user's role. Only accessible to admins."""
    # Check if current user is admin
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    
    # Get the user to update
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Update the user's role
    user.role = user_role.role
    db.commit()
    
    return {"message": f"User {user_id} role updated to {user_role.role}"}


@router.put("/self/make-admin", response_model=dict)
async def make_self_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Make the current user an admin. This endpoint is provided only for initial setup
    and should be secured or removed in production."""
    # Update the user's role to admin
    current_user.role = "admin"
    db.commit()
    
    return {"message": "Your role has been updated to admin"}
