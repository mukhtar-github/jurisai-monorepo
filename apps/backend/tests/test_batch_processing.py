"""
Tests for the batch document processing functionality.
"""
import pytest
from unittest.mock import patch, MagicMock
from io import BytesIO
import json
from fastapi import status

from src.models.document import LegalDocument, DocumentEntity, DocumentKeyTerm
from tests.conftest import client, test_db  # Import the client fixture properly

@pytest.fixture
def mock_db_session():
    """Create a mock database session for testing."""
    mock_session = MagicMock()
    
    # Configure the mock session to return empty queries by default
    mock_query = MagicMock()
    mock_query.filter.return_value = mock_query
    mock_query.all.return_value = []
    mock_session.query.return_value = mock_query
    
    return mock_session

@pytest.fixture
def sample_files():
    """Create sample files for batch upload testing."""
    file1 = BytesIO(b"This is a test document 1")
    file1.name = "test1.txt"
    
    file2 = BytesIO(b"This is a test document 2")
    file2.name = "test2.txt"
    
    return [file1, file2]

@patch("src.routes.documents.get_db")
def test_batch_upload_documents(mock_get_db, mock_db_session, sample_files, test_db, client):
    """Test the batch document upload endpoint."""
    mock_get_db.return_value = mock_db_session
    
    # Create test files for upload
    files = [("files", (file.name, file, "text/plain")) for file in sample_files]
    
    # Call the batch upload endpoint
    response = client.post(
        "/documents/batch-upload",
        files=files,
        data={
            "document_type": "case_law",
            "jurisdiction": "US",
            "process_with_ai": "true",
            "auto_analyze": "false"
        }
    )
    
    # Verify response
    assert response.status_code == status.HTTP_202_ACCEPTED
    data = response.json()
    assert "batch_id" in data
    assert "document_count" in data
    assert data["document_count"] == 2
    assert "message" in data

@patch("src.routes.documents.get_db")
def test_batch_status_pending(mock_get_db, mock_db_session, test_db, client):
    """Test the batch status endpoint when no documents are found."""
    mock_get_db.return_value = mock_db_session
    
    # Configure mock to return empty list for the query
    mock_db_session.query().filter().all.return_value = []
    
    # Call the batch status endpoint
    response = client.get("/documents/batch-status/test_batch_id")
    
    # Verify response
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "pending"
    assert data["total"] == 0
    assert data["completed"] == 0
    assert data["in_progress"] == 0
    assert data["failed"] == 0

@patch("src.routes.documents.get_db")
def test_batch_status_in_progress(mock_get_db, mock_db_session, test_db, client):
    """Test the batch status endpoint when processing is in progress."""
    mock_get_db.return_value = mock_db_session
    
    # Create mock documents with in-progress status
    doc1 = MagicMock(spec=LegalDocument)
    doc1.id = 1
    doc1.metadata = {
        "batch_id": "test_batch_id",
        "processing_status": "completed",
        "processing_started": "2025-03-07T10:00:00",
        "processing_completed": "2025-03-07T10:01:00"
    }
    
    doc2 = MagicMock(spec=LegalDocument)
    doc2.id = 2
    doc2.metadata = {
        "batch_id": "test_batch_id",
        "processing_status": "in_progress",
        "processing_started": "2025-03-07T10:00:30"
    }
    
    # Configure mock to return the documents
    mock_db_session.query().filter().all.return_value = [doc1, doc2]
    
    # Call the batch status endpoint
    response = client.get("/documents/batch-status/test_batch_id")
    
    # Verify response
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "in_progress"
    assert data["total"] == 2
    assert data["completed"] == 1
    assert data["in_progress"] == 1
    assert data["failed"] == 0

@patch("src.routes.documents.get_db")
def test_batch_status_completed(mock_get_db, mock_db_session, test_db, client):
    """Test the batch status endpoint when processing is completed."""
    mock_get_db.return_value = mock_db_session
    
    # Create mock documents with completed status
    doc1 = MagicMock(spec=LegalDocument)
    doc1.id = 1
    doc1.metadata = {
        "batch_id": "test_batch_id",
        "processing_status": "completed",
        "processing_started": "2025-03-07T10:00:00",
        "processing_completed": "2025-03-07T10:01:00",
        "analyzed_at": "2025-03-07T10:01:30"
    }
    
    doc2 = MagicMock(spec=LegalDocument)
    doc2.id = 2
    doc2.metadata = {
        "batch_id": "test_batch_id",
        "processing_status": "completed",
        "processing_started": "2025-03-07T10:00:30",
        "processing_completed": "2025-03-07T10:01:30",
        "analyzed_at": "2025-03-07T10:02:00"
    }
    
    # Configure mock to return the documents
    mock_db_session.query().filter().all.return_value = [doc1, doc2]
    
    # Call the batch status endpoint
    response = client.get("/documents/batch-status/test_batch_id")
    
    # Verify response
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "completed"
    assert data["total"] == 2
    assert data["completed"] == 2
    assert data["in_progress"] == 0
    assert data["failed"] == 0
    assert data["analyzed"] == 2
    assert data["started_at"] == "2025-03-07T10:00:00"
    assert data["completed_at"] == "2025-03-07T10:01:30"
    assert data["document_ids"] == [1, 2]
    assert "results" in data

@patch("src.routes.documents.get_db")
def test_batch_status_failed(mock_get_db, mock_db_session, test_db, client):
    """Test the batch status endpoint when processing has failed."""
    mock_get_db.return_value = mock_db_session
    
    # Create mock documents with failed status
    doc1 = MagicMock(spec=LegalDocument)
    doc1.id = 1
    doc1.metadata = {
        "batch_id": "test_batch_id",
        "processing_status": "failed",
        "processing_started": "2025-03-07T10:00:00",
        "processing_completed": "2025-03-07T10:01:00",
        "error": "Document processing error"
    }
    
    doc2 = MagicMock(spec=LegalDocument)
    doc2.id = 2
    doc2.metadata = {
        "batch_id": "test_batch_id",
        "processing_status": "failed",
        "processing_started": "2025-03-07T10:00:30",
        "processing_completed": "2025-03-07T10:01:30",
        "error": "AI processing error"
    }
    
    # Configure mock to return the documents
    mock_db_session.query().filter().all.return_value = [doc1, doc2]
    
    # Call the batch status endpoint
    response = client.get("/documents/batch-status/test_batch_id")
    
    # Verify response
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "failed"
    assert data["total"] == 2
    assert data["completed"] == 0
    assert data["in_progress"] == 0
    assert data["failed"] == 2
    assert data["analyzed"] == 0
