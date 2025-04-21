"""
Permission model for role-based access control.
"""

from sqlalchemy import Column, Integer, String, Table, ForeignKey
from sqlalchemy.orm import relationship

from src.core.database import Base

# Association table for many-to-many relationship between roles and permissions
role_permission = Table(
    "role_permission",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id"), primary_key=True),
)


class Permission(Base):
    """Permission model for RBAC."""

    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(String(255))
    resource = Column(String(100), nullable=False)  # e.g., 'document', 'user'
    action = Column(String(100), nullable=False)    # e.g., 'create', 'read', 'update', 'delete'

    # Relationship with roles
    roles = relationship("Role", secondary=role_permission, back_populates="permissions")

    def __repr__(self):
        return f"<Permission {self.name}: {self.action} on {self.resource}>"
