"""
Service dependencies for dependency injection
"""
from typing import Generator
from sqlalchemy.orm import Session
from src.core.database import get_db
from src.services.feature_flags import FeatureFlagService
from src.services.agents.document_analyzer import DocumentAnalysisAgent
from fastapi import Depends


def get_feature_flags(db: Session = Depends(get_db)) -> FeatureFlagService:
    """Get feature flags service instance."""
    return FeatureFlagService(db)


def get_document_analyzer(
    db: Session = Depends(get_db),
    feature_flags: FeatureFlagService = Depends(get_feature_flags)
) -> DocumentAnalysisAgent:
    """Get document analyzer agent instance."""
    return DocumentAnalysisAgent(db, feature_flags)