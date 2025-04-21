"""
Routes for document summarization in the JurisAI API.
"""

import logging
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.core.cache import cache_response
from src.core.database import get_db
from src.models.document import LegalDocument
from src.services.document_processor import document_processor
from src.services.legal_summarizer import legal_summarizer

# Import the legacy summarizer for backward compatibility
try:
    from libs.ai_models.src.summarization import LegalDocumentSummarizer

    # Initialize the summarizer with a small model for faster loading
    legacy_summarizer = LegalDocumentSummarizer(model_name="facebook/bart-large-cnn")
    AI_SUMMARIZATION_AVAILABLE = True
except ImportError:
    logging.warning(
        "Legacy AI summarization module not available. Using new legal summarizer module."
    )
    legacy_summarizer = None
    AI_SUMMARIZATION_AVAILABLE = True  # We now have our own implementation

# Create router
router = APIRouter(prefix="/summarization", tags=["summarization"])


class SummaryResponse(BaseModel):
    """Schema for summary response"""
    document_id: Optional[int] = None
    title: Optional[str] = None
    summary: str
    key_points: List[str] = Field(default_factory=list)
    citations: List[str] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = None
    summary_type: str
    original_length: int
    summary_length: int
    ai_used: bool


class OpenAITestResponse(BaseModel):
    """Response schema for OpenAI integration test"""
    success: bool
    model: str
    message: str
    response_text: Optional[str] = None
    error: Optional[str] = None


@router.get("/test", response_model=OpenAITestResponse)
async def test_openai_integration(query: str = Query("Test the OpenAI integration")):
    """
    Test the OpenAI integration by generating a short response.
    
    This endpoint is used to verify that the OpenAI API key and model are correctly configured.
    
    Args:
        query: The text prompt to send to OpenAI
        
    Returns:
        OpenAITestResponse: Status of the OpenAI integration test
    """
    try:
        import os
        from openai import OpenAI
        
        # Check if OpenAI API key is configured
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return OpenAITestResponse(
                success=False, 
                model="none",
                message="OpenAI API key not configured",
                error="OPENAI_API_KEY environment variable is not set"
            )
        
        # Get the model name from environment or use a default
        model_name = os.environ.get("OPENAI_MODEL_NAME", "gpt-3.5-turbo")
        
        # Initialize OpenAI client
        client = OpenAI(api_key=api_key)
        
        # Make a simple query to test the connection
        completion = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that provides very brief responses."},
                {"role": "user", "content": query}
            ],
            max_tokens=50
        )
        
        # Extract the response text
        response_text = completion.choices[0].message.content
        
        return OpenAITestResponse(
            success=True,
            model=model_name,
            message="OpenAI integration is working correctly",
            response_text=response_text
        )
    
    except ImportError as e:
        return OpenAITestResponse(
            success=False,
            model="none",
            message="OpenAI package not installed",
            error=f"Import error: {str(e)}"
        )
    
    except Exception as e:
        return OpenAITestResponse(
            success=False,
            model=os.environ.get("OPENAI_MODEL_NAME", "unknown"),
            message="Failed to connect to OpenAI API",
            error=str(e)
        )


@router.post("/document/{document_id}", response_model=SummaryResponse)
@cache_response(expire=86400)  # Cache for 24 hours
async def summarize_document(
    document_id: int,
    max_length: Optional[int] = Body(500),
    min_length: Optional[int] = Body(100),
    use_ai: Optional[bool] = Body(True),
    focus_area: Optional[str] = Body(None),
    db: Session = Depends(get_db),
):
    """
    Generate a summary of a legal document.

    Args:
        document_id (int): ID of the document to summarize.
        max_length (int, optional): Maximum length of the summary in characters.
        min_length (int, optional): Minimum length of the summary in characters.
        use_ai (bool, optional): Whether to use AI for summarization.
        focus_area (str, optional): Optional area to focus the summary on.
        db (Session): Database session.

    Returns:
        SummaryResponse: Document summary with key points and citations.
    """
    document = db.query(LegalDocument).filter(LegalDocument.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Check if AI summarization is requested
    if use_ai:
        try:
            # Use our specialized legal document summarizer
            result = await document_processor.summarize(
                document.content, 
                max_length=max_length,
                focus_area=focus_area
            )
            
            return {
                "document_id": document.id,
                "title": document.title,
                "summary": result.get("summary", ""),
                "key_points": result.get("key_points", []),
                "citations": result.get("citations", []),
                "metadata": result.get("metadata", {}),
                "summary_type": "legal_abstractive",
                "original_length": len(document.content),
                "summary_length": len(result.get("summary", "")),
                "ai_used": True,
            }
        except Exception as e:
            logging.error(f"Error in legal document summarization: {e}")
            # Fall back to legacy summarizer or extractive summary
            if legacy_summarizer:
                try:
                    summary = legacy_summarizer.summarize(
                        document.content, max_length=max_length, min_length=min_length
                    )
                    summary_type = "legacy_abstractive"
                except:
                    summary = (
                        document.content[:max_length] + "..."
                        if len(document.content) > max_length
                        else document.content
                    )
                    summary_type = "extract"
            else:
                summary = (
                    document.content[:max_length] + "..."
                    if len(document.content) > max_length
                    else document.content
                )
                summary_type = "extract"
                
            return {
                "document_id": document.id,
                "title": document.title,
                "summary": summary,
                "key_points": [],
                "citations": [],
                "metadata": {},
                "summary_type": summary_type,
                "original_length": len(document.content),
                "summary_length": len(summary),
                "ai_used": summary_type != "extract",
            }
    else:
        # Simple extractive summary
        summary = (
            document.content[:max_length] + "..."
            if len(document.content) > max_length
            else document.content
        )
        
        return {
            "document_id": document.id,
            "title": document.title,
            "summary": summary,
            "key_points": [],
            "citations": [],
            "metadata": {},
            "summary_type": "extract",
            "original_length": len(document.content),
            "summary_length": len(summary),
            "ai_used": False,
        }


@router.post("/text", response_model=SummaryResponse)
async def summarize_text(
    text: str = Body(..., min_length=50),
    max_length: Optional[int] = Body(500),
    min_length: Optional[int] = Body(100),
    use_ai: Optional[bool] = Body(True),
    focus_area: Optional[str] = Body(None),
):
    """
    Generate a summary of a provided text.

    Args:
        text (str): Text to summarize (minimum 50 characters).
        max_length (int, optional): Maximum length of the summary in characters.
        min_length (int, optional): Minimum length of the summary in characters.
        use_ai (bool, optional): Whether to use AI for summarization.
        focus_area (str, optional): Optional area to focus the summary on.

    Returns:
        SummaryResponse: Text summary with key points and citations.
    """
    # Check if AI summarization is requested
    if use_ai:
        try:
            # Use our specialized legal document summarizer
            result = await document_processor.summarize(
                text, 
                max_length=max_length,
                focus_area=focus_area
            )
            
            return {
                "summary": result.get("summary", ""),
                "key_points": result.get("key_points", []),
                "citations": result.get("citations", []),
                "metadata": result.get("metadata", {}),
                "summary_type": "legal_abstractive",
                "original_length": len(text),
                "summary_length": len(result.get("summary", "")),
                "ai_used": True,
            }
        except Exception as e:
            logging.error(f"Error in legal document summarization: {e}")
            # Fall back to legacy summarizer or extractive summary
            if legacy_summarizer:
                try:
                    summary = legacy_summarizer.summarize(
                        text, max_length=max_length, min_length=min_length
                    )
                    summary_type = "legacy_abstractive"
                except:
                    summary = text[:max_length] + "..." if len(text) > max_length else text
                    summary_type = "extract"
            else:
                summary = text[:max_length] + "..." if len(text) > max_length else text
                summary_type = "extract"
                
            return {
                "summary": summary,
                "key_points": [],
                "citations": [],
                "metadata": {},
                "summary_type": summary_type,
                "original_length": len(text),
                "summary_length": len(summary),
                "ai_used": summary_type != "extract",
            }
    else:
        # Simple extractive summary
        summary = text[:max_length] + "..." if len(text) > max_length else text
        
        return {
            "summary": summary,
            "key_points": [],
            "citations": [],
            "metadata": {},
            "summary_type": "extract",
            "original_length": len(text),
            "summary_length": len(summary),
            "ai_used": False,
        }


@router.post("/legal", response_model=SummaryResponse)
async def summarize_legal_document(
    text: str = Body(..., min_length=50, description="Legal document text to summarize"),
    max_length: int = Body(1000, description="Maximum summary length"),
    focus_area: Optional[str] = Body(None, description="Optional area to focus summarization on"),
    extract_key_points: bool = Body(True, description="Whether to extract key legal points"),
    preserve_citations: bool = Body(True, description="Whether to preserve legal citations"),
):
    """
    Generate a specialized summary of a Nigerian legal document with citation preservation
    and key point extraction.

    Args:
        text (str): Legal document text to summarize (minimum 50 characters).
        max_length (int): Maximum length of the summary in characters.
        focus_area (str, optional): Area to focus the summary on (e.g., "liability", "judgment").
        extract_key_points (bool): Whether to extract key legal points.
        preserve_citations (bool): Whether to preserve legal citations.

    Returns:
        SummaryResponse: Legal document summary with key points and preserved citations.
    """
    try:
        result = await legal_summarizer.summarize(
            content=text,
            max_length=max_length,
            focus_area=focus_area
        )
        
        # If options are disabled, remove those elements
        if not extract_key_points:
            result["key_points"] = []
            
        if not preserve_citations:
            result["citations"] = []
        
        return {
            "summary": result.get("summary", ""),
            "key_points": result.get("key_points", []),
            "citations": result.get("citations", []),
            "metadata": result.get("metadata", {}),
            "summary_type": "specialized_nigerian_legal",
            "original_length": len(text),
            "summary_length": len(result.get("summary", "")),
            "ai_used": True,
        }
    except Exception as e:
        logging.error(f"Error in specialized legal document summarization: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to summarize legal document: {str(e)}"
        )
