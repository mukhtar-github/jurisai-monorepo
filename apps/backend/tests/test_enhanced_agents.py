"""
Test enhanced agent routes with user authentication
"""
import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.main import app
from src.models.user import User
from src.models.document import LegalDocument
from src.models.agent_task import AgentTask
from src.routes.auth import create_access_token


@pytest.fixture
def test_user(db_session: Session):
    """Create a test user."""
    user = User(
        name="Test User",
        email="test@example.com",
        hashed_password="hashed_password",
        role="user"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_user_token(test_user):
    """Create JWT token for test user."""
    return create_access_token(data={"sub": test_user.email})


@pytest.fixture
def test_document(db_session: Session, test_user):
    """Create a test document owned by test user."""
    document = LegalDocument(
        title="Test Contract",
        content="This is a test contract document.",
        document_type="contract",
        owner_id=test_user.id
    )
    db_session.add(document)
    db_session.commit()
    db_session.refresh(document)
    return document


@pytest.fixture
def other_user_document(db_session: Session):
    """Create a document owned by another user."""
    other_user = User(
        name="Other User",
        email="other@example.com", 
        hashed_password="hashed_password",
        role="user"
    )
    db_session.add(other_user)
    db_session.commit()
    
    document = LegalDocument(
        title="Other User's Document",
        content="This document belongs to another user.",
        document_type="contract",
        owner_id=other_user.id
    )
    db_session.add(document)
    db_session.commit()
    db_session.refresh(document)
    return document


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


def test_analyze_document_with_authentication(client, test_document, test_user_token):
    """Test document analysis with proper authentication."""
    headers = {"Authorization": f"Bearer {test_user_token}"}
    
    response = client.post(
        f"/api/v1/agents/analyze-document/{test_document.id}",
        json={"parameters": {"max_summary_length": 300}},
        headers=headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["agent_enabled"] in [True, False]
    assert "message" in data
    assert data["status"] in ["processing", "completed"]


def test_analyze_document_without_authentication(client, test_document):
    """Test that document analysis requires authentication."""
    response = client.post(
        f"/api/v1/agents/analyze-document/{test_document.id}",
        json={"parameters": {"max_summary_length": 300}}
    )
    
    assert response.status_code == 401


def test_analyze_document_access_denied(client, other_user_document, test_user_token):
    """Test that users can't analyze documents they don't own."""
    headers = {"Authorization": f"Bearer {test_user_token}"}
    
    response = client.post(
        f"/api/v1/agents/analyze-document/{other_user_document.id}",
        json={"parameters": {"max_summary_length": 300}},
        headers=headers
    )
    
    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]


def test_analyze_nonexistent_document(client, test_user_token):
    """Test analyzing a document that doesn't exist."""
    headers = {"Authorization": f"Bearer {test_user_token}"}
    
    response = client.post(
        "/api/v1/agents/analyze-document/99999",
        json={"parameters": {"max_summary_length": 300}},
        headers=headers
    )
    
    assert response.status_code == 404
    assert "Document not found" in response.json()["detail"]


def test_get_user_documents(client, test_document, test_user_token):
    """Test getting user's documents."""
    headers = {"Authorization": f"Bearer {test_user_token}"}
    
    response = client.get("/api/v1/agents/my-documents", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["data"]) >= 1
    assert data["data"][0]["id"] == test_document.id
    assert data["data"][0]["title"] == test_document.title


def test_get_user_documents_without_auth(client):
    """Test that getting user documents requires authentication."""
    response = client.get("/api/v1/agents/my-documents")
    
    assert response.status_code == 401


def test_agent_health_check(client, test_user_token):
    """Test agent health check endpoint."""
    headers = {"Authorization": f"Bearer {test_user_token}"}
    
    response = client.get("/api/v1/agents/health", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "user_id" in data
    assert "agent_features" in data
    assert "document_analysis_agent" in data["agent_features"]


def test_get_user_tasks(client, test_user_token):
    """Test getting user's agent tasks."""
    headers = {"Authorization": f"Bearer {test_user_token}"}
    
    response = client.get("/api/v1/agents/tasks", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_task_status_access_control(client, db_session, test_user, test_user_token):
    """Test that users can only access their own tasks."""
    # Create a task for the test user
    task = AgentTask(
        id="test-task-123",
        agent_type="document_analyzer",
        status="completed",
        user_id=test_user.id,
        document_id=1,
        results={"summary": "Test result"}
    )
    db_session.add(task)
    db_session.commit()
    
    headers = {"Authorization": f"Bearer {test_user_token}"}
    
    # User can access their own task
    response = client.get(f"/api/v1/agents/tasks/{task.id}/status", headers=headers)
    assert response.status_code == 200
    
    # Create task for another user
    other_user = User(
        name="Other User 2",
        email="other2@example.com",
        hashed_password="hashed_password",
        role="user"
    )
    db_session.add(other_user)
    db_session.commit()
    
    other_task = AgentTask(
        id="other-task-456",
        agent_type="document_analyzer", 
        status="completed",
        user_id=other_user.id,
        document_id=1,
        results={"summary": "Other user's result"}
    )
    db_session.add(other_task)
    db_session.commit()
    
    # User cannot access other user's task
    response = client.get(f"/api/v1/agents/tasks/{other_task.id}/status", headers=headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_feature_flag_integration(client, test_document, test_user_token):
    """Test feature flag integration in enhanced routes."""
    headers = {"Authorization": f"Bearer {test_user_token}"}
    
    # Mock feature flags to disable agent
    with patch('src.routes.agents_enhanced.get_feature_flag_service') as mock_ff:
        mock_service = Mock()
        mock_service.is_enabled_async.return_value = False
        mock_ff.return_value = mock_service
        
        response = client.post(
            f"/api/v1/agents/analyze-document/{test_document.id}",
            json={"parameters": {"max_summary_length": 300}},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["agent_enabled"] is False
        assert data["status"] == "completed"
        assert "legacy" in data.get("result", {}).get("analysis_type", "")


def test_api_versioning(client, test_user_token):
    """Test that API versioning is properly implemented."""
    headers = {"Authorization": f"Bearer {test_user_token}"}
    
    # Test that the versioned endpoint exists
    response = client.get("/api/v1/agents/health", headers=headers)
    assert response.status_code == 200
    
    # Test that health endpoint shows proper API structure
    data = response.json()
    assert "status" in data
    assert data["status"] == "healthy"