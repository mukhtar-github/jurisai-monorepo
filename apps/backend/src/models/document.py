"""
Database models for legal documents.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

class LegalDocument(Base):
    """Legal document model for storing document metadata and content."""
    
    __tablename__ = "legal_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True)
    content = Column(Text)
    document_type = Column(String(50), index=True)
    jurisdiction = Column(String(100), index=True)
    publication_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships can be added here when we implement users
    # owner_id = Column(Integer, ForeignKey("users.id"))
    # owner = relationship("User", back_populates="documents")
