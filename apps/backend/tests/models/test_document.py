from datetime import datetime, timezone

import pytest
from sqlalchemy.exc import IntegrityError

from src.models.document import DocumentEntity, DocumentKeyTerm, LegalDocument


def test_legal_document_creation(test_db):
    """Test creating a legal document in the database"""
    # Create a document
    doc = LegalDocument(
        title="Test Document",
        content="This is a test document content",
        document_type="Case Law",
        jurisdiction="Nigeria",
        publication_date=datetime.now(timezone.utc),
        doc_metadata={"source": "Test"},
    )

    # Add to database
    test_db.add(doc)
    test_db.commit()

    # Query to verify
    retrieved_doc = (
        test_db.query(LegalDocument).filter_by(title="Test Document").first()
    )

    # Assertions
    assert retrieved_doc is not None
    assert retrieved_doc.title == "Test Document"
    assert retrieved_doc.content == "This is a test document content"
    assert retrieved_doc.document_type == "Case Law"
    assert retrieved_doc.jurisdiction == "Nigeria"
    assert retrieved_doc.doc_metadata["source"] == "Test"


def test_document_entity_relationship(test_db):
    """Test creating document entities linked to a document"""
    # Create a document
    doc = LegalDocument(
        title="Entity Test Document",
        content="This is a test document with entities",
        document_type="Case Law",
        jurisdiction="Nigeria",
    )
    test_db.add(doc)
    test_db.flush()

    # Create entities
    entities = [
        DocumentEntity(
            document_id=doc.id,
            entity_type="PERSON",
            entity_text="John Doe",
            start_position=10,
            end_position=18,
        ),
        DocumentEntity(
            document_id=doc.id,
            entity_type="ORGANIZATION",
            entity_text="Supreme Court",
            start_position=25,
            end_position=38,
        ),
    ]

    test_db.add_all(entities)
    test_db.commit()

    # Query to verify
    retrieved_doc = (
        test_db.query(LegalDocument).filter_by(title="Entity Test Document").first()
    )

    # Assertions
    assert retrieved_doc is not None
    assert len(retrieved_doc.entities) == 2
    assert retrieved_doc.entities[0].entity_type == "PERSON"
    assert retrieved_doc.entities[0].entity_text == "John Doe"
    assert retrieved_doc.entities[1].entity_type == "ORGANIZATION"


def test_document_key_terms(test_db):
    """Test creating key terms linked to a document"""
    # Create a document
    doc = LegalDocument(
        title="Key Terms Test Document",
        content="This is a test document with key terms",
        document_type="Legislation",
        jurisdiction="Nigeria",
    )
    test_db.add(doc)
    test_db.flush()

    # Create key terms
    key_terms = [
        DocumentKeyTerm(document_id=doc.id, term="negligence", relevance_score=0.85),
        DocumentKeyTerm(document_id=doc.id, term="liability", relevance_score=0.75),
    ]

    test_db.add_all(key_terms)
    test_db.commit()

    # Query to verify
    retrieved_doc = (
        test_db.query(LegalDocument).filter_by(title="Key Terms Test Document").first()
    )

    # Assertions
    assert retrieved_doc is not None
    assert len(retrieved_doc.key_terms) == 2
    assert retrieved_doc.key_terms[0].term == "negligence"
    assert retrieved_doc.key_terms[0].relevance_score == 0.85
    assert retrieved_doc.key_terms[1].term == "liability"
