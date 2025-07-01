"""
Central agent service for managing AI agent tasks and execution.
"""

import uuid
import logging
from datetime import datetime
from typing import Dict, Any, Optional, Type

from sqlalchemy.orm import Session

from src.models.agent_task import AgentTask, AgentType, TaskType, AgentTaskStatus
from src.models.user import User
from src.models.document import LegalDocument
from src.services.agents.document_analyzer import DocumentAnalysisAgent, AgentTaskContext


logger = logging.getLogger(__name__)


class AgentService:
    """Central service for managing and executing AI agent tasks."""
    
    def __init__(self, db: Session):
        self.db = db
        
        # Registry of available agents
        self._agent_registry: Dict[str, Type] = {
            AgentType.DOCUMENT_ANALYZER.value: DocumentAnalysisAgent,
            # Future agents can be added here
            # AgentType.LEGAL_RESEARCHER.value: LegalResearchAgent,
            # AgentType.CONTRACT_REVIEWER.value: ContractReviewAgent,
        }
    
    async def submit_document_analysis(
        self, 
        document_id: int, 
        user_id: int, 
        parameters: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Submit a document for analysis by the Document Analysis Agent.
        
        Args:
            document_id: ID of the document to analyze
            user_id: ID of the user submitting the request
            parameters: Optional parameters for the analysis
            
        Returns:
            str: Task ID for tracking the analysis
        """
        # Validate inputs
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        document = self.db.query(LegalDocument).filter(LegalDocument.id == document_id).first()
        if not document:
            raise ValueError(f"Document {document_id} not found")
        
        # Create agent task
        task = AgentTask(
            document_id=document_id,
            user_id=user_id,
            agent_type=AgentType.DOCUMENT_ANALYZER.value,
            task_type=TaskType.DOCUMENT_ANALYSIS.value,
            status=AgentTaskStatus.PENDING.value,
            parameters=parameters or {}
        )
        
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        
        # Update document status
        document.agent_processing_status = "pending"
        self.db.commit()
        
        logger.info(f"Created document analysis task {task.id} for document {document_id}")
        
        # Execute the task (in production, this would be queued)
        try:
            await self._execute_task(task.id)
        except Exception as e:
            logger.error(f"Failed to execute task {task.id}: {e}")
            # Task status will be updated by the agent
        
        return str(task.id)
    
    async def get_task_status(self, task_id: str, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Get the status of an agent task.
        
        Args:
            task_id: ID of the task
            user_id: ID of the user (for authorization)
            
        Returns:
            Dict with task status information or None if not found
        """
        task = self.db.query(AgentTask).filter(
            AgentTask.id == task_id,
            AgentTask.user_id == user_id
        ).first()
        
        if not task:
            return None
        
        return task.to_dict()
    
    async def get_user_tasks(
        self, 
        user_id: int, 
        status_filter: Optional[str] = None,
        limit: int = 50
    ) -> list:
        """
        Get all tasks for a user.
        
        Args:
            user_id: ID of the user
            status_filter: Optional status to filter by
            limit: Maximum number of tasks to return
            
        Returns:
            List of task dictionaries
        """
        query = self.db.query(AgentTask).filter(AgentTask.user_id == user_id)
        
        if status_filter:
            query = query.filter(AgentTask.status == status_filter)
        
        tasks = query.order_by(AgentTask.created_at.desc()).limit(limit).all()
        
        return [task.to_dict() for task in tasks]
    
    async def cancel_task(self, task_id: str, user_id: int) -> bool:
        """
        Cancel a pending or processing task.
        
        Args:
            task_id: ID of the task to cancel
            user_id: ID of the user (for authorization)
            
        Returns:
            bool: True if successfully cancelled
        """
        task = self.db.query(AgentTask).filter(
            AgentTask.id == task_id,
            AgentTask.user_id == user_id
        ).first()
        
        if not task:
            return False
        
        if task.is_completed:
            return False  # Cannot cancel completed tasks
        
        task.cancel()
        self.db.commit()
        
        logger.info(f"Cancelled task {task_id}")
        return True
    
    async def _execute_task(self, task_id: str):
        """
        Execute an agent task.
        
        Args:
            task_id: ID of the task to execute
        """
        task = self.db.query(AgentTask).filter(AgentTask.id == task_id).first()
        if not task:
            raise ValueError(f"Task {task_id} not found")
        
        # Get the appropriate agent
        agent_class = self._agent_registry.get(task.agent_type)
        if not agent_class:
            raise ValueError(f"Unknown agent type: {task.agent_type}")
        
        # Create agent instance
        agent = agent_class(self.db)
        
        # Create task context
        context = AgentTaskContext(
            task_id=str(task.id),
            user_id=task.user_id,
            document_id=task.document_id,
            parameters=task.parameters or {},
            db_session=self.db
        )
        
        # Execute based on task type
        if task.task_type == TaskType.DOCUMENT_ANALYSIS.value:
            await agent.analyze_document(context)
        else:
            raise ValueError(f"Unknown task type: {task.task_type}")
    
    def get_available_agents(self) -> Dict[str, Dict[str, Any]]:
        """Get information about available agents."""
        return {
            AgentType.DOCUMENT_ANALYZER.value: {
                'name': 'Document Analysis Agent',
                'description': 'Enhanced AI-powered document analysis with entity extraction, risk assessment, and compliance checking',
                'supported_tasks': [TaskType.DOCUMENT_ANALYSIS.value],
                'available': True
            },
            # Future agents would be listed here
        }
    
    def get_agent_capabilities(self, agent_type: str) -> Optional[Dict[str, Any]]:
        """Get detailed capabilities of a specific agent."""
        if agent_type == AgentType.DOCUMENT_ANALYZER.value:
            return {
                'features': [
                    'Enhanced summarization',
                    'Entity extraction (parties, dates, amounts, locations)',
                    'Document type classification',
                    'Risk assessment for contracts',
                    'Key insights extraction',
                    'Compliance analysis'
                ],
                'supported_document_types': [
                    'contracts', 'agreements', 'legal_memos', 
                    'judgments', 'legislation', 'legal_documents'
                ],
                'processing_time': 'Typically 15-30 seconds',
                'confidence_scoring': True
            }
        
        return None


# Dependency injection factory
def get_agent_service(db: Session) -> AgentService:
    """Factory function for dependency injection."""
    return AgentService(db)