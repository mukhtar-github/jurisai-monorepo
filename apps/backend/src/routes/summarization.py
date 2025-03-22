"""
Routes for document summarization in the JurisAI API.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.cache import cache_response
from src.core.database import get_db
from src.models.document import LegalDocument

# Import the summarizer
try:
    from libs.ai_models.src.summarization import LegalDocumentSummarizer

    # Initialize the summarizer with a small model for faster loading
    summarizer = LegalDocumentSummarizer(model_name="facebook/bart-large-cnn")
    AI_SUMMARIZATION_AVAILABLE = True
except ImportError:
    logging.warning(
        "AI summarization module not available. Falling back to extractive summarization."
    )
    summarizer = None
    AI_SUMMARIZATION_AVAILABLE = False

# Create router
router = APIRouter(prefix="/summarization", tags=["summarization"])


@router.post("/document/{document_id}")
@cache_response(expire=86400)  # Cache for 24 hours
async def summarize_document(
    document_id: int,
    max_length: Optional[int] = Body(500),
    min_length: Optional[int] = Body(100),
    use_ai: Optional[bool] = Body(True),
    db: Session = Depends(get_db),
):
    """
    Generate a summary of a legal document.

    Args:
        document_id (int): ID of the document to summarize.
        max_length (int, optional): Maximum length of the summary in characters.
        min_length (int, optional): Minimum length of the summary in characters.
        use_ai (bool, optional): Whether to use AI for summarization.
        db (Session): Database session.

    Returns:
        dict: Document summary.
    """
    document = db.query(LegalDocument).filter(LegalDocument.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Check if AI summarization is available and requested
    if use_ai and AI_SUMMARIZATION_AVAILABLE and summarizer:
        try:
            summary = summarizer.summarize(
                document.content, max_length=max_length, min_length=min_length
            )
            summary_type = "abstractive"
        except Exception as e:
            logging.error(f"Error in AI summarization: {e}")
            # Fall back to extractive summary
            summary = (
                document.content[:max_length] + "..."
                if len(document.content) > max_length
                else document.content
            )
            summary_type = "extract"
    else:
        # Simple extractive summary
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
        "summary_type": summary_type,
        "original_length": len(document.content),
        "summary_length": len(summary),
        "ai_used": use_ai and AI_SUMMARIZATION_AVAILABLE,
    }


@router.post("/text")
async def summarize_text(
    text: str = Body(..., min_length=50),
    max_length: Optional[int] = Body(500),
    min_length: Optional[int] = Body(100),
    use_ai: Optional[bool] = Body(True),
):
    """
    Generate a summary of a provided text.

    Args:
        text (str): Text to summarize (minimum 50 characters).
        max_length (int, optional): Maximum length of the summary in characters.
        min_length (int, optional): Minimum length of the summary in characters.
        use_ai (bool, optional): Whether to use AI for summarization.

    Returns:
        dict: Text summary.
    """
    # Check if AI summarization is available and requested
    if use_ai and AI_SUMMARIZATION_AVAILABLE and summarizer:
        try:
            summary = summarizer.summarize(
                text, max_length=max_length, min_length=min_length
            )
            summary_type = "abstractive"
        except Exception as e:
            logging.error(f"Error in AI summarization: {e}")
            # Fall back to extractive summary
            summary = text[:max_length] + "..." if len(text) > max_length else text
            summary_type = "extract"
    else:
        # Simple extractive summary
        summary = text[:max_length] + "..." if len(text) > max_length else text
        summary_type = "extract"

    return {
        "summary": summary,
        "summary_type": summary_type,
        "original_length": len(text),
        "summary_length": len(summary),
        "ai_used": use_ai and AI_SUMMARIZATION_AVAILABLE,
    }
