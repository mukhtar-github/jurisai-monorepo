"""
Tests for the batch document processing functionality.
"""
import pytest
from unittest.mock import patch, MagicMock
from io import BytesIO
import json
from fastapi import status
from datetime import timezone, datetime

from src.main import app
from src.models.document import LegalDocument
from tests.conftest import client

@pytest.fixture
def sample_files():
    """Create sample files for testing batch upload."""
    file1 = BytesIO(b"This is the content of test file 1.")
    file1.name = "test1.txt"
    file2 = BytesIO(b"This is the content of test file 2.")
    file2.name = "test2.txt"
    return [file1, file2]

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

# Create a separate test module for batch status endpoint testing
@pytest.mark.skip(reason="Will be implemented as integration tests against PostgreSQL")
def test_batch_status_endpoints():
    """Placeholder for future integration tests against PostgreSQL."""
    pass
