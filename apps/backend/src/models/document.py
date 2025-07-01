"""
Database models for legal documents.
"""

from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

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

    # Relationships
    entities = relationship(
        "DocumentEntity", back_populates="document", cascade="all, delete-orphan"
    )
    key_terms = relationship(
        "DocumentKeyTerm", back_populates="document", cascade="all, delete-orphan"
    )

    # User ownership for documents
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    owner = relationship("User", back_populates="documents")


class DocumentEntity(Base):
    """Model for storing named entities extracted from documents."""

    __tablename__ = "document_entities"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(
        Integer, ForeignKey("legal_documents.id", ondelete="CASCADE"), index=True
    )
    entity_type = Column(String(50))  # e.g., PERSON, ORGANIZATION, LOCATION
    entity_text = Column(String(255))
    start_position = Column(Integer, nullable=True)
    end_position = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship back to document
    document = relationship("LegalDocument", back_populates="entities")


class DocumentKeyTerm(Base):
    """Model for storing key legal terms extracted from documents."""

    __tablename__ = "document_key_terms"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(
        Integer, ForeignKey("legal_documents.id", ondelete="CASCADE"), index=True
    )
    term = Column(String(100))
    relevance_score = Column(Float, nullable=True)
    frequency = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship back to document
    document = relationship("LegalDocument", back_populates="key_terms")
