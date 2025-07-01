"""
Tests for agent system implementation.
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

from src.models.agent_task import AgentTask, AgentTaskStatus, AgentType, TaskType
from src.services.agents.document_analyzer import DocumentAnalysisAgent, AgentTaskContext
from src.services.agent_service import AgentService


@pytest.fixture
def mock_db_session():
    """Mock database session."""
    return Mock()


@pytest.fixture
def mock_legal_document():
    """Mock legal document."""
    doc = Mock()
    doc.id = 1
    doc.content = "This is a sample legal contract between Party A and Party B."
    doc.document_type = "contract"
    doc.summary = "Sample contract summary"
    doc.word_count = 100
    return doc


@pytest.fixture
def mock_user():
    """Mock user."""
    user = Mock()
    user.id = 1
    user.name = "Test User"
    user.email = "test@example.com"
    return user


class TestAgentTask:
    """Test AgentTask model."""
    
    def test_agent_task_creation(self):
        """Test creating an agent task."""
        task = AgentTask(
            document_id=1,
            user_id=1,
            agent_type=AgentType.DOCUMENT_ANALYZER.value,
            task_type=TaskType.DOCUMENT_ANALYSIS.value,
            parameters={"test": "value"}
        )
        
        assert task.document_id == 1
        assert task.user_id == 1
        assert task.agent_type == AgentType.DOCUMENT_ANALYZER.value
        assert task.task_type == TaskType.DOCUMENT_ANALYSIS.value
        assert task.status == AgentTaskStatus.PENDING.value
        assert task.parameters == {"test": "value"}
    
    def test_task_start_processing(self):
        """Test starting task processing."""
        task = AgentTask(
            document_id=1,
            user_id=1,
            agent_type=AgentType.DOCUMENT_ANALYZER.value,
            task_type=TaskType.DOCUMENT_ANALYSIS.value
        )
        
        task.start_processing()
        
        assert task.status == AgentTaskStatus.PROCESSING.value
        assert task.started_at is not None
    
    def test_task_complete_successfully(self):
        """Test completing task successfully."""
        task = AgentTask(
            document_id=1,
            user_id=1,
            agent_type=AgentType.DOCUMENT_ANALYZER.value,
            task_type=TaskType.DOCUMENT_ANALYSIS.value
        )
        
        task.start_processing()
        result = {"summary": "Test summary", "entities": {}}
        task.complete_successfully(result, confidence_score=0.85)
        
        assert task.status == AgentTaskStatus.COMPLETED.value
        assert task.result == result
        assert task.confidence_score == 0.85
        assert task.completed_at is not None
        assert task.is_successful
        assert task.is_completed
    
    def test_task_fail_with_error(self):
        """Test failing task with error."""
        task = AgentTask(
            document_id=1,
            user_id=1,
            agent_type=AgentType.DOCUMENT_ANALYZER.value,
            task_type=TaskType.DOCUMENT_ANALYSIS.value
        )
        
        task.start_processing()
        task.fail_with_error("Test error message")
        
        assert task.status == AgentTaskStatus.FAILED.value
        assert task.error_message == "Test error message"
        assert task.completed_at is not None
        assert not task.is_successful
        assert task.is_completed
    
    def test_task_to_dict(self):
        """Test converting task to dictionary."""
        task = AgentTask(
            document_id=1,
            user_id=1,
            agent_type=AgentType.DOCUMENT_ANALYZER.value,
            task_type=TaskType.DOCUMENT_ANALYSIS.value,
            parameters={"test": "value"}
        )
        
        task_dict = task.to_dict()
        
        assert isinstance(task_dict, dict)
        assert task_dict['document_id'] == 1
        assert task_dict['user_id'] == 1
        assert task_dict['agent_type'] == AgentType.DOCUMENT_ANALYZER.value
        assert task_dict['task_type'] == TaskType.DOCUMENT_ANALYSIS.value
        assert task_dict['parameters'] == {"test": "value"}


class TestDocumentAnalysisAgent:
    """Test DocumentAnalysisAgent."""
    
    @pytest.mark.asyncio
    async def test_enhanced_entity_extraction(self, mock_db_session):
        """Test enhanced entity extraction."""
        agent = DocumentAnalysisAgent(mock_db_session)
        
        text = "This agreement is between John Doe and ACME Corp, effective January 1, 2024."
        entities = await agent._enhanced_entity_extraction(text)
        
        assert isinstance(entities, dict)
        assert 'parties' in entities
        assert 'dates' in entities
        assert 'monetary_amounts' in entities
        assert 'legal_references' in entities
        assert 'locations' in entities
    
    @pytest.mark.asyncio
    async def test_classify_document_type(self, mock_db_session):
        """Test document type classification."""
        agent = DocumentAnalysisAgent(mock_db_session)
        
        # Test contract classification
        contract_text = "This contract hereby establishes an agreement between the parties"
        doc_type = await agent._classify_document_type(contract_text, None)
        assert doc_type == 'contract'
        
        # Test existing type preservation
        doc_type = await agent._classify_document_type(contract_text, 'existing_type')
        assert doc_type == 'existing_type'
    
    @pytest.mark.asyncio
    async def test_assess_document_risks(self, mock_db_session):
        """Test document risk assessment."""
        agent = DocumentAnalysisAgent(mock_db_session)
        
        high_risk_text = "This contract includes penalty clauses and liquidated damages provisions"
        risk_analysis = await agent._assess_document_risks(high_risk_text)
        
        assert isinstance(risk_analysis, dict)
        assert 'risk_level' in risk_analysis
        assert 'risk_factors' in risk_analysis
        assert 'recommendations' in risk_analysis
        assert risk_analysis['risk_level'] == 'high'
    
    def test_extract_parties(self, mock_db_session):
        """Test party extraction."""
        agent = DocumentAnalysisAgent(mock_db_session)
        
        text = "Agreement between John Smith and ACME Corporation"
        parties = agent._extract_parties(text)
        
        assert isinstance(parties, list)
        # Basic test - in production this would be more sophisticated
    
    def test_extract_dates(self, mock_db_session):
        """Test date extraction."""
        agent = DocumentAnalysisAgent(mock_db_session)
        
        text = "Effective date: 01/15/2024 and expiry on December 31, 2025"
        dates = agent._extract_dates(text)
        
        assert isinstance(dates, list)
    
    def test_extract_amounts(self, mock_db_session):
        """Test monetary amount extraction."""
        agent = DocumentAnalysisAgent(mock_db_session)
        
        text = "Payment of ₦1,000,000 and additional $500.00 fee"
        amounts = agent._extract_amounts(text)
        
        assert isinstance(amounts, list)
    
    def test_calculate_confidence(self, mock_db_session):
        """Test confidence calculation."""
        agent = DocumentAnalysisAgent(mock_db_session)
        
        results = {
            'summary': 'Test summary',
            'entities': {'parties': ['Party A', 'Party B']},
            'document_type': 'contract',
            'risk_analysis': {'risk_factors': ['some risk']}
        }
        
        confidence = agent._calculate_confidence(results)
        
        assert isinstance(confidence, float)
        assert 0.0 <= confidence <= 1.0


class TestAgentService:
    """Test AgentService."""
    
    def test_get_available_agents(self, mock_db_session):
        """Test getting available agents."""
        service = AgentService(mock_db_session)
        
        agents = service.get_available_agents()
        
        assert isinstance(agents, dict)
        assert AgentType.DOCUMENT_ANALYZER.value in agents
        
        doc_analyzer = agents[AgentType.DOCUMENT_ANALYZER.value]
        assert doc_analyzer['name'] == 'Document Analysis Agent'
        assert doc_analyzer['available'] is True
        assert TaskType.DOCUMENT_ANALYSIS.value in doc_analyzer['supported_tasks']
    
    def test_get_agent_capabilities(self, mock_db_session):
        """Test getting agent capabilities."""
        service = AgentService(mock_db_session)
        
        capabilities = service.get_agent_capabilities(AgentType.DOCUMENT_ANALYZER.value)
        
        assert isinstance(capabilities, dict)
        assert 'features' in capabilities
        assert 'supported_document_types' in capabilities
        assert 'processing_time' in capabilities
        assert 'confidence_scoring' in capabilities
        
        # Test invalid agent type
        invalid_capabilities = service.get_agent_capabilities('invalid_agent')
        assert invalid_capabilities is None


@pytest.mark.asyncio
async def test_agent_task_context():
    """Test AgentTaskContext dataclass."""
    context = AgentTaskContext(
        task_id="test-task-id",
        user_id=1,
        document_id=1,
        parameters={"test": "value"},
        db_session=Mock()
    )
    
    assert context.task_id == "test-task-id"
    assert context.user_id == 1
    assert context.document_id == 1
    assert context.parameters == {"test": "value"}
    assert context.db_session is not None


def test_agent_enums():
    """Test agent-related enums."""
    # Test AgentType enum
    assert AgentType.DOCUMENT_ANALYZER.value == "document_analyzer"
    assert AgentType.LEGAL_RESEARCHER.value == "legal_researcher"
    
    # Test TaskType enum
    assert TaskType.DOCUMENT_ANALYSIS.value == "document_analysis"
    assert TaskType.LEGAL_RESEARCH.value == "legal_research"
    
    # Test AgentTaskStatus enum
    assert AgentTaskStatus.PENDING.value == "pending"
    assert AgentTaskStatus.PROCESSING.value == "processing"
    assert AgentTaskStatus.COMPLETED.value == "completed"
    assert AgentTaskStatus.FAILED.value == "failed"
    assert AgentTaskStatus.CANCELLED.value == "cancelled"


class TestAgentIntegration:
    """Integration tests for agent system."""
    
    def test_agent_model_relationships(self):
        """Test that models can be imported without circular dependencies."""
        from src.models.agent_task import AgentTask
        from src.models.user import User
        from src.models.document import LegalDocument
        
        # Test that imports work
        assert AgentTask is not None
        assert User is not None
        assert LegalDocument is not None
    
    def test_service_factory_functions(self, mock_db_session):
        """Test service factory functions."""
        from src.services.agents.document_analyzer import get_document_analysis_agent
        from src.services.agent_service import get_agent_service
        
        # Test factory functions work
        agent = get_document_analysis_agent(mock_db_session)
        assert isinstance(agent, DocumentAnalysisAgent)
        
        service = get_agent_service(mock_db_session)
        assert isinstance(service, AgentService)