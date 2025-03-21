import pytest
from datetime import datetime
from fastapi import status
from io import BytesIO

from src.models.document import LegalDocument
from tests.conftest import client, test_db

def test_list_documents(client, test_db):
    """Test that the documents endpoint returns a list of documents"""
    # Insert a test document
    test_doc = LegalDocument(
        title="Test Document",
        content="This is a test document content",
        document_type="Case Law",
        jurisdiction="Nigeria",
        publication_date=datetime.utcnow(),
        doc_metadata={"source": "Test"}
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
    """Test retrieving a specific document by ID"""
    # Insert a test document
    test_doc = LegalDocument(
        title="Test Document",
        content="This is a test document content",
        document_type="Legislation",
        jurisdiction="Nigeria",
        publication_date=datetime.utcnow(),
        doc_metadata={"source": "Test"}
    )
    test_db.add(test_doc)
    test_db.commit()
    
    # Make request to endpoint
    response = client.get(f"/api/documents/{test_doc.id}")
    
    # Assert response
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["title"] == "Test Document"
    assert data["document_type"] == "Legislation"
    assert "content" in data

def test_document_not_found(client, test_db):
    """Test 404 response for non-existent document ID"""
    # Make request to endpoint with non-existent ID
    response = client.get("/api/documents/999")
    
    # Assert response
    assert response.status_code == status.HTTP_404_NOT_FOUND
