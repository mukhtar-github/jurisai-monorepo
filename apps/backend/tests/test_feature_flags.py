"""
Test feature flags functionality
"""
import pytest
from sqlalchemy.orm import Session
from src.services.feature_flags import FeatureFlagService
from src.models.feature_flag import FeatureFlag


def test_feature_flag_creation(db_session: Session):
    """Test creating a feature flag."""
    service = FeatureFlagService(db_session)
    
    flag = service.create_flag(
        key="test_feature",
        name="Test Feature",
        description="A test feature flag",
        is_enabled=True,
        config={"max_items": 10}
    )
    
    assert flag.key == "test_feature"
    assert flag.name == "Test Feature"
    assert flag.is_enabled is True
    assert flag.config == {"max_items": 10}


def test_feature_flag_is_enabled(db_session: Session):
    """Test checking if feature flag is enabled."""
    service = FeatureFlagService(db_session)
    
    # Test environment variable flag
    assert service.is_enabled('enable_document_analysis_agent') is True
    
    # Test non-existent flag
    assert service.is_enabled('non_existent_flag') is False
    
    # Test database flag
    service.create_flag(
        key="db_test_flag",
        name="DB Test Flag",
        is_enabled=True
    )
    
    assert service.is_enabled('db_test_flag') is True


def test_feature_flag_update(db_session: Session):
    """Test updating a feature flag."""
    service = FeatureFlagService(db_session)
    
    # Create flag
    flag = service.create_flag(
        key="update_test",
        name="Update Test",
        is_enabled=False
    )
    
    # Update flag
    updated_flag = service.update_flag(
        key="update_test",
        is_enabled=True,
        config={"updated": True}
    )
    
    assert updated_flag.is_enabled is True
    assert updated_flag.config == {"updated": True}


def test_feature_flag_get_config(db_session: Session):
    """Test getting feature flag configuration."""
    service = FeatureFlagService(db_session)
    
    config = {"timeout": 30, "retries": 3}
    
    service.create_flag(
        key="config_test",
        name="Config Test",
        config=config
    )
    
    retrieved_config = service.get_config("config_test")
    assert retrieved_config == config


def test_get_all_flags(db_session: Session):
    """Test getting all feature flags."""
    service = FeatureFlagService(db_session)
    
    # Create a database flag
    service.create_flag(
        key="all_flags_test",
        name="All Flags Test",
        is_enabled=True
    )
    
    all_flags = service.get_all_flags()
    
    # Should include environment variable flags and database flags
    assert 'enable_document_analysis_agent' in all_flags
    assert 'all_flags_test' in all_flags
    assert len(all_flags) > 0