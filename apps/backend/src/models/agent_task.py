"""
Agent task model for tracking AI agent workflows and processing status.
"""

from datetime import datetime
from typing import Dict, Any, Optional
from enum import Enum

from sqlalchemy import Column, DateTime, Integer, String, Text, JSON, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.core.database import Base


class AgentTaskStatus(str, Enum):
    """Enumeration of possible agent task statuses."""
    PENDING = "pending"
    PROCESSING = "processing" 
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AgentType(str, Enum):
    """Enumeration of available agent types."""
    DOCUMENT_ANALYZER = "document_analyzer"
    LEGAL_RESEARCHER = "legal_researcher"
    CONTRACT_REVIEWER = "contract_reviewer"
    CASE_SUMMARIZER = "case_summarizer"


class TaskType(str, Enum):
    """Enumeration of task types that agents can perform."""
    DOCUMENT_ANALYSIS = "document_analysis"
    LEGAL_RESEARCH = "legal_research"
    CONTRACT_REVIEW = "contract_review"
    CASE_SUMMARY = "case_summary"
    ENTITY_EXTRACTION = "entity_extraction"
    RISK_ASSESSMENT = "risk_assessment"


class AgentTask(Base):
    """Model for tracking AI agent tasks and their execution status."""

    __tablename__ = "agent_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    document_id = Column(Integer, ForeignKey("legal_documents.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Task classification
    agent_type = Column(String(100), nullable=False)
    task_type = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default=AgentTaskStatus.PENDING.value)
    
    # Task data
    parameters = Column(JSON, nullable=True)  # Input parameters for the task
    result = Column(JSON, nullable=True)      # Task results
    error_message = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=True)  # AI confidence in results (0.0-1.0)
    processing_time_ms = Column(Integer, nullable=True)  # Processing time in milliseconds
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="agent_tasks")
    document = relationship("LegalDocument", back_populates="agent_tasks")
    
    def __init__(self, **kwargs):
        """Initialize agent task with validation."""
        super().__init__(**kwargs)
        
        # Validate agent_type and task_type if provided
        if self.agent_type and self.agent_type not in [e.value for e in AgentType]:
            raise ValueError(f"Invalid agent_type: {self.agent_type}")
        
        if self.task_type and self.task_type not in [e.value for e in TaskType]:
            raise ValueError(f"Invalid task_type: {self.task_type}")
    
    def start_processing(self):
        """Mark task as started and record timestamp."""
        self.status = AgentTaskStatus.PROCESSING.value
        self.started_at = datetime.now()
    
    def complete_successfully(self, result: Dict[str, Any], confidence_score: Optional[float] = None):
        """Mark task as completed successfully with results."""
        self.status = AgentTaskStatus.COMPLETED.value
        self.completed_at = datetime.now()
        self.result = result
        self.confidence_score = confidence_score
        
        # Calculate processing time if started_at is available
        if self.started_at:
            processing_time = (self.completed_at - self.started_at).total_seconds() * 1000
            self.processing_time_ms = int(processing_time)
    
    def fail_with_error(self, error_message: str):
        """Mark task as failed with error message."""
        self.status = AgentTaskStatus.FAILED.value
        self.completed_at = datetime.now()
        self.error_message = error_message
        
        # Calculate processing time if started_at is available
        if self.started_at:
            processing_time = (self.completed_at - self.started_at).total_seconds() * 1000
            self.processing_time_ms = int(processing_time)
    
    def cancel(self):
        """Cancel the task."""
        self.status = AgentTaskStatus.CANCELLED.value
        self.completed_at = datetime.now()
    
    @property
    def is_completed(self) -> bool:
        """Check if task is in a completed state (success, failed, or cancelled)."""
        return self.status in [
            AgentTaskStatus.COMPLETED.value,
            AgentTaskStatus.FAILED.value,
            AgentTaskStatus.CANCELLED.value
        ]
    
    @property
    def is_processing(self) -> bool:
        """Check if task is currently being processed."""
        return self.status == AgentTaskStatus.PROCESSING.value
    
    @property
    def is_successful(self) -> bool:
        """Check if task completed successfully."""
        return self.status == AgentTaskStatus.COMPLETED.value
    
    def get_processing_duration_ms(self) -> Optional[int]:
        """Get processing duration in milliseconds."""
        if self.processing_time_ms:
            return self.processing_time_ms
        
        if self.started_at and self.completed_at:
            return int((self.completed_at - self.started_at).total_seconds() * 1000)
        
        return None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert agent task to dictionary representation."""
        return {
            'id': str(self.id),
            'document_id': self.document_id,
            'user_id': self.user_id,
            'agent_type': self.agent_type,
            'task_type': self.task_type,
            'status': self.status,
            'parameters': self.parameters,
            'result': self.result,
            'error_message': self.error_message,
            'confidence_score': self.confidence_score,
            'processing_time_ms': self.processing_time_ms,
            'created_at': self.created_at,
            'started_at': self.started_at,
            'completed_at': self.completed_at,
            'is_completed': self.is_completed,
            'is_processing': self.is_processing,
            'is_successful': self.is_successful
        }
    
    def __repr__(self):
        return f"<AgentTask(id='{self.id}', type='{self.agent_type}', status='{self.status}')>"