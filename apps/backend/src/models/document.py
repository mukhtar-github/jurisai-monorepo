"""
Database models for legal documents.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
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
    doc_metadata = Column(JSON, nullable=True)
    file_format = Column(String(10), nullable=True)
    word_count = Column(Integer, nullable=True)
    summary = Column(Text, nullable=True)
    
    # Relationships can be added here when we implement users
    # owner_id = Column(Integer, ForeignKey("users.id"))
    # owner = relationship("User", back_populates="documents")

class DocumentEntity(Base):
    """Model for storing extracted entities from legal documents."""
    
    __tablename__ = "document_entities"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("legal_documents.id", ondelete="CASCADE"), index=True)
    entity_text = Column(String(255))
    entity_type = Column(String(50), index=True)
    start_pos = Column(Integer, nullable=True)
    end_pos = Column(Integer, nullable=True)
    relevance_score = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document = relationship("LegalDocument")

class DocumentKeyTerm(Base):
    """Model for storing key legal terms extracted from documents."""
    
    __tablename__ = "document_key_terms"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("legal_documents.id", ondelete="CASCADE"), index=True)
    term = Column(String(100))
    relevance = Column(Integer, nullable=True)
    frequency = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document = relationship("LegalDocument")
