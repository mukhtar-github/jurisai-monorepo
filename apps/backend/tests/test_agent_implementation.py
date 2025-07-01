"""
Test agent implementation functionality
"""
import pytest
import asyncio
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session

from src.services.agents.document_analyzer import DocumentAnalysisAgent, AgentTaskContext, create_analysis_task
from src.services.feature_flags import FeatureFlagService
from src.models.document import LegalDocument
from src.models.agent_task import AgentTask


@pytest.fixture
def mock_feature_flags():
    """Mock feature flags service."""
    mock_service = Mock(spec=FeatureFlagService)
    mock_service.is_enabled.return_value = True
    return mock_service


@pytest.fixture
def sample_document(db_session: Session):
    """Create a sample legal document for testing."""
    document = LegalDocument(
        title="Test Contract",
        content="""
        AGREEMENT

        This agreement is entered into between Party A and Party B.
        
        WHEREAS, Party A desires to engage Party B for services;
        WHEREAS, Party B agrees to provide such services;
        
        NOW THEREFORE, the parties agree as follows:
        
        1. SERVICES: Party B shall provide consulting services.
        2. COMPENSATION: Party A shall pay Party B $10,000.
        3. TERMINATION: Either party may terminate with 30 days notice.
        4. GOVERNING LAW: This agreement shall be governed by Lagos State law.
        
        IN WITNESS WHEREOF, the parties have executed this agreement.
        """,
        document_type="contract",
        metadata={}
    )
    
    db_session.add(document)
    db_session.commit()
    db_session.refresh(document)
    
    return document


def test_create_analysis_task(db_session: Session, sample_document):
    """Test creating an analysis task."""
    task = create_analysis_task(
        db=db_session,
        user_id=None,
        document_id=sample_document.id,
        parameters={"max_summary_length": 300}
    )
    
    assert task.agent_type == "document_analyzer"
    assert task.status == "pending"
    assert task.document_id == sample_document.id
    assert task.parameters == {"max_summary_length": 300}


@pytest.mark.asyncio
async def test_document_analysis_agent_initialization(db_session: Session, mock_feature_flags):
    """Test document analysis agent initialization."""
    agent = DocumentAnalysisAgent(db_session, mock_feature_flags)
    
    assert agent.agent_type == "document_analyzer"
    assert agent.db == db_session
    assert agent.feature_flags == mock_feature_flags


@pytest.mark.asyncio 
async def test_enhanced_entity_extraction(db_session: Session, mock_feature_flags):
    """Test enhanced entity extraction."""
    agent = DocumentAnalysisAgent(db_session, mock_feature_flags)
    
    text = """
    This agreement between ABC Corp and XYZ Ltd was signed on 2023-01-15.
    The total amount is $50,000. The agreement is governed by Lagos State law.
    Case reference: [2020] LPELR 12345
    """
    
    entities = await agent._enhanced_entity_extraction(text)
    
    assert "dates" in entities
    assert "monetary_amounts" in entities
    assert "case_citations" in entities
    assert len(entities["dates"]) > 0
    assert len(entities["monetary_amounts"]) > 0


@pytest.mark.asyncio
async def test_document_classification(db_session: Session, mock_feature_flags):
    """Test document type classification."""
    agent = DocumentAnalysisAgent(db_session, mock_feature_flags)
    
    # Test contract classification
    contract_text = "This agreement is between parties, whereas the consideration..."
    doc_type = await agent._classify_document_type(contract_text)
    assert doc_type == "contract"
    
    # Test judgment classification
    judgment_text = "The court held that the plaintiff was entitled to damages..."
    doc_type = await agent._classify_document_type(judgment_text)
    assert doc_type == "court_judgment"


@pytest.mark.asyncio
async def test_risk_assessment(db_session: Session, mock_feature_flags):
    """Test document risk assessment."""
    agent = DocumentAnalysisAgent(db_session, mock_feature_flags)
    
    # High-risk text
    high_risk_text = """
    The contractor shall have unlimited liability for damages and penalties.
    Termination may occur immediately upon any breach or default.
    """
    
    risk_analysis = await agent._assess_document_risks(high_risk_text)
    
    assert "risk_level" in risk_analysis
    assert "risk_factors" in risk_analysis
    assert "recommendations" in risk_analysis
    assert risk_analysis["risk_level"] in ["low", "medium", "high"]


@pytest.mark.asyncio
async def test_confidence_calculation(db_session: Session, mock_feature_flags):
    """Test confidence score calculation."""
    agent = DocumentAnalysisAgent(db_session, mock_feature_flags)
    
    # Good results should have high confidence
    good_results = {
        "summary": {"text": "This is a good summary"},
        "entities": {"parties": ["ABC Corp"], "dates": ["2023-01-01"]},
        "document_type": "contract",
        "risk_analysis": {"risk_level": "low"}
    }
    
    confidence = agent._calculate_confidence(good_results)
    assert 0.5 <= confidence <= 1.0
    
    # Poor results should have lower confidence
    poor_results = {}
    confidence = agent._calculate_confidence(poor_results)
    assert confidence == 0.5


@pytest.mark.asyncio
async def test_full_document_analysis(db_session: Session, sample_document, mock_feature_flags):
    """Test complete document analysis workflow."""
    agent = DocumentAnalysisAgent(db_session, mock_feature_flags)
    
    # Create task
    task = create_analysis_task(
        db=db_session,
        user_id=None,
        document_id=sample_document.id,
        parameters={"max_summary_length": 200}
    )
    
    # Create context
    context = AgentTaskContext(
        task_id=task.id,
        user_id=task.user_id,
        document_id=task.document_id,
        parameters=task.parameters
    )
    
    # Mock the summarizer to avoid OpenAI API calls in tests
    with patch.object(agent, '_generate_summary') as mock_summary:
        mock_summary.return_value = {
            "text": "Test summary of the contract",
            "max_length": 200
        }
        
        # Run analysis
        result = await agent.analyze_document(context)
        
        # Verify results
        assert result["status"] == "completed"
        assert result["task_id"] == task.id
        assert result["agent_type"] == "document_analyzer"
        assert "results" in result
        assert "confidence" in result
        
        # Check task was updated
        updated_task = db_session.query(AgentTask).filter(AgentTask.id == task.id).first()
        assert updated_task.status == "completed"
        assert updated_task.results is not None
        assert updated_task.confidence is not None