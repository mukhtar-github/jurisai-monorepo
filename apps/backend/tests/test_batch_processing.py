"""
Tests for the batch document processing functionality.
"""
import pytest
from unittest.mock import patch, MagicMock
from io import BytesIO
import json
from fastapi import status, Depends, APIRouter
from datetime import timezone, datetime

from src.main import app
from src.models.document import LegalDocument
from src.core.database import get_db
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from tests.conftest import client

# Create test files for batch uploads
@pytest.fixture
def sample_files():
    """Create sample files for testing batch upload."""
    file1 = BytesIO(b"This is the content of test file 1.")
    file1.name = "test1.txt"
    file2 = BytesIO(b"This is the content of test file 2.")
    file2.name = "test2.txt"
    return [file1, file2]

# Test the batch upload endpoint
def test_batch_upload_documents(sample_files, client):
    """Test the batch document upload endpoint."""
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
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "batch_id" in data
    assert "document_count" in data
    assert data["document_count"] == 2
    assert data["document_type"] == "case_law"
    assert data["jurisdiction"] == "US"
    assert data["ai_processing_enabled"] is True
    assert data["auto_analyze_enabled"] is False

# Mock functions for batch status testing
async def mock_batch_status_pending(batch_id: str):
    """Mock function for pending batch status."""
    return {
        "batch_id": batch_id,
        "status": "pending",
        "documents_processed": 0,
        "total_documents": 0,
        "started_at": None,
    }

async def mock_batch_status_in_progress(batch_id: str):
    """Mock function for in-progress batch status."""
    return {
        "batch_id": batch_id,
        "status": "in_progress",
        "documents": {
            "total": 2,
            "processed": 1,
            "failed": 0,
            "analyzed": 0
        },
        "started_at": "2025-03-07T10:00:00",
        "completed_at": None,
        "document_ids": [1, 2]
    }

async def mock_batch_status_completed(batch_id: str):
    """Mock function for completed batch status."""
    return {
        "batch_id": batch_id,
        "status": "completed",
        "documents": {
            "total": 2,
            "processed": 2,
            "failed": 0,
            "analyzed": 2
        },
        "started_at": "2025-03-07T10:00:00",
        "completed_at": "2025-03-07T10:01:30",
        "document_ids": [1, 2]
    }

async def mock_batch_status_failed(batch_id: str):
    """Mock function for failed batch status."""
    return {
        "batch_id": batch_id,
        "status": "failed",
        "documents": {
            "total": 2,
            "processed": 0,
            "failed": 2,
            "analyzed": 0
        },
        "started_at": "2025-03-07T10:00:00",
        "completed_at": None,
        "document_ids": [1, 2]
    }

# Test batch status endpoints with dependency overrides
@patch("src.routes.documents.get_batch_status", side_effect=mock_batch_status_pending)
def test_batch_status_pending(mock_get_batch_status, client):
    """Test the batch status endpoint when no documents are found."""
    response = client.get("/documents/batch-status/test_batch_id")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["batch_id"] == "test_batch_id"
    assert data["status"] == "pending"
    assert data["documents_processed"] == 0
    assert data["total_documents"] == 0
    assert data["started_at"] is None

@patch("src.routes.documents.get_batch_status", side_effect=mock_batch_status_in_progress)
def test_batch_status_in_progress(mock_get_batch_status, client):
    """Test the batch status endpoint when processing is in progress."""
    response = client.get("/documents/batch-status/test_batch_id")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["batch_id"] == "test_batch_id"
    assert data["status"] == "in_progress"
    assert data["documents"]["total"] == 2
    assert data["documents"]["processed"] == 1
    assert data["documents"]["failed"] == 0
    assert data["started_at"] == "2025-03-07T10:00:00"
    assert data["completed_at"] is None

@patch("src.routes.documents.get_batch_status", side_effect=mock_batch_status_completed)
def test_batch_status_completed(mock_get_batch_status, client):
    """Test the batch status endpoint when processing is completed."""
    response = client.get("/documents/batch-status/test_batch_id")
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

@patch("src.routes.documents.get_batch_status", side_effect=mock_batch_status_failed)
def test_batch_status_failed(mock_get_batch_status, client):
    """Test the batch status endpoint when processing has failed."""
    response = client.get("/documents/batch-status/test_batch_id")
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
