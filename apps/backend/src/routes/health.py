"""
Health check routes for the JurisAI API.
"""
from fastapi import APIRouter, FastAPI
import platform
import time
import psutil
import logging
from typing import Dict, Any

router = APIRouter(prefix="/health", tags=["health"])

# Start time for uptime calculation
START_TIME = time.time()

@router.get("/")
async def health_check() -> Dict[str, Any]:
    """
    Basic health check endpoint.
    
    Returns:
        Dict[str, Any]: Health status
    """
    return {
        "status": "healthy",
        "uptime": f"{int(time.time() - START_TIME)} seconds"
    }

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
            "disk_usage_percent": psutil.disk_usage('/').percent
        }
    except Exception as e:
        logging.error(f"Error getting system info: {e}")
        return {
            "status": "error",
            "message": "Could not retrieve system information",
            "os": platform.system(),
            "python_version": platform.python_version()
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
        "document_processor_available": False
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
        "models": models_status
    }
