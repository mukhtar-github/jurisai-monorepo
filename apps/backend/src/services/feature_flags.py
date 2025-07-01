"""
Feature Flag service for managing dynamic feature control.
"""
import os
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from src.models.feature_flag import FeatureFlag
import logging

logger = logging.getLogger(__name__)


class FeatureFlagService:
    """Service for managing feature flags."""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self._cache = {}
        self._load_default_flags()
    
    def _load_default_flags(self):
        """Load default feature flags from environment variables."""
        self._cache = {
            # Agent system flags
            'enable_document_analysis_agent': self._get_env_bool('ENABLE_DOCUMENT_ANALYSIS_AGENT', True),
            'enable_legal_research_agent': self._get_env_bool('ENABLE_LEGAL_RESEARCH_AGENT', False),
            'enable_contract_review_agent': self._get_env_bool('ENABLE_CONTRACT_REVIEW_AGENT', False),
            
            # Existing flags from env_sample.txt
            'enable_batch_processing': self._get_env_bool('ENABLE_BATCH_PROCESSING', True),
            'enable_document_comparison': self._get_env_bool('ENABLE_DOCUMENT_COMPARISON', False),
            
            # AI enhancement flags
            'enable_enhanced_entity_extraction': self._get_env_bool('ENABLE_ENHANCED_ENTITY_EXTRACTION', True),
            'enable_risk_assessment': self._get_env_bool('ENABLE_RISK_ASSESSMENT', True),
            'enable_document_classification': self._get_env_bool('ENABLE_DOCUMENT_CLASSIFICATION', True),
        }
    
    def _get_env_bool(self, key: str, default: bool = False) -> bool:
        """Get boolean value from environment variable."""
        value = os.getenv(key, str(default)).lower()
        return value in ('true', '1', 'yes', 'on')
    
    def is_enabled(self, flag_key: str, user_id: Optional[str] = None) -> bool:
        """Check if a feature flag is enabled."""
        try:
            # First check cache (environment variables)
            if flag_key in self._cache:
                return self._cache[flag_key]
            
            # Then check database
            flag = self.db.query(FeatureFlag).filter(
                FeatureFlag.key == flag_key
            ).first()
            
            if flag:
                # For user-specific feature flags, could add user-based logic here
                # For now, return global flag status
                self._cache[flag_key] = flag.is_enabled
                return flag.is_enabled
            
            # Default to False if not found
            return False
            
        except Exception as e:
            logger.warning(f"Error checking feature flag {flag_key}: {e}")
            return False
    
    async def is_enabled_async(self, flag_key: str, user_id: Optional[str] = None) -> bool:
        """Async version of is_enabled for use in async contexts."""
        return self.is_enabled(flag_key, user_id)
    
    def get_config(self, flag_key: str) -> Dict[str, Any]:
        """Get configuration for a feature flag."""
        try:
            flag = self.db.query(FeatureFlag).filter(
                FeatureFlag.key == flag_key
            ).first()
            
            if flag and flag.config:
                return flag.config
            
            return {}
            
        except Exception as e:
            logger.warning(f"Error getting config for feature flag {flag_key}: {e}")
            return {}
    
    def create_flag(self, key: str, name: str, description: str = None, 
                   is_enabled: bool = False, config: Dict[str, Any] = None,
                   created_by: str = None) -> FeatureFlag:
        """Create a new feature flag."""
        flag = FeatureFlag(
            key=key,
            name=name,
            description=description,
            is_enabled=is_enabled,
            config=config or {},
            created_by=created_by
        )
        
        self.db.add(flag)
        self.db.commit()
        self.db.refresh(flag)
        
        # Update cache
        self._cache[key] = is_enabled
        
        logger.info(f"Created feature flag: {key}")
        return flag
    
    def update_flag(self, key: str, is_enabled: Optional[bool] = None,
                   config: Optional[Dict[str, Any]] = None) -> Optional[FeatureFlag]:
        """Update an existing feature flag."""
        flag = self.db.query(FeatureFlag).filter(
            FeatureFlag.key == key
        ).first()
        
        if not flag:
            return None
        
        if is_enabled is not None:
            flag.is_enabled = is_enabled
            self._cache[key] = is_enabled
        
        if config is not None:
            flag.config = config
        
        self.db.commit()
        self.db.refresh(flag)
        
        logger.info(f"Updated feature flag: {key}")
        return flag
    
    def get_all_flags(self) -> Dict[str, Any]:
        """Get all feature flags (cache + database)."""
        result = dict(self._cache)
        
        try:
            db_flags = self.db.query(FeatureFlag).all()
            for flag in db_flags:
                result[flag.key] = {
                    'enabled': flag.is_enabled,
                    'config': flag.config,
                    'name': flag.name,
                    'description': flag.description
                }
                
        except Exception as e:
            logger.warning(f"Error fetching database flags: {e}")
        
        return result
    
    def refresh_cache(self):
        """Refresh the feature flag cache."""
        self._load_default_flags()
        logger.info("Feature flag cache refreshed")