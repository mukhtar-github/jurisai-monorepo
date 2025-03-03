"""
Routes for document summarization in the JurisAI API.
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Optional

from src.core.database import get_db
from src.core.cache import cache_response
from src.models.document import LegalDocument

# Create router
router = APIRouter(prefix="/summarization", tags=["summarization"])

@router.post("/document/{document_id}")
@cache_response(expire=86400)  # Cache for 24 hours
async def summarize_document(
    document_id: int,
    max_length: Optional[int] = Body(500),
    db: Session = Depends(get_db)
):
    """
    Generate a summary of a legal document.
    
    For the POC, this is a simple implementation that returns the first `max_length`
    characters of the document. In a production system, this would use an AI model
    to generate a proper summary.
    
    Args:
        document_id (int): ID of the document to summarize.
        max_length (int, optional): Maximum length of the summary in characters.
        db (Session): Database session.
        
    Returns:
        dict: Document summary.
    """
    document = db.query(LegalDocument).filter(LegalDocument.id == document_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    
    # For POC, simply return the first max_length characters
    # In production, this would call an AI summarization model
    simple_summary = document.content[:max_length] + "..." if len(document.content) > max_length else document.content
    
    return {
        "document_id": document.id,
        "title": document.title,
        "summary": simple_summary,
        "summary_type": "extract",  # In future: "abstractive" for AI-generated summaries
        "original_length": len(document.content),
        "summary_length": len(simple_summary)
    }

@router.post("/text")
async def summarize_text(
    text: str = Body(..., min_length=50),
    max_length: Optional[int] = Body(500)
):
    """
    Generate a summary of a provided text.
    
    For the POC, this is a simple implementation that returns the first `max_length`
    characters of the text. In a production system, this would use an AI model
    to generate a proper summary.
    
    Args:
        text (str): Text to summarize (minimum 50 characters).
        max_length (int, optional): Maximum length of the summary in characters.
        
    Returns:
        dict: Text summary.
    """
    # For POC, simply return the first max_length characters
    # In production, this would call an AI summarization model
    simple_summary = text[:max_length] + "..." if len(text) > max_length else text
    
    return {
        "summary": simple_summary,
        "summary_type": "extract",  # In future: "abstractive" for AI-generated summaries
        "original_length": len(text),
        "summary_length": len(simple_summary)
    }
