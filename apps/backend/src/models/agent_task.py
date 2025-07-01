"""
Agent Task models for tracking AI agent executions.
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Float, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.core.database import Base


class AgentTask(Base):
    """Model for tracking agent task executions."""
    
    __tablename__ = "agent_tasks"
    
    id = Column(String(36), primary_key=True, index=True)  # UUID
    agent_type = Column(String(50), nullable=False, index=True)
    status = Column(String(20), default="pending", nullable=False, index=True)  # pending, processing, completed, failed
    
    # Context
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    document_id = Column(Integer, ForeignKey("legal_documents.id"), nullable=True, index=True)
    
    # Configuration and results
    parameters = Column(JSON, default=dict)
    results = Column(JSON, default=dict)
    error_message = Column(Text)
    confidence = Column(Float)
    
    # Timing
    created_at = Column(DateTime, server_default=func.now())
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Relationships
    user = relationship("User", backref="agent_tasks")
    document = relationship("LegalDocument", backref="agent_tasks")
    
    def __repr__(self):
        return f"<AgentTask(id='{self.id}', type='{self.agent_type}', status='{self.status}')>"
    
    def to_dict(self):
        """Convert agent task to dictionary."""
        return {
            'id': self.id,
            'agent_type': self.agent_type,
            'status': self.status,
            'user_id': self.user_id,
            'document_id': self.document_id,
            'parameters': self.parameters,
            'results': self.results,
            'error_message': self.error_message,
            'confidence': self.confidence,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }
    
    @property
    def duration_seconds(self):
        """Calculate task duration in seconds."""
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None