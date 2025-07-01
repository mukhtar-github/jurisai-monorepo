"""
Feature flag service for controlling feature rollouts and A/B testing.
Integrates with existing cache infrastructure and database patterns.
"""

import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import and_

from src.core.cache import redis_client
from src.models.feature_flag import FeatureFlag
from src.models.user import User


logger = logging.getLogger(__name__)


class FeatureFlagService:
    """Service for managing and evaluating feature flags."""
    
    def __init__(self, db: Session):
        self.db = db
        self.cache_prefix = "jurisai:feature_flags"
        self.cache_ttl = 300  # 5 minutes cache TTL
    
    async def is_enabled(self, flag_key: str, user_id: str, 
                        context: Optional[Dict[str, Any]] = None) -> bool:
        """
        Check if a feature flag is enabled for a specific user.
        
        Args:
            flag_key: The feature flag key
            user_id: The user's ID
            context: Additional context for flag evaluation
            
        Returns:
            bool: True if flag is enabled for this user
        """
        try:
            # First, try to get from cache
            cache_key = f"{self.cache_prefix}:evaluation:{flag_key}:{user_id}"
            
            if redis_client:
                try:
                    cached_result = redis_client.get(cache_key)
                    if cached_result is not None:
                        result = cached_result.decode('utf-8') == "1"
                        logger.debug(f"Feature flag cache hit: {flag_key}={result} for user {user_id}")
                        return result
                except Exception as e:
                    logger.warning(f"Redis cache error for feature flag {flag_key}: {e}")
            
            # Get flag configuration from database
            flag = await self._get_flag_config(flag_key)
            if not flag:
                logger.warning(f"Feature flag not found: {flag_key}")
                return False
            
            # Get user information for group-based targeting
            user_groups = await self._get_user_groups(user_id)
            
            # Evaluate flag for user
            is_enabled = flag.is_active_for_user(user_id, user_groups, context)
            
            # Cache the result
            if redis_client:
                try:
                    cache_value = "1" if is_enabled else "0"
                    redis_client.setex(cache_key, self.cache_ttl, cache_value)
                except Exception as e:
                    logger.warning(f"Failed to cache feature flag result: {e}")
            
            logger.debug(f"Feature flag evaluation: {flag_key}={is_enabled} for user {user_id}")
            return is_enabled
            
        except Exception as e:
            logger.error(f"Error evaluating feature flag {flag_key}: {e}")
            # Fail safe - return False if there's any error
            return False
    
    async def get_user_flags(self, user_id: str, 
                           context: Optional[Dict[str, Any]] = None) -> Dict[str, bool]:
        """
        Get all feature flags for a specific user.
        
        Args:
            user_id: The user's ID
            context: Additional context for flag evaluation
            
        Returns:
            Dict[str, bool]: Dictionary of flag_key -> enabled status
        """
        try:
            # Check cache first
            cache_key = f"{self.cache_prefix}:user_flags:{user_id}"
            
            if redis_client:
                try:
                    cached_flags = redis_client.get(cache_key)
                    if cached_flags:
                        flags_dict = json.loads(cached_flags.decode('utf-8'))
                        logger.debug(f"User flags cache hit for user {user_id}")
                        return flags_dict
                except Exception as e:
                    logger.warning(f"Redis cache error for user flags: {e}")
            
            # Get all active flags from database
            active_flags = self.db.query(FeatureFlag).filter(
                FeatureFlag.enabled == True
            ).all()
            
            # Get user groups once
            user_groups = await self._get_user_groups(user_id)
            
            # Evaluate each flag for the user
            user_flags = {}
            for flag in active_flags:
                user_flags[flag.key] = flag.is_active_for_user(user_id, user_groups, context)
            
            # Cache the results
            if redis_client:
                try:
                    redis_client.setex(
                        cache_key, 
                        self.cache_ttl, 
                        json.dumps(user_flags)
                    )
                except Exception as e:
                    logger.warning(f"Failed to cache user flags: {e}")
            
            return user_flags
            
        except Exception as e:
            logger.error(f"Error getting user flags for {user_id}: {e}")
            return {}
    
    async def create_flag(self, flag_data: Dict[str, Any], created_by: Optional[int] = None) -> FeatureFlag:
        """
        Create a new feature flag.
        
        Args:
            flag_data: Flag configuration data
            created_by: User ID who created the flag
            
        Returns:
            FeatureFlag: The created feature flag
        """
        try:
            flag = FeatureFlag(
                key=flag_data['key'],
                name=flag_data['name'],
                description=flag_data.get('description'),
                enabled=flag_data.get('enabled', False),
                rollout_percentage=flag_data.get('rollout_percentage', 0.0),
                targeted_user_ids=flag_data.get('targeted_user_ids', []),
                targeted_user_groups=flag_data.get('targeted_user_groups', []),
                excluded_user_ids=flag_data.get('excluded_user_ids', []),
                environment=flag_data.get('environment', 'production'),
                context_filters=flag_data.get('context_filters', {}),
                start_date=flag_data.get('start_date'),
                end_date=flag_data.get('end_date'),
                created_by=created_by
            )
            
            self.db.add(flag)
            self.db.commit()
            self.db.refresh(flag)
            
            # Invalidate relevant caches
            await self._invalidate_flag_caches(flag.key)
            
            logger.info(f"Created feature flag: {flag.key}")
            return flag
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating feature flag: {e}")
            raise
    
    async def update_flag(self, flag_key: str, update_data: Dict[str, Any]) -> Optional[FeatureFlag]:
        """
        Update an existing feature flag.
        
        Args:
            flag_key: The flag key to update
            update_data: Updated flag data
            
        Returns:
            Optional[FeatureFlag]: The updated flag or None if not found
        """
        try:
            flag = self.db.query(FeatureFlag).filter(FeatureFlag.key == flag_key).first()
            if not flag:
                return None
            
            # Update fields
            for field, value in update_data.items():
                if hasattr(flag, field) and field not in ['id', 'key', 'created_at', 'created_by']:
                    setattr(flag, field, value)
            
            flag.updated_at = datetime.now()
            self.db.commit()
            self.db.refresh(flag)
            
            # Invalidate relevant caches
            await self._invalidate_flag_caches(flag.key)
            
            logger.info(f"Updated feature flag: {flag.key}")
            return flag
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating feature flag {flag_key}: {e}")
            raise
    
    async def delete_flag(self, flag_key: str) -> bool:
        """
        Delete a feature flag.
        
        Args:
            flag_key: The flag key to delete
            
        Returns:
            bool: True if deleted successfully
        """
        try:
            flag = self.db.query(FeatureFlag).filter(FeatureFlag.key == flag_key).first()
            if not flag:
                return False
            
            self.db.delete(flag)
            self.db.commit()
            
            # Invalidate relevant caches
            await self._invalidate_flag_caches(flag_key)
            
            logger.info(f"Deleted feature flag: {flag_key}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting feature flag {flag_key}: {e}")
            return False
    
    async def get_all_flags(self) -> List[FeatureFlag]:
        """Get all feature flags."""
        try:
            return self.db.query(FeatureFlag).order_by(FeatureFlag.created_at.desc()).all()
        except Exception as e:
            logger.error(f"Error getting all flags: {e}")
            return []
    
    async def _get_flag_config(self, flag_key: str) -> Optional[FeatureFlag]:
        """Get flag configuration from database with caching."""
        try:
            # Try cache first
            cache_key = f"{self.cache_prefix}:config:{flag_key}"
            
            if redis_client:
                try:
                    cached_config = redis_client.get(cache_key)
                    if cached_config:
                        # Note: For simplicity, we'll still query DB for the object
                        # In production, you might want to serialize/deserialize the full object
                        pass
                except Exception as e:
                    logger.warning(f"Redis error getting flag config: {e}")
            
            # Get from database
            flag = self.db.query(FeatureFlag).filter(FeatureFlag.key == flag_key).first()
            
            # Cache the result
            if flag and redis_client:
                try:
                    redis_client.setex(
                        cache_key, 
                        self.cache_ttl, 
                        json.dumps(flag.to_dict())
                    )
                except Exception as e:
                    logger.warning(f"Failed to cache flag config: {e}")
            
            return flag
            
        except Exception as e:
            logger.error(f"Error getting flag config for {flag_key}: {e}")
            return None
    
    async def _get_user_groups(self, user_id: str) -> List[str]:
        """Get user groups/roles for targeting."""
        try:
            user = self.db.query(User).filter(User.id == int(user_id)).first()
            if not user:
                return []
            
            groups = []
            
            # Add legacy role
            if user.role:
                groups.append(user.role)
            
            # Add RBAC roles
            for role in user.roles:
                groups.append(role.name)
            
            return groups
            
        except Exception as e:
            logger.error(f"Error getting user groups for {user_id}: {e}")
            return []
    
    async def _invalidate_flag_caches(self, flag_key: str):
        """Invalidate all caches related to a specific flag."""
        if not redis_client:
            return
        
        try:
            # Patterns to invalidate
            patterns = [
                f"{self.cache_prefix}:config:{flag_key}",
                f"{self.cache_prefix}:evaluation:{flag_key}:*",
                f"{self.cache_prefix}:user_flags:*"
            ]
            
            for pattern in patterns:
                if '*' in pattern:
                    # Use SCAN to find matching keys
                    keys = []
                    cursor = 0
                    while True:
                        cursor, partial_keys = redis_client.scan(
                            cursor=cursor, 
                            match=pattern, 
                            count=100
                        )
                        keys.extend(partial_keys)
                        if cursor == 0:
                            break
                    
                    if keys:
                        redis_client.delete(*keys)
                        logger.debug(f"Invalidated {len(keys)} cache keys for pattern {pattern}")
                else:
                    redis_client.delete(pattern)
                    logger.debug(f"Invalidated cache key: {pattern}")
                    
        except Exception as e:
            logger.warning(f"Error invalidating caches for flag {flag_key}: {e}")


# Convenience function for dependency injection
def get_feature_flag_service(db: Session) -> FeatureFlagService:
    """Dependency injection factory for FeatureFlagService."""
    return FeatureFlagService(db)