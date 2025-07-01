"""
System schemas for Pydantic models used in system management API.
"""

from typing import Dict, Any, Optional, List

from pydantic import BaseModel


class FeatureStatus(BaseModel):
    """Feature status information."""
    name: str
    status: str  # "available", "partial", "unavailable"
    description: Optional[str] = None
    version: Optional[str] = None


class SystemFeaturesResponse(BaseModel):
    """System features status response."""
    status: str
    features: Dict[str, FeatureStatus]


class DatabaseStatus(BaseModel):
    """Database connection and migration status."""
    connected: bool
    migrationStatus: str
    version: Optional[str] = None
    tables: List[str] = []
    error: Optional[str] = None


class SystemStatusResponse(BaseModel):
    """Overall system status response."""
    status: str
    uptime: str
    version: str
    database: DatabaseStatus


class MigrationResponse(BaseModel):
    """Migration operation response."""
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None
