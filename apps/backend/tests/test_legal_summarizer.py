"""
Tests for the legal document summarizer service.
"""

import pytest
from unittest.mock import patch, MagicMock

from src.services.legal_summarizer import LegalDocumentSummarizer


@pytest.fixture
def legal_summarizer():
    """Create a test instance of the LegalDocumentSummarizer"""
    return LegalDocumentSummarizer()


@pytest.fixture
def sample_legal_document():
    """Sample Nigerian legal document for testing"""
    return """
    IN THE SUPREME COURT OF NIGERIA
    HOLDEN AT ABUJA
    ON FRIDAY, THE 11TH DAY OF FEBRUARY, 2022
    BEFORE THEIR LORDSHIPS
    
    BETWEEN:
    JOHN DOE                                   ... APPELLANT
    AND
    JANE DOE                                   ... RESPONDENT
    
    JUDGMENT
    This is an appeal against the decision of the Court of Appeal, Lagos Division, 
    delivered on the 15th day of January, 2021 in Appeal No. CA/L/142/2019. The Appellant 
    challenges the interpretation of Section 24 of the Contract Law as applied in the case.
    
    FACTS
    The Appellant and the Respondent entered into a contract dated May 10, 2018, for the 
    sale of property located at 123 Lagos Street. According to the terms, payment was to be 
    completed within 90 days of signing. The Respondent claims full payment was made, while 
    the Appellant disputes receiving the final installment of N5,000,000.
    
    Suit No. FHC/L/123/2018 was filed at the Federal High Court, Lagos, which found in favor 
    of the Respondent, citing [2015] 7 NWLR 256 as precedent.
    
    ISSUES FOR DETERMINATION
    1. Whether the Court of Appeal was correct in its interpretation of Section 24 of the Contract Law
    2. Whether evidence of bank transfers constitutes proof of payment under Nigerian law
    
    HELD
    After careful consideration of the arguments and evidence presented, this Court holds that:
    
    1. The Court of Appeal correctly interpreted Section 24 of the Contract Law. The provision 
    clearly states that evidence of electronic transfer approved by the receiving bank constitutes 
    proof of payment. This position is supported by previous decisions in [2019] LPELR 12345 and 
    (2020) 15 NWLR 123.
    
    2. The bank statements tendered by the Respondent, which were duly certified by the bank, 
    constitute sufficient proof of payment under Section 89(e) of the Evidence Act, 2011.
    
    It is therefore the judgment of this Court that the appeal lacks merit and is hereby dismissed.
    
    The judgment of the Court of Appeal is affirmed.
    
    Parties shall bear their respective costs.
    
    JUDGMENT DELIVERED BY
    Justice A. B. Mohammed, JSC
    """


def test_preprocess_document(legal_summarizer, sample_legal_document):
    """Test document preprocessing"""
    result = legal_summarizer.preprocess_document(sample_legal_document)
    
    # Check that sections were properly identified
    assert 'sections' in result
    assert len(result['sections']) > 0
    
    # Check that citations were properly extracted
    assert 'citations' in result
    assert len(result['citations']) >= 3  # Should find at least 3 citations
    assert any('[2019] LPELR 12345' in citation for citation in result['citations'])
    
    # Check that metadata was extracted
    assert 'metadata' in result
    assert result['metadata']['court'] == 'SUPREME COURT OF NIGERIA'


def test_extract_citations(legal_summarizer, sample_legal_document):
    """Test citation extraction"""
    citations = legal_summarizer._extract_citations(sample_legal_document)
    
    # Check that all citation formats are detected
    assert len(citations) >= 3
    assert any('[2015] 7 NWLR 256' in citation for citation in citations)
    assert any('[2019] LPELR 12345' in citation for citation in citations)
    assert any('(2020) 15 NWLR 123' in citation for citation in citations)


def test_split_into_sections(legal_summarizer, sample_legal_document):
    """Test document splitting into sections"""
    sections = legal_summarizer._split_into_sections(sample_legal_document)
    
    # Check that all major sections are found
    section_titles = [s['title'] for s in sections]
    
    assert 'JUDGMENT' in section_titles
    assert 'FACTS' in section_titles
    assert 'HELD' in section_titles
    assert 'ISSUES FOR DETERMINATION' in section_titles


def test_is_relevant_to_focus(legal_summarizer):
    """Test focus area relevance checking"""
    section_contract = {
        'title': 'ANALYSIS',
        'content': 'This case concerns contract law and payment obligations.'
    }
    
    section_evidence = {
        'title': 'EVIDENCE',
        'content': 'The evidence presented includes bank statements and witness testimony.'
    }
    
    # Check that relevance detection works properly
    assert legal_summarizer._is_relevant_to_focus(section_contract, 'contract law')
    assert legal_summarizer._is_relevant_to_focus(section_contract, 'payment')
    assert not legal_summarizer._is_relevant_to_focus(section_contract, 'criminal')
    
    assert legal_summarizer._is_relevant_to_focus(section_evidence, 'evidence')
    assert legal_summarizer._is_relevant_to_focus(section_evidence, 'bank statements')
    assert not legal_summarizer._is_relevant_to_focus(section_evidence, 'property')


@pytest.mark.asyncio
async def test_generate_extractive_summaries(legal_summarizer, sample_legal_document):
    """Test fallback extractive summarization"""
    sections = legal_summarizer._split_into_sections(sample_legal_document)
    summaries = legal_summarizer._generate_extractive_summaries(sections, 500)
    
    # Check that summaries were generated for each section
    assert len(summaries) == len(sections)
    
    # Check that summaries aren't too long
    total_length = sum(len(s) for s in summaries)
    assert total_length <= 500 + 100  # Allow some buffer for the algorithm


@pytest.mark.asyncio
async def test_summarize_with_focus(legal_summarizer, sample_legal_document):
    """Test summarization with focus area"""
    with patch.object(
        legal_summarizer, '_call_summarization_api',
        return_value="The court held that evidence of electronic transfer approved by the receiving bank constitutes proof of payment."
    ):
        result = await legal_summarizer.summarize(
            sample_legal_document,
            max_length=300,
            focus_area="payment evidence"
        )
        
        # Check that summary was generated
        assert result['summary']
        assert len(result['summary']) <= 500  # Allow some buffer
        
        # Check that key points were extracted
        assert result['key_points']
        
        # Check that citations were preserved
        assert result['citations']


@pytest.mark.asyncio
async def test_summarize_empty_document(legal_summarizer):
    """Test summarization with empty document"""
    with pytest.raises(ValueError):
        await legal_summarizer.summarize("", max_length=300)


@pytest.mark.asyncio
async def test_ensure_citations_preserved(legal_summarizer):
    """Test citation preservation in summaries"""
    summary = "The court dismissed the appeal."
    citations = ["[2019] LPELR 12345", "(2020) 15 NWLR 123"]
    
    result = legal_summarizer._ensure_citations_preserved(summary, citations)
    
    # Check that citations were added to the summary
    assert all(citation in result for citation in citations)
