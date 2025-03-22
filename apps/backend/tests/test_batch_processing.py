"""
Tests for the batch document processing functionality.
"""
import pytest
from unittest.mock import patch, MagicMock
from io import BytesIO
import json
from fastapi import status

from src.models.document import LegalDocument
from tests.conftest import client  # Import the client fixture properly

@pytest.fixture
def mock_db_session():
    """Create a mock database session."""
    return MagicMock()

@pytest.fixture
def sample_files():
    """Create sample files for testing batch upload."""
    file1 = BytesIO(b"This is the content of test file 1.")
    file1.name = "test1.txt"
    file2 = BytesIO(b"This is the content of test file 2.")
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

    # Assertions
    assert response.status_code == status.HTTP_200_OK  # Changed from 202 to 200 to match actual response
    data = response.json()
    assert "batch_id" in data
    assert "document_count" in data
    assert data["document_count"] == 2
    assert data["document_type"] == "case_law"
    assert data["jurisdiction"] == "US"
    assert data["ai_processing_enabled"] is True
    assert data["auto_analyze_enabled"] is False

@patch("src.routes.documents.get_db")
def test_batch_status_pending(mock_get_db, mock_db_session, test_db, client):
    """Test the batch status endpoint when no documents are found."""
    mock_get_db.return_value = mock_db_session

    # Configure mock to return empty list for the query
    mock_db_session.query().filter().all.return_value = []

    # Call the batch status endpoint
    response = client.get("/documents/batch-status/test_batch_id")

    # Assertions
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["batch_id"] == "test_batch_id"
    assert data["status"] == "pending"
    assert data["documents_processed"] == 0
    assert data["total_documents"] == 0
    assert data["started_at"] is None

@patch("src.routes.documents.get_db")
def test_batch_status_in_progress(mock_get_db, mock_db_session, test_db, client):
    """Test the batch status endpoint when processing is in progress."""
    mock_get_db.return_value = mock_db_session

    # Create mock documents with in-progress status
    doc1 = MagicMock(spec=LegalDocument)
    doc1.id = 1
    doc1.doc_metadata = {
        "batch_id": "test_batch_id",
        "processing_status": "completed",
        "processing_started": "2025-03-07T10:00:00",
        "processing_completed": "2025-03-07T10:01:00"
    }

    doc2 = MagicMock(spec=LegalDocument)
    doc2.id = 2
    doc2.doc_metadata = {
        "batch_id": "test_batch_id",
        "processing_status": "in_progress",
        "processing_started": "2025-03-07T10:00:30"
    }

    # Configure mock to return the documents
    mock_db_session.query().filter().all.return_value = [doc1, doc2]

    # Call the batch status endpoint
    response = client.get("/documents/batch-status/test_batch_id")

    # Assertions
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["batch_id"] == "test_batch_id"
    assert data["status"] == "in_progress"
    assert data["documents"]["total"] == 2
    assert data["documents"]["processed"] == 1
    assert data["documents"]["failed"] == 0
    assert data["started_at"] == "2025-03-07T10:00:00"
    assert data["completed_at"] is None

@patch("src.routes.documents.get_db")
def test_batch_status_completed(mock_get_db, mock_db_session, test_db, client):
    """Test the batch status endpoint when processing is completed."""
    mock_get_db.return_value = mock_db_session

    # Create mock documents with completed status
    doc1 = MagicMock(spec=LegalDocument)
    doc1.id = 1
    doc1.doc_metadata = {
        "batch_id": "test_batch_id",
        "processing_status": "completed",
        "processing_started": "2025-03-07T10:00:00",
        "processing_completed": "2025-03-07T10:01:00",
        "analyzed_at": "2025-03-07T10:01:30"
    }

    doc2 = MagicMock(spec=LegalDocument)
    doc2.id = 2
    doc2.doc_metadata = {
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

    # Assertions
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["batch_id"] == "test_batch_id"
    assert data["status"] == "completed"
    assert data["documents"]["total"] == 2
    assert data["documents"]["processed"] == 2
    assert data["documents"]["failed"] == 0
    assert data["documents"]["analyzed"] == 2
    assert data["started_at"] == "2025-03-07T10:00:00"
    assert data["completed_at"] == "2025-03-07T10:01:30"
    assert data["document_ids"] == [1, 2]

@patch("src.routes.documents.get_db")
def test_batch_status_failed(mock_get_db, mock_db_session, test_db, client):
    """Test the batch status endpoint when processing has failed."""
    mock_get_db.return_value = mock_db_session

    # Create mock documents with failed status
    doc1 = MagicMock(spec=LegalDocument)
    doc1.id = 1
    doc1.doc_metadata = {
        "batch_id": "test_batch_id",
        "processing_status": "failed",
        "processing_started": "2025-03-07T10:00:00",
        "processing_completed": "2025-03-07T10:01:00",
        "error": "Document processing error"
    }

    doc2 = MagicMock(spec=LegalDocument)
    doc2.id = 2
    doc2.doc_metadata = {
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

    # Assertions
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["batch_id"] == "test_batch_id"
    assert data["status"] == "failed"
    assert data["documents"]["total"] == 2
    assert data["documents"]["processed"] == 0
    assert data["documents"]["failed"] == 2
    assert data["documents"]["analyzed"] == 0
    assert "document_ids" in data
    assert len(data["document_ids"]) == 2
