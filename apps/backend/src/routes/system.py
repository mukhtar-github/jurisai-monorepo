"""
System management routes for the JurisAI API.
"""

import logging
import os
import importlib
import inspect
import time
import subprocess
from typing import Dict, Any, Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.inspection import inspect as sqlalchemy_inspect
from sqlalchemy.exc import SQLAlchemyError 

from src.core.database import get_db, engine
from src.models.user import User
from src.routes.auth import get_current_user
from src.routes.roles import is_admin

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/system", tags=["system"])

# Models
class FeatureStatus(BaseModel):
    name: str
    status: str  # "available", "partial", "unavailable"
    description: Optional[str] = None
    version: Optional[str] = None


class SystemFeaturesResponse(BaseModel):
    status: str
    features: Dict[str, FeatureStatus]


class DatabaseStatus(BaseModel):
    """Database connection and migration status"""
    connected: bool
    migrationStatus: str
    version: Optional[str] = None
    tables: List[str] = []
    error: Optional[str] = None


class SystemStatusResponse(BaseModel):
    """Overall system status response"""
    status: str
    uptime: str
    version: str
    database: DatabaseStatus


class MigrationResponse(BaseModel):
    """Migration operation response"""
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None


# Function to check if a module exists
def check_module_exists(module_name: str) -> bool:
    """Check if a Python module exists."""
    try:
        importlib.import_module(module_name)
        return True
    except ImportError:
        return False


# Feature check functions
def check_feature_status(feature_name: str) -> FeatureStatus:
    """Check the status of a specific feature."""
    feature_checkers = {
        "document_upload": check_document_upload,
        "document_search": check_document_search,
        "rag_query": check_rag_query,
        "document_summarization": check_document_summarization,
        "entity_recognition": check_entity_recognition,
        "user_management": check_user_management,
        "role_based_access": check_role_based_access,
    }
    
    checker = feature_checkers.get(feature_name)
    if not checker:
        return FeatureStatus(
            name=feature_name,
            status="unknown",
            description=f"Unknown feature: {feature_name}",
        )
    
    return checker()


def check_document_upload() -> FeatureStatus:
    """Check if document upload feature is available."""
    from src.routes import documents
    
    upload_endpoints = [
        func for name, func in inspect.getmembers(documents)
        if name in ["upload_document", "upload_documents"]
    ]
    
    if upload_endpoints:
        return FeatureStatus(
            name="document_upload",
            status="available",
            description="Document upload functionality is available",
        )
    else:
        return FeatureStatus(
            name="document_upload",
            status="unavailable",
            description="Document upload functionality is not implemented",
        )


def check_document_search() -> FeatureStatus:
    """Check if document search feature is available."""
    from src.routes import search
    
    search_endpoints = [
        func for name, func in inspect.getmembers(search)
        if name in ["search_documents", "search"]
    ]
    
    if search_endpoints:
        return FeatureStatus(
            name="document_search",
            status="available",
            description="Document search functionality is available",
        )
    else:
        return FeatureStatus(
            name="document_search",
            status="unavailable",
            description="Document search functionality is not implemented",
        )


def check_rag_query() -> FeatureStatus:
    """Check if RAG query feature is available."""
    # Try to import the RAGPipeline class
    if check_module_exists("libs.ai_models.retrieval.rag"):
        try:
            from libs.ai_models.retrieval.rag import RAGPipeline
            
            return FeatureStatus(
                name="rag_query",
                status="available",
                description="RAG query functionality is available",
                version=getattr(RAGPipeline, "__version__", "unknown"),
            )
        except ImportError:
            return FeatureStatus(
                name="rag_query",
                status="partial",
                description="RAG module exists but pipeline cannot be imported",
            )
    
    return FeatureStatus(
        name="rag_query",
        status="unavailable",
        description="RAG query functionality is not available",
    )


def check_document_summarization() -> FeatureStatus:
    """Check if document summarization feature is available."""
    if check_module_exists("libs.ai_models.summarization"):
        try:
            # Try to import any summarization class
            from libs.ai_models.summarization import EnhancedLegalSummarizer
            
            return FeatureStatus(
                name="document_summarization",
                status="available",
                description="Document summarization functionality is available",
                version=getattr(EnhancedLegalSummarizer, "__version__", "unknown"),
            )
        except ImportError:
            # If we can import the module but not the specific class
            return FeatureStatus(
                name="document_summarization",
                status="partial",
                description="Summarization module exists but advanced features may not be available",
            )
    
    # Check if basic summarization is available in the routes
    from src.routes import summarization
    
    summarize_endpoints = [
        func for name, func in inspect.getmembers(summarization)
        if name in ["summarize_document", "get_summary"]
    ]
    
    if summarize_endpoints:
        return FeatureStatus(
            name="document_summarization",
            status="available",
            description="Basic document summarization is available",
        )
    
    return FeatureStatus(
        name="document_summarization",
        status="unavailable",
        description="Document summarization functionality is not available",
    )


def check_entity_recognition() -> FeatureStatus:
    """Check if entity recognition feature is available."""
    if check_module_exists("libs.ai_models.ner"):
        try:
            # Try to import the entity recognizer
            from libs.ai_models.ner import LegalEntityRecognizer
            
            return FeatureStatus(
                name="entity_recognition",
                status="available",
                description="Legal entity recognition functionality is available",
                version=getattr(LegalEntityRecognizer, "__version__", "unknown"),
            )
        except ImportError:
            return FeatureStatus(
                name="entity_recognition",
                status="partial",
                description="NER module exists but specialized classes may not be available",
            )
    
    # Check if spaCy is available for basic NER
    try:
        import spacy
        
        return FeatureStatus(
            name="entity_recognition",
            status="partial",
            description="Basic entity recognition is available via spaCy",
            version=spacy.__version__,
        )
    except ImportError:
        return FeatureStatus(
            name="entity_recognition",
            status="unavailable",
            description="Entity recognition functionality is not available",
        )


def check_user_management() -> FeatureStatus:
    """Check if user management feature is available."""
    from src.routes import auth
    
    user_endpoints = [
        func for name, func in inspect.getmembers(auth)
        if name in ["register_user", "get_user_profile", "update_user_profile"]
    ]
    
    if user_endpoints:
        return FeatureStatus(
            name="user_management",
            status="available",
            description="User management functionality is available",
        )
    else:
        return FeatureStatus(
            name="user_management",
            status="unavailable",
            description="User management functionality is not implemented",
        )


def check_role_based_access() -> FeatureStatus:
    """Check if role-based access control is available."""
    # Check if the PermissionMiddleware is available
    try:
        from src.middleware.permission import PermissionMiddleware
        
        # Check if the role model exists
        from src.models.role import Role
        from src.models.permission import Permission
        
        # Check if we have the role API endpoints
        from src.routes.roles import router as roles_router
        
        return FeatureStatus(
            name="role_based_access",
            status="available",
            description="Role-based access control is fully implemented",
        )
    except ImportError as e:
        logger.info(f"RBAC check error: {e}")
        
        # Check if there's a partial implementation
        try:
            from src.models.user import User
            
            # Check if the User model has the role field
            user = User()
            if hasattr(user, "role"):
                return FeatureStatus(
                    name="role_based_access",
                    status="partial",
                    description="Basic role field exists but full RBAC may not be implemented",
                )
        except (ImportError, TypeError):
            pass
        
        return FeatureStatus(
            name="role_based_access",
            status="unavailable",
            description="Role-based access control is not implemented",
        )


# Routes
@router.get("/features", response_model=SystemFeaturesResponse)
async def get_feature_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns status of all system features."""
    # Only allow admin users to access this endpoint
    if not is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    
    # Check all features
    features = {
        "document_upload": check_feature_status("document_upload"),
        "document_search": check_feature_status("document_search"),
        "rag_query": check_feature_status("rag_query"),
        "document_summarization": check_feature_status("document_summarization"),
        "entity_recognition": check_feature_status("entity_recognition"),
        "user_management": check_feature_status("user_management"),
        "role_based_access": check_feature_status("role_based_access"),
    }
    
    return {"status": "success", "features": features}


@router.get("/status", response_model=SystemStatusResponse)
async def get_system_status(
    db: Session = Depends(get_db)
):
    """
    Get overall system status including database migration status
    This endpoint doesn't require authentication to help with debugging
    """
    import time
    from src import START_TIME, VERSION
    
    # Check database connection and migration status
    db_status = DatabaseStatus(
        connected=False,
        migrationStatus="unknown"
    )
    
    try:
        # Test database connection
        db.execute("SELECT 1")
        db_status.connected = True
        
        # Get database tables
        inspector = sqlalchemy_inspect(engine)
        db_status.tables = inspector.get_table_names()
        
        # Simple heuristic to check migration status
        required_tables = ["documents", "users", "roles"]
        missing_tables = [table for table in required_tables if table not in db_status.tables]
        
        if not missing_tables:
            db_status.migrationStatus = "complete"
        elif len(missing_tables) < len(required_tables):
            db_status.migrationStatus = "partial"
            db_status.error = f"Missing tables: {', '.join(missing_tables)}"
        else:
            db_status.migrationStatus = "missing"
            db_status.error = "No required tables found"
            
    except SQLAlchemyError as e:
        db_status.connected = False
        db_status.migrationStatus = "error"
        db_status.error = str(e)
        logger.error(f"Database connection error: {e}")
    
    # Return system status
    return SystemStatusResponse(
        status="healthy",
        uptime=f"{int(time.time() - START_TIME)} seconds",
        version=VERSION,
        database=db_status
    )


@router.post("/migrations", response_model=MigrationResponse)
async def manage_migrations(
    action: str = "check",
    current_user: User = Depends(get_current_user),
    is_admin_user: bool = Depends(is_admin)
):
    """
    Manage database migrations
    
    This endpoint allows checking migration status and applying pending migrations.
    Requires admin privileges to use.
    
    - action: The operation to perform (check, apply, verify, fix)
    """
    if not is_admin_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage migrations"
        )
    
    try:
        result = {"action": action}
        success = False
        message = ""
        
        # Import the migration manager script
        try:
            # Add the scripts directory to the Python path
            import sys
            from pathlib import Path
            project_root = Path(__file__).resolve().parent.parent.parent
            scripts_dir = project_root / "scripts"
            if scripts_dir not in sys.path:
                sys.path.insert(0, str(scripts_dir))
            
            from manage_migrations import (
                check_migration_status, 
                apply_migrations, 
                verify_tables,
                fix_migration_sequence
            )
            
            if action == "check":
                status_data = check_migration_status()
                success = True
                message = "Migration status checked successfully"
                result.update(status_data)
                
            elif action == "apply":
                # Run migration in a subprocess to capture stdout/stderr
                cmd = ["python", str(scripts_dir / "manage_migrations.py"), "apply", "--yes"]
                process = subprocess.run(cmd, capture_output=True, text=True)
                
                success = process.returncode == 0
                message = "Migrations applied successfully" if success else "Failed to apply migrations"
                result.update({
                    "stdout": process.stdout,
                    "stderr": process.stderr,
                    "exit_code": process.returncode
                })
                
            elif action == "verify":
                success = verify_tables()
                message = "Table verification completed" if success else "Table verification failed"
                
            elif action == "fix":
                success = fix_migration_sequence()
                message = "Migration sequence fixed successfully" if success else "Failed to fix migration sequence"
                
                # Get updated status after fix
                status_data = check_migration_status()
                result.update(status_data)
                
            else:
                raise ValueError(f"Unknown action: {action}")
                
        except ImportError as e:
            logger.error(f"Failed to import migration manager: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Migration manager not available: {str(e)}"
            )
        
        return MigrationResponse(
            success=success,
            message=message,
            details=result
        )
        
    except Exception as e:
        logger.error(f"Error managing migrations: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to manage migrations: {str(e)}"
        )
