"""
Tests for the feature flag system.
"""

import json
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from src.models.feature_flag import FeatureFlag
from src.models.user import User
from src.services.feature_flags import FeatureFlagService
from src.core.database import get_db


class TestFeatureFlagModel:
    """Test the FeatureFlag model."""
    
    def test_create_feature_flag(self, test_db: Session):
        """Test creating a basic feature flag."""
        flag = FeatureFlag(
            key="test_feature",
            name="Test Feature",
            description="A test feature flag",
            enabled=True,
            rollout_percentage=50.0
        )
        
        test_db.add(flag)
        test_db.commit()
        test_db.refresh(flag)
        
        assert flag.id is not None
        assert flag.key == "test_feature"
        assert flag.name == "Test Feature"
        assert flag.enabled is True
        assert flag.rollout_percentage == 50.0
        assert flag.environment == "production"  # default value
    
    def test_feature_flag_validation(self, test_db: Session):
        """Test feature flag validation."""
        # Test invalid rollout percentage
        with pytest.raises(ValueError, match="Rollout percentage must be between 0 and 100"):
            flag = FeatureFlag(
                key="test_feature",
                name="Test Feature",
                enabled=True,
                rollout_percentage=150.0
            )
            test_db.add(flag)
            test_db.commit()
    
    def test_is_active_for_user_basic(self, test_db: Session):
        """Test basic user activation logic."""
        # Test disabled flag
        disabled_flag = FeatureFlag(
            key="disabled_feature",
            name="Disabled Feature",
            enabled=False
        )
        assert disabled_flag.is_active_for_user("user123") is False
        
        # Test enabled flag with 100% rollout
        enabled_flag = FeatureFlag(
            key="enabled_feature",
            name="Enabled Feature",
            enabled=True,
            rollout_percentage=100.0
        )
        assert enabled_flag.is_active_for_user("user123") is True
        
        # Test enabled flag with 0% rollout
        no_rollout_flag = FeatureFlag(
            key="no_rollout_feature",
            name="No Rollout Feature",
            enabled=True,
            rollout_percentage=0.0
        )
        assert no_rollout_flag.is_active_for_user("user123") is False
    
    def test_is_active_for_user_targeting(self, test_db: Session):
        """Test user targeting logic."""
        # Test targeted user IDs
        targeted_flag = FeatureFlag(
            key="targeted_feature",
            name="Targeted Feature",
            enabled=True,
            rollout_percentage=0.0,
            targeted_user_ids=["user123", "user456"]
        )
        assert targeted_flag.is_active_for_user("user123") is True
        assert targeted_flag.is_active_for_user("user789") is False
        
        # Test excluded user IDs
        excluded_flag = FeatureFlag(
            key="excluded_feature",
            name="Excluded Feature",
            enabled=True,
            rollout_percentage=100.0,
            excluded_user_ids=["user123"]
        )
        assert excluded_flag.is_active_for_user("user123") is False
        assert excluded_flag.is_active_for_user("user456") is True
        
        # Test group targeting
        group_flag = FeatureFlag(
            key="group_feature",
            name="Group Feature",
            enabled=True,
            rollout_percentage=0.0,
            targeted_user_groups=["admin", "beta_users"]
        )
        assert group_flag.is_active_for_user("user123", ["admin"]) is True
        assert group_flag.is_active_for_user("user123", ["regular_user"]) is False
    
    def test_is_active_for_user_time_based(self, test_db: Session):
        """Test time-based activation."""
        now = datetime.now()
        
        # Test start date in future
        future_flag = FeatureFlag(
            key="future_feature",
            name="Future Feature",
            enabled=True,
            rollout_percentage=100.0,
            start_date=now + timedelta(days=1)
        )
        assert future_flag.is_active_for_user("user123") is False
        
        # Test end date in past
        expired_flag = FeatureFlag(
            key="expired_feature",
            name="Expired Feature",
            enabled=True,
            rollout_percentage=100.0,
            end_date=now - timedelta(days=1)
        )
        assert expired_flag.is_active_for_user("user123") is False
        
        # Test active time window
        active_flag = FeatureFlag(
            key="active_feature",
            name="Active Feature",
            enabled=True,
            rollout_percentage=100.0,
            start_date=now - timedelta(days=1),
            end_date=now + timedelta(days=1)
        )
        assert active_flag.is_active_for_user("user123") is True
    
    def test_to_dict(self, test_db: Session):
        """Test flag serialization."""
        flag = FeatureFlag(
            key="test_feature",
            name="Test Feature",
            description="A test feature",
            enabled=True,
            rollout_percentage=75.0,
            targeted_user_ids=["user123"],
            targeted_user_groups=["admin"],
            environment="staging"
        )
        
        flag_dict = flag.to_dict()
        
        assert flag_dict['key'] == "test_feature"
        assert flag_dict['name'] == "Test Feature"
        assert flag_dict['enabled'] is True
        assert flag_dict['rollout_percentage'] == 75.0
        assert flag_dict['targeted_user_ids'] == ["user123"]
        assert flag_dict['targeted_user_groups'] == ["admin"]
        assert flag_dict['environment'] == "staging"


class TestFeatureFlagService:
    """Test the FeatureFlagService."""
    
    @pytest.fixture
    def feature_service(self, test_db: Session):
        """Create a feature flag service for testing."""
        return FeatureFlagService(test_db)
    
    @pytest.fixture
    def test_user(self, test_db: Session):
        """Create a test user."""
        user = User(
            id=123,
            name="Test User",
            email="test@example.com",
            hashed_password="hashed_password",
            role="user"
        )
        test_db.add(user)
        test_db.commit()
        test_db.refresh(user)
        return user
    
    @pytest.fixture
    def test_flag(self, test_db: Session):
        """Create a test feature flag."""
        flag = FeatureFlag(
            key="test_feature",
            name="Test Feature",
            description="A test feature",
            enabled=True,
            rollout_percentage=50.0
        )
        test_db.add(flag)
        test_db.commit()
        test_db.refresh(flag)
        return flag
    
    @pytest.mark.asyncio
    async def test_is_enabled_cache_miss(self, feature_service: FeatureFlagService, test_flag: FeatureFlag):
        """Test flag evaluation with cache miss."""
        with patch('src.services.feature_flags.redis_client', None):
            # Mock the _get_flag_config method
            with patch.object(feature_service, '_get_flag_config', return_value=test_flag):
                with patch.object(feature_service, '_get_user_groups', return_value=["user"]):
                    result = await feature_service.is_enabled("test_feature", "123")
                    # Result depends on hash, but should be boolean
                    assert isinstance(result, bool)
    
    @pytest.mark.asyncio
    async def test_is_enabled_flag_not_found(self, feature_service: FeatureFlagService):
        """Test flag evaluation when flag doesn't exist."""
        with patch.object(feature_service, '_get_flag_config', return_value=None):
            result = await feature_service.is_enabled("nonexistent_feature", "123")
            assert result is False
    
    @pytest.mark.asyncio
    async def test_create_flag(self, feature_service: FeatureFlagService):
        """Test creating a new feature flag."""
        flag_data = {
            'key': 'new_feature',
            'name': 'New Feature',
            'description': 'A new feature flag',
            'enabled': True,
            'rollout_percentage': 25.0,
            'environment': 'staging'
        }
        
        with patch.object(feature_service, '_invalidate_flag_caches'):
            flag = await feature_service.create_flag(flag_data, created_by=1)
            
            assert flag.key == 'new_feature'
            assert flag.name == 'New Feature'
            assert flag.enabled is True
            assert flag.rollout_percentage == 25.0
            assert flag.environment == 'staging'
            assert flag.created_by == 1
    
    @pytest.mark.asyncio
    async def test_update_flag(self, feature_service: FeatureFlagService, test_flag: FeatureFlag):
        """Test updating a feature flag."""
        update_data = {
            'name': 'Updated Feature Name',
            'rollout_percentage': 75.0,
            'enabled': False
        }
        
        with patch.object(feature_service, '_invalidate_flag_caches'):
            updated_flag = await feature_service.update_flag(test_flag.key, update_data)
            
            assert updated_flag is not None
            assert updated_flag.name == 'Updated Feature Name'
            assert updated_flag.rollout_percentage == 75.0
            assert updated_flag.enabled is False
    
    @pytest.mark.asyncio
    async def test_update_flag_not_found(self, feature_service: FeatureFlagService):
        """Test updating a non-existent feature flag."""
        update_data = {'enabled': True}
        
        result = await feature_service.update_flag("nonexistent_feature", update_data)
        assert result is None
    
    @pytest.mark.asyncio
    async def test_delete_flag(self, feature_service: FeatureFlagService, test_flag: FeatureFlag):
        """Test deleting a feature flag."""
        with patch.object(feature_service, '_invalidate_flag_caches'):
            result = await feature_service.delete_flag(test_flag.key)
            assert result is True
            
            # Flag should no longer exist
            deleted_flag = await feature_service._get_flag_config(test_flag.key)
            assert deleted_flag is None
    
    @pytest.mark.asyncio
    async def test_delete_flag_not_found(self, feature_service: FeatureFlagService):
        """Test deleting a non-existent feature flag."""
        result = await feature_service.delete_flag("nonexistent_feature")
        assert result is False
    
    @pytest.mark.asyncio
    async def test_get_user_flags(self, feature_service: FeatureFlagService, test_flag: FeatureFlag):
        """Test getting all flags for a user."""
        with patch.object(feature_service, '_get_user_groups', return_value=["user"]):
            user_flags = await feature_service.get_user_flags("123")
            
            assert isinstance(user_flags, dict)
            assert "test_feature" in user_flags
            assert isinstance(user_flags["test_feature"], bool)
    
    @pytest.mark.asyncio
    async def test_get_user_groups(self, feature_service: FeatureFlagService, test_user: User):
        """Test getting user groups."""
        groups = await feature_service._get_user_groups(str(test_user.id))
        assert "user" in groups  # Legacy role
    
    @pytest.mark.asyncio
    async def test_get_user_groups_user_not_found(self, feature_service: FeatureFlagService):
        """Test getting groups for non-existent user."""
        groups = await feature_service._get_user_groups("999")
        assert groups == []


class TestFeatureFlagAPI:
    """Test the feature flag API endpoints."""
    
    @pytest.fixture
    def admin_user(self, test_db: Session):
        """Create an admin user for testing."""
        user = User(
            id=1,
            name="Admin User",
            email="admin@example.com",
            hashed_password="hashed_password",
            role="admin"
        )
        test_db.add(user)
        test_db.commit()
        test_db.refresh(user)
        return user
    
    @pytest.fixture
    def regular_user(self, test_db: Session):
        """Create a regular user for testing."""
        user = User(
            id=2,
            name="Regular User",
            email="user@example.com",
            hashed_password="hashed_password",
            role="user"
        )
        test_db.add(user)
        test_db.commit()
        test_db.refresh(user)
        return user
    
    @pytest.fixture
    def auth_token(self, admin_user: User):
        """Create an auth token for testing."""
        from src.routes.auth import create_access_token
        return create_access_token(data={"sub": str(admin_user.id)})
    
    @pytest.fixture
    def user_auth_token(self, regular_user: User):
        """Create an auth token for regular user testing."""
        from src.routes.auth import create_access_token
        return create_access_token(data={"sub": str(regular_user.id)})
    
    @pytest.fixture
    def test_flag(self, test_db: Session):
        """Create a test feature flag."""
        flag = FeatureFlag(
            key="api_test_feature",
            name="API Test Feature",
            description="Feature for API testing",
            enabled=True,
            rollout_percentage=100.0
        )
        test_db.add(flag)
        test_db.commit()
        test_db.refresh(flag)
        return flag
    
    def test_get_user_flags_authenticated(self, client: TestClient, user_auth_token: str, test_flag: FeatureFlag):
        """Test getting user flags with authentication."""
        headers = {"Authorization": f"Bearer {user_auth_token}"}
        response = client.get("/api/v1/feature-flags/user-flags", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "flags" in data
        assert isinstance(data["flags"], dict)
    
    def test_get_user_flags_unauthenticated(self, client: TestClient):
        """Test getting user flags without authentication."""
        response = client.get("/api/v1/feature-flags/user-flags")
        assert response.status_code == 401
    
    def test_check_feature_flag(self, client: TestClient, user_auth_token: str, test_flag: FeatureFlag):
        """Test checking a specific feature flag."""
        headers = {"Authorization": f"Bearer {user_auth_token}"}
        response = client.get(f"/api/v1/feature-flags/check/{test_flag.key}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["flag_key"] == test_flag.key
        assert "enabled" in data
        assert "user_id" in data
        assert "evaluation_time" in data
    
    def test_create_feature_flag_admin(self, client: TestClient, auth_token: str):
        """Test creating a feature flag as admin."""
        headers = {"Authorization": f"Bearer {auth_token}"}
        flag_data = {
            "key": "new_admin_feature",
            "name": "New Admin Feature",
            "description": "A feature created by admin",
            "enabled": True,
            "rollout_percentage": 50.0,
            "environment": "production"
        }
        
        response = client.post("/api/v1/feature-flags/admin/flags", json=flag_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["key"] == "new_admin_feature"
        assert data["name"] == "New Admin Feature"
        assert data["enabled"] is True
    
    def test_create_feature_flag_non_admin(self, client: TestClient, user_auth_token: str):
        """Test creating a feature flag as non-admin (should fail)."""
        headers = {"Authorization": f"Bearer {user_auth_token}"}
        flag_data = {
            "key": "unauthorized_feature",
            "name": "Unauthorized Feature",
            "enabled": True
        }
        
        response = client.post("/api/v1/feature-flags/admin/flags", json=flag_data, headers=headers)
        assert response.status_code == 403
    
    def test_update_feature_flag_admin(self, client: TestClient, auth_token: str, test_flag: FeatureFlag):
        """Test updating a feature flag as admin."""
        headers = {"Authorization": f"Bearer {auth_token}"}
        update_data = {
            "name": "Updated API Test Feature",
            "rollout_percentage": 75.0
        }
        
        response = client.put(f"/api/v1/feature-flags/admin/flags/{test_flag.key}", 
                             json=update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated API Test Feature"
        assert data["rollout_percentage"] == 75.0
    
    def test_toggle_feature_flag_admin(self, client: TestClient, auth_token: str, test_flag: FeatureFlag):
        """Test toggling a feature flag as admin."""
        headers = {"Authorization": f"Bearer {auth_token}"}
        original_state = test_flag.enabled
        
        response = client.post(f"/api/v1/feature-flags/admin/flags/{test_flag.key}/toggle", 
                              headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["flag_key"] == test_flag.key
        assert data["enabled"] != original_state
    
    def test_get_all_flags_admin(self, client: TestClient, auth_token: str, test_flag: FeatureFlag):
        """Test getting all flags as admin."""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = client.get("/api/v1/feature-flags/admin/flags", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert any(flag["key"] == test_flag.key for flag in data)
    
    def test_delete_feature_flag_admin(self, client: TestClient, auth_token: str, test_flag: FeatureFlag):
        """Test deleting a feature flag as admin."""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = client.delete(f"/api/v1/feature-flags/admin/flags/{test_flag.key}", 
                                headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "deleted successfully" in data["message"]
    
    def test_evaluate_feature_flag_with_context(self, client: TestClient, user_auth_token: str, test_flag: FeatureFlag):
        """Test evaluating a feature flag with custom context."""
        headers = {"Authorization": f"Bearer {user_auth_token}"}
        request_data = {
            "flag_key": test_flag.key,
            "context": {"test_context": "value"}
        }
        
        response = client.post("/api/v1/feature-flags/evaluate", json=request_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["flag_key"] == test_flag.key
        assert "enabled" in data
        assert data["context"]["test_context"] == "value"