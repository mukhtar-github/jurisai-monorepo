"""
Enhanced AI Agents API routes with user authentication and document ownership
"""
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid
import logging

from src.core.database import get_db
from src.routes.auth import get_current_user
from src.models.user import User
from src.models.document import LegalDocument
from src.models.agent_task import AgentTask
from src.services.feature_flags import FeatureFlagService
from src.services.agents.document_analyzer import DocumentAnalysisAgent, AgentTaskContext, create_analysis_task

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/agents", tags=["enhanced-agents"])


class DocumentAnalysisRequest(BaseModel):
    parameters: Optional[Dict[str, Any]] = None


class DocumentAnalysisResponse(BaseModel):
    task_id: Optional[str] = None
    status: str
    agent_enabled: bool
    message: str
    result: Optional[Dict[str, Any]] = None


class AgentTaskStatusResponse(BaseModel):
    task_id: str
    status: str
    agent_type: str
    result: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = None
    processing_time_ms: Optional[float] = None
    created_at: Optional[str] = None
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


@router.post("/analyze-document/{document_id}", response_model=DocumentAnalysisResponse)
async def analyze_document_with_agent(
    document_id: int,
    request: DocumentAnalysisRequest,
    background_tasks: BackgroundTasks,
    enable_agents: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    feature_flags: FeatureFlagService = Depends(get_feature_flag_service),
    agent: DocumentAnalysisAgent = Depends(get_document_analyzer)
):
    """Enhanced document analysis with optional agent processing."""
    
    try:
        # Check if user has access to document
        document = db.query(LegalDocument).filter(
            LegalDocument.id == document_id,
            LegalDocument.owner_id == current_user.id
        ).first()
        
        if not document:
            # Check if document exists but user doesn't own it
            doc_exists = db.query(LegalDocument).filter(LegalDocument.id == document_id).first()
            if doc_exists:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail="Access denied: You don't own this document"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, 
                    detail="Document not found"
                )
        
        # Check feature flag with user context
        use_agents = enable_agents and await feature_flags.is_enabled_async(
            "enable_document_analysis_agent", str(current_user.id)
        )
        
        if use_agents:
            # Agent-enhanced analysis
            logger.info(f"Starting agent analysis for document {document_id}, user {current_user.id}")
            
            # Create agent task with user context
            task = create_analysis_task(
                db=db,
                user_id=current_user.id,
                document_id=document_id,
                parameters=request.parameters or {}
            )
            
            # Create task context
            context = AgentTaskContext(
                task_id=task.id,
                user_id=current_user.id,
                document_id=document_id,
                parameters=task.parameters
            )
            
            # Start analysis in background
            background_tasks.add_task(agent.analyze_document, context)
            
            return DocumentAnalysisResponse(
                task_id=task.id,
                status="processing",
                agent_enabled=True,
                message="Document analysis started with AI agent"
            )
            
        else:
            # Legacy analysis - simulate existing document service
            logger.info(f"Using legacy analysis for document {document_id}, user {current_user.id}")
            
            # For now, return a simple analysis result
            # In a real implementation, this would call the existing document service
            legacy_result = {
                "summary": document.summary or "Document summary not available",
                "document_type": document.document_type or "unknown",
                "word_count": document.word_count or 0,
                "analysis_type": "legacy"
            }
            
            return DocumentAnalysisResponse(
                status="completed",
                agent_enabled=False,
                message="Document analysis completed using legacy method",
                result=legacy_result
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in document analysis for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error during document analysis: {str(e)}"
        )


@router.get("/tasks/{task_id}/status", response_model=AgentTaskStatusResponse)
async def get_agent_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get status of agent task with user validation."""
    
    try:
        # Get task and verify user ownership
        task = db.query(AgentTask).filter(
            AgentTask.id == task_id,
            AgentTask.user_id == current_user.id
        ).first()
        
        if not task:
            # Check if task exists but user doesn't own it
            task_exists = db.query(AgentTask).filter(AgentTask.id == task_id).first()
            if task_exists:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You don't own this task"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Task not found"
                )
        
        # Calculate processing time if available
        processing_time_ms = None
        if task.duration_seconds:
            processing_time_ms = task.duration_seconds * 1000
        
        return AgentTaskStatusResponse(
            task_id=task_id,
            status=task.status,
            agent_type=task.agent_type,
            result=task.results,
            confidence=task.confidence,
            processing_time_ms=processing_time_ms,
            created_at=task.created_at.isoformat() if task.created_at else None,
            completed_at=task.completed_at.isoformat() if task.completed_at else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting task status for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error retrieving task status: {str(e)}"
        )


@router.get("/tasks", response_model=List[AgentTaskStatusResponse])
async def get_user_agent_tasks(
    status_filter: Optional[str] = None,
    agent_type: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all agent tasks for the current user with optional filtering."""
    
    try:
        # Build query for user's tasks only
        query = db.query(AgentTask).filter(AgentTask.user_id == current_user.id)
        
        # Apply filters
        if status_filter:
            query = query.filter(AgentTask.status == status_filter)
        
        if agent_type:
            query = query.filter(AgentTask.agent_type == agent_type)
        
        # Get tasks ordered by creation date
        tasks = query.order_by(AgentTask.created_at.desc()).limit(limit).all()
        
        # Convert to response models
        task_responses = []
        for task in tasks:
            processing_time_ms = None
            if task.duration_seconds:
                processing_time_ms = task.duration_seconds * 1000
                
            task_responses.append(AgentTaskStatusResponse(
                task_id=task.id,
                status=task.status,
                agent_type=task.agent_type,
                result=task.results,
                confidence=task.confidence,
                processing_time_ms=processing_time_ms,
                created_at=task.created_at.isoformat() if task.created_at else None,
                completed_at=task.completed_at.isoformat() if task.completed_at else None
            ))
        
        return task_responses
        
    except Exception as e:
        logger.error(f"Error getting user tasks for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error retrieving user tasks: {str(e)}"
        )


@router.get("/my-documents")
async def get_user_documents(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get documents owned by the current user."""
    
    try:
        # Get user's documents
        documents = db.query(LegalDocument).filter(
            LegalDocument.owner_id == current_user.id
        ).offset(skip).limit(limit).all()
        
        # Convert to simple response format
        document_list = []
        for doc in documents:
            document_list.append({
                "id": doc.id,
                "title": doc.title,
                "document_type": doc.document_type,
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
                "word_count": doc.word_count,
                "has_summary": bool(doc.summary)
            })
        
        return {
            "status": "success",
            "data": document_list,
            "count": len(document_list),
            "user_id": current_user.id
        }
        
    except Exception as e:
        logger.error(f"Error getting user documents for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error retrieving user documents: {str(e)}"
        )


@router.get("/health")
async def agents_health_check(
    current_user: User = Depends(get_current_user),
    feature_flags: FeatureFlagService = Depends(get_feature_flag_service)
):
    """Health check for enhanced agent system."""
    
    try:
        return {
            "status": "healthy",
            "user_id": current_user.id,
            "user_email": current_user.email,
            "agent_features": {
                "document_analysis_agent": await feature_flags.is_enabled_async(
                    "enable_document_analysis_agent", str(current_user.id)
                ),
                "enhanced_entity_extraction": await feature_flags.is_enabled_async(
                    "enable_enhanced_entity_extraction", str(current_user.id)
                ),
                "risk_assessment": await feature_flags.is_enabled_async(
                    "enable_risk_assessment", str(current_user.id)
                ),
                "document_classification": await feature_flags.is_enabled_async(
                    "enable_document_classification", str(current_user.id)
                )
            },
            "message": "Enhanced agent system is operational"
        }
        
    except Exception as e:
        logger.error(f"Error in agent health check for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health check failed: {str(e)}"
        )