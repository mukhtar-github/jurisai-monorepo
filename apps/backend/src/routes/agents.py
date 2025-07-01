"""
Routes for AI agent functionality in the JurisAI API.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.user import User
from src.models.document import LegalDocument
from src.routes.auth import get_current_user
from src.services.agent_service import AgentService, get_agent_service
from src.services.feature_flags import FeatureFlagService, get_feature_flag_service


# Create router
router = APIRouter(prefix="/api/v1/agents", tags=["agents"])


# Pydantic models
class DocumentAnalysisRequest(BaseModel):
    """Request model for document analysis."""
    enable_agents: bool = Field(True, description="Whether to use AI agents for analysis")
    parameters: Optional[Dict[str, Any]] = Field(
        default_factory=dict, 
        description="Optional parameters for the analysis"
    )


class AgentTaskResponse(BaseModel):
    """Response model for agent tasks."""
    task_id: str
    status: str
    agent_type: str
    task_type: str
    document_id: Optional[int]
    result: Optional[Dict[str, Any]]
    confidence_score: Optional[float]
    processing_time_ms: Optional[int]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]
    is_completed: bool
    is_processing: bool
    is_successful: bool


class DocumentAnalysisResponse(BaseModel):
    """Response model for document analysis."""
    task_id: Optional[str]
    status: str
    agent_enabled: bool
    message: str
    result: Optional[Dict[str, Any]]


class AgentCapabilitiesResponse(BaseModel):
    """Response model for agent capabilities."""
    agent_type: str
    name: str
    description: str
    features: List[str]
    supported_document_types: List[str]
    processing_time: str
    confidence_scoring: bool


class AvailableAgentsResponse(BaseModel):
    """Response model for available agents."""
    agents: Dict[str, Dict[str, Any]]


# Routes
@router.post("/analyze-document/{document_id}", response_model=DocumentAnalysisResponse)
async def analyze_document_with_agent(
    document_id: int,
    request: DocumentAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    agent_service: AgentService = Depends(get_agent_service),
    feature_service: FeatureFlagService = Depends(get_feature_flag_service)
):
    """
    Enhanced document analysis with optional agent processing.
    
    This endpoint provides both legacy and agent-enhanced document analysis.
    The agent analysis is controlled by feature flags and user opt-in.
    """
    # Check if user has access to document
    document = db.query(LegalDocument).filter(
        LegalDocument.id == document_id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Document not found"
        )
    
    # Check feature flag for agent document analysis
    use_agents = request.enable_agents and await feature_service.is_enabled(
        "agent_document_analysis", str(current_user.id)
    )
    
    if use_agents:
        try:
            # Agent-enhanced analysis
            task_id = await agent_service.submit_document_analysis(
                document_id=document_id,
                user_id=current_user.id,
                parameters=request.parameters
            )
            
            return DocumentAnalysisResponse(
                task_id=task_id,
                status="processing",
                agent_enabled=True,
                message="Document analysis started with AI agent",
                result=None
            )
        except Exception as e:
            # Fallback to legacy analysis if agent fails
            return DocumentAnalysisResponse(
                task_id=None,
                status="completed",
                agent_enabled=False,
                message=f"Agent analysis failed, using standard analysis: {str(e)}",
                result={"summary": document.summary or "Summary not available"}
            )
    else:
        # Legacy analysis
        result = {
            "summary": document.summary or "Summary not available",
            "document_type": document.document_type or "unknown",
            "word_count": document.word_count or 0,
            "analysis_method": "standard"
        }
        
        return DocumentAnalysisResponse(
            task_id=None,
            status="completed",
            agent_enabled=False,
            message="Document analysis completed using standard method",
            result=result
        )


@router.get("/tasks/{task_id}/status", response_model=AgentTaskResponse)
async def get_agent_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    """Get status of a specific agent task."""
    task_status = await agent_service.get_task_status(task_id, current_user.id)
    
    if not task_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or access denied"
        )
    
    return AgentTaskResponse(**task_status)


@router.get("/tasks", response_model=List[AgentTaskResponse])
async def get_user_agent_tasks(
    status_filter: Optional[str] = Query(None, description="Filter tasks by status"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of tasks to return"),
    current_user: User = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    """Get all agent tasks for the current user."""
    tasks = await agent_service.get_user_tasks(
        user_id=current_user.id,
        status_filter=status_filter,
        limit=limit
    )
    
    return [AgentTaskResponse(**task) for task in tasks]


@router.delete("/tasks/{task_id}")
async def cancel_agent_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    """Cancel a pending or processing agent task."""
    success = await agent_service.cancel_task(task_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task not found, access denied, or cannot be cancelled"
        )
    
    return {"message": f"Task {task_id} cancelled successfully"}


@router.get("/capabilities", response_model=AvailableAgentsResponse)
async def get_available_agents(
    current_user: User = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service),
    feature_service: FeatureFlagService = Depends(get_feature_flag_service)
):
    """Get information about available AI agents and their capabilities."""
    # Check if user has access to agent features
    has_agent_access = await feature_service.is_enabled(
        "agent_document_analysis", str(current_user.id)
    )
    
    if not has_agent_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agent features not available for your account"
        )
    
    agents = agent_service.get_available_agents()
    
    return AvailableAgentsResponse(agents=agents)


@router.get("/capabilities/{agent_type}", response_model=AgentCapabilitiesResponse)
async def get_agent_capabilities(
    agent_type: str,
    current_user: User = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service),
    feature_service: FeatureFlagService = Depends(get_feature_flag_service)
):
    """Get detailed capabilities of a specific agent."""
    # Check if user has access to agent features
    has_agent_access = await feature_service.is_enabled(
        "agent_document_analysis", str(current_user.id)
    )
    
    if not has_agent_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agent features not available for your account"
        )
    
    capabilities = agent_service.get_agent_capabilities(agent_type)
    
    if not capabilities:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent type not found"
        )
    
    # Get agent info
    agents = agent_service.get_available_agents()
    agent_info = agents.get(agent_type, {})
    
    return AgentCapabilitiesResponse(
        agent_type=agent_type,
        name=agent_info.get('name', 'Unknown Agent'),
        description=agent_info.get('description', 'No description available'),
        **capabilities
    )


# Health check endpoint for agent system
@router.get("/health")
async def agent_system_health(
    current_user: User = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    """Check the health of the agent system."""
    try:
        agents = agent_service.get_available_agents()
        agent_count = len([a for a in agents.values() if a.get('available', False)])
        
        return {
            "status": "healthy",
            "available_agents": agent_count,
            "agents": list(agents.keys()),
            "timestamp": datetime.now()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now()
        }