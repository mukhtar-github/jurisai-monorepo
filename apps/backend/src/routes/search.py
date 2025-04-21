"""
Routes for searching legal documents in the JurisAI API.
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from src.core.cache import cache_response
from src.core.database import get_db
from src.models.document import LegalDocument

# Import the RAG pipeline
try:
    from libs.ai_models.src.retrieval import RAGPipeline

    rag_pipeline = RAGPipeline()
    RAG_AVAILABLE = True
    # We'll initialize the RAG index when documents are added
    RAG_INITIALIZED = False
except ImportError:
    logging.warning("RAG pipeline not available. Falling back to basic search.")
    rag_pipeline = None
    RAG_AVAILABLE = False
    RAG_INITIALIZED = False

# Create router
router = APIRouter(prefix="/search", tags=["search"])


def initialize_rag_if_needed(db: Session):
    """
    Initialize the RAG pipeline with existing documents if it hasn't been done already.

    Args:
        db (Session): Database session.
    """
    global RAG_INITIALIZED

    if not RAG_AVAILABLE or RAG_INITIALIZED:
        return

    try:
        # Get all documents
        documents = db.query(LegalDocument).all()

        if not documents:
            logging.info("No documents found for RAG initialization")
            RAG_INITIALIZED = True
            return

        # Format documents for RAG
        doc_list = [
            {
                "id": doc.id,
                "content": doc.content,
                "title": doc.title,
                "document_type": doc.document_type,
                "jurisdiction": doc.jurisdiction,
            }
            for doc in documents
        ]

        # Index documents
        logging.info(f"Initializing RAG with {len(doc_list)} documents")
        rag_pipeline.index_documents(doc_list)
        RAG_INITIALIZED = True
        logging.info("RAG initialization complete")
    except Exception as e:
        logging.error(f"Error initializing RAG: {e}")


@router.get("/")
@cache_response(expire=1800)  # Cache for 30 minutes
async def search_documents(
    query: str = Query(..., min_length=3, description="Search query"),
    jurisdiction: Optional[str] = None,
    document_type: Optional[str] = None,
    use_semantic: Optional[bool] = False,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """
    Search for legal documents based on a query string and optional filters.

    Args:
        query (str): Search query string (minimum 3 characters).
        jurisdiction (str, optional): Filter by jurisdiction.
        document_type (str, optional): Filter by document type.
        use_semantic (bool, optional): Whether to use semantic search (RAG).
        skip (int, optional): Number of records to skip for pagination.
        limit (int, optional): Maximum number of records to return.
        db (Session): Database session.

    Returns:
        List[dict]: List of matching documents.
    """
    # Check if semantic search is requested and available
    if use_semantic and RAG_AVAILABLE and rag_pipeline:
        # Initialize RAG if needed
        initialize_rag_if_needed(db)

        if not RAG_INITIALIZED:
            # Fall back to basic search if RAG init failed
            return basic_search(query, jurisdiction, document_type, skip, limit, db)

        try:
            logging.info(f"Performing semantic search for: {query}")
            # Perform semantic search
            search_results = rag_pipeline.search(query, k=limit)

            # Process results
            results = []
            for result in search_results:
                metadata = result.get("metadata", {})
                doc_id = metadata.get("id")

                if doc_id:
                    # Get the document from the database to ensure fresh data
                    doc = (
                        db.query(LegalDocument)
                        .filter(LegalDocument.id == doc_id)
                        .first()
                    )
                    if doc:
                        # Apply filters
                        if jurisdiction and doc.jurisdiction != jurisdiction:
                            continue
                        if document_type and doc.document_type != document_type:
                            continue

                        results.append(
                            {
                                "id": doc.id,
                                "title": doc.title or f"Document {doc.id}",
                                "jurisdiction": doc.jurisdiction,
                                "document_type": doc.document_type or "Unknown Type",
                                "snippet": result.get("text", ""),
                                "relevance_score": result.get("score", 0),
                            }
                        )
                else:
                    # Handle case where result doesn't have a document ID
                    results.append(
                        {
                            "title": metadata.get("title", "Untitled Document"),
                            "jurisdiction": metadata.get("jurisdiction", "Unknown"),
                            "document_type": metadata.get(
                                "document_type", "Unknown Type"
                            ),
                            "snippet": result.get("text", ""),
                            "relevance_score": result.get("score", 0),
                        }
                    )

            return results[skip : skip + limit]
        except Exception as e:
            logging.error(f"Error in semantic search: {e}")
            # Fall back to basic search
            return basic_search(query, jurisdiction, document_type, skip, limit, db)
    else:
        # Use basic search
        return basic_search(query, jurisdiction, document_type, skip, limit, db)


def basic_search(
    query: str,
    jurisdiction: Optional[str],
    document_type: Optional[str],
    skip: int,
    limit: int,
    db: Session,
) -> List[Dict[str, Any]]:
    """
    Perform basic keyword search using SQL.

    Args:
        query (str): Search query string.
        jurisdiction (str, optional): Filter by jurisdiction.
        document_type (str, optional): Filter by document type.
        skip (int): Number of records to skip for pagination.
        limit (int): Maximum number of records to return.
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
    search_filter = or_(
        LegalDocument.title.ilike(f"%{query}%"),
        LegalDocument.content.ilike(f"%{query}%"),
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
            "snippet": get_content_snippet(doc.content, query),
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
        while start > 0 and content[start] != " ":
            start -= 1

    if end < len(content):
        # Find the end of the current word
        while end < len(content) and content[end] != " ":
            end += 1

    # Create snippet
    snippet = content[start:end].strip()

    # Add ellipsis if snippet doesn't start or end at content boundaries
    if start > 0:
        snippet = "..." + snippet
    if end < len(content):
        snippet = snippet + "..."

    return snippet


@router.get("/ask")
async def ask_question(
    question: str = Query(..., min_length=3, description="Question to ask"),
    jurisdiction: Optional[str] = None,
    document_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Ask a question about legal documents using the RAG pipeline.

    Args:
        question (str): Question to ask (minimum 3 characters).
        jurisdiction (str, optional): Filter by jurisdiction.
        document_type (str, optional): Filter by document type.
        db (Session): Database session.

    Returns:
        dict: Answer and supporting documents.
    """
    if not RAG_AVAILABLE or not rag_pipeline:
        raise HTTPException(
            status_code=501,
            detail="Question answering is not available. RAG pipeline is not initialized.",
        )

    # Initialize RAG if needed
    initialize_rag_if_needed(db)

    if not RAG_INITIALIZED:
        raise HTTPException(
            status_code=500, detail="RAG pipeline initialization failed."
        )

    try:
        # Get answer from RAG
        answer = rag_pipeline.query(question)

        # Get supporting documents
        supporting_docs = rag_pipeline.search(question, k=3)

        return {
            "question": question,
            "answer": answer,
            "supporting_documents": supporting_docs,
        }
    except Exception as e:
        logging.error(f"Error in question answering: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error processing question: {str(e)}"
        )
