"""
AI Agents API routes
"""
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid

from src.core.database import get_db
from src.services.feature_flags import FeatureFlagService
from src.services.agents.document_analyzer import DocumentAnalysisAgent, AgentTaskContext, create_analysis_task
from src.models.agent_task import AgentTask

router = APIRouter(prefix="/agents", tags=["agents"])


class DocumentAnalysisRequest(BaseModel):
    document_id: int
    parameters: Optional[Dict[str, Any]] = None


class AgentTaskResponse(BaseModel):
    task_id: str
    agent_type: str
    status: str
    document_id: Optional[int] = None
    user_id: Optional[int] = None
    parameters: Optional[Dict[str, Any]] = None
    results: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = None
    error_message: Optional[str] = None
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


def get_feature_flag_service(db: Session = Depends(get_db)) -> FeatureFlagService:
    """Get feature flag service instance."""
    return FeatureFlagService(db)


def get_document_analyzer(
    db: Session = Depends(get_db),
    feature_flags: FeatureFlagService = Depends(get_feature_flag_service)
) -> DocumentAnalysisAgent:
    """Get document analysis agent instance."""
    return DocumentAnalysisAgent(db, feature_flags)


@router.get("/")
async def get_agents_status(
    feature_flags: FeatureFlagService = Depends(get_feature_flag_service)
) -> Dict[str, Any]:
    """Get status of all available agents."""
    try:
        agents_status = {
            "document_analyzer": {
                "enabled": feature_flags.is_enabled('enable_document_analysis_agent'),
                "description": "Enhanced document analysis with AI capabilities",
                "features": {
                    "summarization": True,
                    "entity_extraction": feature_flags.is_enabled('enable_enhanced_entity_extraction'),
                    "document_classification": feature_flags.is_enabled('enable_document_classification'),
                    "risk_assessment": feature_flags.is_enabled('enable_risk_assessment')
                }
            },
            "legal_research_agent": {
                "enabled": feature_flags.is_enabled('enable_legal_research_agent'),
                "description": "Legal research and case law analysis",
                "features": {
                    "case_search": False,
                    "legal_research": False
                }
            },
            "contract_review_agent": {
                "enabled": feature_flags.is_enabled('enable_contract_review_agent'),
                "description": "Contract analysis and risk assessment",
                "features": {
                    "contract_analysis": False,
                    "risk_assessment": False
                }
            }
        }
        
        return {
            "status": "success",
            "data": agents_status
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get agents status: {str(e)}"
        )


@router.post("/document-analyzer/analyze")
async def analyze_document(
    request: DocumentAnalysisRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    agent: DocumentAnalysisAgent = Depends(get_document_analyzer)
) -> Dict[str, Any]:
    """Start document analysis with the document analyzer agent."""
    try:
        # Check if document analysis agent is enabled
        if not agent.feature_flags.is_enabled('enable_document_analysis_agent'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Document analysis agent is disabled"
            )
        
        # Create agent task
        task = create_analysis_task(
            db=db,
            user_id=None,  # Could be enhanced with user authentication
            document_id=request.document_id,
            parameters=request.parameters or {}
        )
        
        # Create task context
        context = AgentTaskContext(
            task_id=task.id,
            user_id=task.user_id,
            document_id=task.document_id,
            parameters=task.parameters
        )
        
        # Start analysis in background
        background_tasks.add_task(agent.analyze_document, context)
        
        return {
            "status": "success",
            "message": "Document analysis started",
            "data": {
                "task_id": task.id,
                "agent_type": task.agent_type,
                "status": task.status,
                "document_id": task.document_id
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to start document analysis: {str(e)}"
        )


@router.get("/tasks")
async def get_agent_tasks(
    agent_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get agent tasks with optional filtering."""
    try:
        query = db.query(AgentTask)
        
        if agent_type:
            query = query.filter(AgentTask.agent_type == agent_type)
        
        if status:
            query = query.filter(AgentTask.status == status)
        
        tasks = query.order_by(AgentTask.created_at.desc()).limit(limit).all()
        
        task_data = [AgentTaskResponse(
            task_id=task.id,
            agent_type=task.agent_type,
            status=task.status,
            document_id=task.document_id,
            user_id=task.user_id,
            parameters=task.parameters,
            results=task.results,
            confidence=task.confidence,
            error_message=task.error_message,
            created_at=task.created_at.isoformat() if task.created_at else None,
            started_at=task.started_at.isoformat() if task.started_at else None,
            completed_at=task.completed_at.isoformat() if task.completed_at else None
        ) for task in tasks]
        
        return {
            "status": "success",
            "data": task_data,
            "count": len(task_data)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve agent tasks: {str(e)}"
        )


@router.get("/tasks/{task_id}")
async def get_agent_task(
    task_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get a specific agent task by ID."""
    try:
        task = db.query(AgentTask).filter(AgentTask.id == task_id).first()
        
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Agent task '{task_id}' not found"
            )
        
        task_data = AgentTaskResponse(
            task_id=task.id,
            agent_type=task.agent_type,
            status=task.status,
            document_id=task.document_id,
            user_id=task.user_id,
            parameters=task.parameters,
            results=task.results,
            confidence=task.confidence,
            error_message=task.error_message,
            created_at=task.created_at.isoformat() if task.created_at else None,
            started_at=task.started_at.isoformat() if task.started_at else None,
            completed_at=task.completed_at.isoformat() if task.completed_at else None
        )
        
        return {
            "status": "success",
            "data": task_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve agent task: {str(e)}"
        )


@router.get("/tasks/{task_id}/results")
async def get_task_results(
    task_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get results from a specific agent task."""
    try:
        task = db.query(AgentTask).filter(AgentTask.id == task_id).first()
        
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Agent task '{task_id}' not found"
            )
        
        if task.status == "pending":
            return {
                "status": "pending",
                "message": "Task is still pending",
                "data": None
            }
        elif task.status == "processing":
            return {
                "status": "processing", 
                "message": "Task is currently being processed",
                "data": None
            }
        elif task.status == "failed":
            return {
                "status": "failed",
                "message": "Task failed",
                "error": task.error_message,
                "data": None
            }
        else:  # completed
            return {
                "status": "completed",
                "message": "Task completed successfully",
                "data": {
                    "results": task.results,
                    "confidence": task.confidence,
                    "duration_seconds": task.duration_seconds
                }
            }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve task results: {str(e)}"
        )