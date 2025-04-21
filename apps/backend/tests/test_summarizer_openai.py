"""
Test the OpenAI integration with the legal document summarizer.
"""

import os
import pytest
from unittest.mock import patch, AsyncMock
from fastapi import HTTPException

from src.services.legal_summarizer import LegalDocumentSummarizer


@pytest.fixture
def summarizer():
    """Create a test instance of the legal document summarizer."""
    # Use a test model name
    return LegalDocumentSummarizer(model_name="test-model")


@pytest.mark.asyncio
async def test_call_summarization_api_success(summarizer):
    """Test successful API call to OpenAI."""
    # Mock the httpx AsyncClient
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [{"message": {"content": "This is a test summary."}}]
    }
    
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value.post.return_value = mock_response
    
    # Mock environment variables
    with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await summarizer._call_summarization_api("Test prompt", 100)
            
    assert result == "This is a test summary."
    # Verify the API was called with correct parameters
    _, kwargs = mock_client.__aenter__.return_value.post.call_args
    assert kwargs["headers"]["Authorization"] == "Bearer test-key"
    assert kwargs["json"]["max_tokens"] == 100


@pytest.mark.asyncio
async def test_call_summarization_api_no_api_key(summarizer):
    """Test fallback when no API key is available."""
    # Mock the environment without API key
    with patch.dict(os.environ, {}, clear=True):
        with patch.object(summarizer, "_generate_extractive_summary_fallback", 
                          return_value="Fallback summary"):
            result = await summarizer._call_summarization_api("Test prompt", 100)
    
    assert result == "Fallback summary"


@pytest.mark.asyncio
async def test_call_summarization_api_error(summarizer):
    """Test error handling when API call fails."""
    # Mock the httpx AsyncClient with error response
    mock_response = AsyncMock()
    mock_response.status_code = 500
    mock_response.text = "Server error"
    
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value.post.return_value = mock_response
    
    # Mock environment variables and fallback method
    with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
        with patch("httpx.AsyncClient", return_value=mock_client):
            with patch.object(summarizer, "_generate_extractive_summary_fallback", 
                             return_value="Fallback summary"):
                result = await summarizer._call_summarization_api("Test prompt", 100)
                
    assert result == "Fallback summary"


def test_extractive_summary_fallback(summarizer):
    """Test the extractive summary fallback method."""
    prompt = "Summarize this text: First sentence. Second sentence. Third very long sentence with details."
    result = summarizer._generate_extractive_summary_fallback(prompt, 30)
    
    # Should extract just enough sentences to fit in max_length
    assert "First sentence. Second sentence." in result
    assert len(result) <= 30
