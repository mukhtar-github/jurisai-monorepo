"""
Routes for searching legal documents in the JurisAI API.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional

from src.core.database import get_db
from src.core.cache import cache_response
from src.models.document import LegalDocument

# Create router
router = APIRouter(prefix="/search", tags=["search"])

@router.get("/")
@cache_response(expire=1800)  # Cache for 30 minutes
async def search_documents(
    query: str = Query(..., min_length=3, description="Search query"),
    jurisdiction: Optional[str] = None,
    document_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Search for legal documents based on a query string and optional filters.
    
    Args:
        query (str): Search query string (minimum 3 characters).
        jurisdiction (str, optional): Filter by jurisdiction.
        document_type (str, optional): Filter by document type.
        skip (int, optional): Number of records to skip for pagination.
        limit (int, optional): Maximum number of records to return.
        db (Session): Database session.
        
    Returns:
        List[dict]: List of matching documents.
    """
    # Start with base query
    db_query = db.query(LegalDocument)
    
    # Apply filters
    if jurisdiction:
        db_query = db_query.filter(LegalDocument.jurisdiction == jurisdiction)
    if document_type:
        db_query = db_query.filter(LegalDocument.document_type == document_type)
    
    # Apply text search filter
    # This is a simple implementation - in a production system we would use
    # a proper full-text search engine like Elasticsearch or a vector database
    search_filter = or_(
        LegalDocument.title.ilike(f"%{query}%"),
        LegalDocument.content.ilike(f"%{query}%")
    )
    db_query = db_query.filter(search_filter)
    
    # Execute query with pagination
    results = db_query.offset(skip).limit(limit).all()
    
    if not results:
        return []
    
    # Prepare response
    return [
        {
            "id": doc.id,
            "title": doc.title or f"Document {doc.id}",
            "jurisdiction": doc.jurisdiction,
            "document_type": doc.document_type or "Unknown Type",
            "snippet": get_content_snippet(doc.content, query)
        } 
        for doc in results
    ]

def get_content_snippet(content: str, query: str, max_length: int = 300) -> str:
    """
    Extract a relevant snippet from the document content based on the search query.
    
    Args:
        content (str): The full document content.
        query (str): The search query.
        max_length (int, optional): Maximum length of the snippet.
        
    Returns:
        str: A relevant snippet containing the search query.
    """
    # Convert to lowercase for case-insensitive search
    content_lower = content.lower()
    query_lower = query.lower()
    
    # Find position of query in content
    pos = content_lower.find(query_lower)
    
    if pos == -1:
        # If query not found exactly, return the beginning of the content
        return content[:max_length] + "..."
    
    # Calculate start and end positions for the snippet
    start = max(0, pos - 100)
    end = min(len(content), pos + len(query) + 200)
    
    # Adjust to avoid cutting words
    if start > 0:
        # Find the beginning of the current word
        while start > 0 and content[start] != ' ':
            start -= 1
    
    if end < len(content):
        # Find the end of the current word
        while end < len(content) and content[end] != ' ':
            end += 1
    
    # Create snippet
    snippet = content[start:end].strip()
    
    # Add ellipsis if snippet doesn't start or end at content boundaries
    if start > 0:
        snippet = "..." + snippet
    if end < len(content):
        snippet = snippet + "..."
    
    return snippet
