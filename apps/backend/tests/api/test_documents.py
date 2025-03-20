import pytest
from datetime import datetime
from fastapi import status
from io import BytesIO

from src.models.document import LegalDocument

def test_list_documents(client, test_db):
    """Test that the documents endpoint returns a list of documents"""
    # Insert a test document
    test_doc = LegalDocument(
        title="Test Document",
        content="This is a test document content",
        document_type="Case Law",
        jurisdiction="Nigeria",
        publication_date=datetime.utcnow(),
        metadata={"source": "Test"}
    )
    test_db.add(test_doc)
    test_db.commit()
    
    # Make request to endpoint
    response = client.get("/api/documents/")
    
    # Assert response
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["title"] == "Test Document"
    assert data[0]["document_type"] == "Case Law"

def test_document_by_id(client, test_db):
    """Test retrieving a document by ID"""
    # Insert a test document
    test_doc = LegalDocument(
        title="Test Specific Document",
        content="This is a specific test document content",
        document_type="Legislation",
        jurisdiction="Nigeria",
        publication_date=datetime.utcnow(),
        metadata={"source": "Test"}
    )
    test_db.add(test_doc)
    test_db.commit()
    
    # Make request to endpoint
    response = client.get(f"/api/documents/{test_doc.id}")
    
    # Assert response
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["title"] == "Test Specific Document"
    assert data["document_type"] == "Legislation"

def test_document_not_found(client):
    """Test retrieving a non-existent document"""
    response = client.get("/api/documents/999")
    assert response.status_code == status.HTTP_404_NOT_FOUND
