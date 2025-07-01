"""
Health check routes for the JurisAI API with blue-green deployment support.
"""

import logging
import platform
import time
from typing import Any, Dict

import psutil
from fastapi import APIRouter, Depends, FastAPI, Response
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.core.health import health_checker

router = APIRouter(prefix="/health", tags=["health"])

# Start time for uptime calculation
START_TIME = time.time()


@router.get("/")
async def health_check() -> Dict[str, Any]:
    """
    Basic health check endpoint for blue-green deployments.

    Returns:
        Dict[str, Any]: Health status
    """
    return {"status": "healthy", "uptime": f"{int(time.time() - START_TIME)} seconds"}


@router.get("/ready")
async def readiness_check(response: Response) -> Dict[str, Any]:
    """
    Readiness check for blue-green traffic routing.
    
    Returns:
        Dict[str, Any]: Readiness status
    """
    readiness_status = await health_checker.get_readiness_status()
    
    if not readiness_status["ready"]:
        response.status_code = 503
        
    return readiness_status


@router.get("/live")
async def liveness_check(response: Response) -> Dict[str, Any]:
    """
    Liveness check for blue-green deployment monitoring.
    
    Returns:
        Dict[str, Any]: Liveness status
    """
    health_status = await health_checker.get_comprehensive_health()
    
    if health_status["status"] == "unhealthy":
        response.status_code = 503
        
    return health_status


@router.get("/system")
async def system_info() -> Dict[str, Any]:
    """
    Get detailed system information.

    Returns:
        Dict[str, Any]: System information
    """
    try:
        return {
            "os": platform.system(),
            "os_version": platform.version(),
            "python_version": platform.python_version(),
            "cpu_usage_percent": psutil.cpu_percent(),
            "memory_usage_percent": psutil.virtual_memory().percent,
            "disk_usage_percent": psutil.disk_usage("/").percent,
        }
    except Exception as e:
        logging.error(f"Error getting system info: {e}")
        return {
            "status": "error",
            "message": "Could not retrieve system information",
            "os": platform.system(),
            "python_version": platform.python_version(),
        }


@router.get("/ai-models")
async def ai_models_check() -> Dict[str, Any]:
    """
    Check AI models availability and status.

    Returns:
        Dict[str, Any]: AI models status
    """
    models_status = {
        "rag_available": False,
        "summarizer_available": False,
        "document_processor_available": False,
    }

    # Check RAG model
    try:
        from src.routes.search import RAG_AVAILABLE

        models_status["rag_available"] = RAG_AVAILABLE
    except ImportError:
        pass

    # Check summarizer
    try:
        from libs.ai_models.src.summarization.summarizer import LegalDocumentSummarizer

        models_status["summarizer_available"] = True
    except ImportError:
        pass

    # Check document processor
    try:
        from libs.ai_models.src.document_processing.processor import DocumentProcessor

        models_status["document_processor_available"] = True
    except ImportError:
        pass

    return {
        "status": "operational" if any(models_status.values()) else "limited",
        "models": models_status,
    }


@router.get("/database")
async def database_check(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Check database connection status.

    Args:
        db (Session): Database session

    Returns:
        Dict[str, Any]: Database connection status
    """
    try:
        # Try a simple query to verify database connection
        db.execute("SELECT 1")
        return {
            "status": "connected",
            "type": db.bind.dialect.name,
            "message": "Database connection successful"
        }
    except Exception as e:
        logging.error(f"Database connection error: {e}")
        return {
            "status": "error",
            "message": f"Database connection failed: {str(e)}"
        }


@router.get("/full")
async def full_health_check(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Comprehensive health check of all system components for blue-green deployments.

    Args:
        db (Session): Database session

    Returns:
        Dict[str, Any]: Complete system health status
    """
    # Use the enhanced health checker
    comprehensive_health = await health_checker.get_comprehensive_health()
    
    # Get additional legacy info for backward compatibility
    sys_info = await system_info()
    db_status = await database_check(db)
    ai_status = await ai_models_check()
    
    # Merge with comprehensive health data
    comprehensive_health.update({
        "legacy_system": sys_info,
        "legacy_database": db_status,
        "legacy_ai_models": ai_status
    })
    
    return comprehensive_health
