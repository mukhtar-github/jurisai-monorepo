"""
Routes for document management in the JurisAI API.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
)
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.document import DocumentEntity, DocumentKeyTerm, LegalDocument

# Import document processor if available
try:
    from libs.ai_models.src.document_processing import DocumentProcessor

    document_processor = DocumentProcessor()
    AI_PROCESSING_AVAILABLE = True
except ImportError:
    logging.warning("Document processing module not available. Using basic processing.")
    document_processor = None
    AI_PROCESSING_AVAILABLE = False

# Try to import RAG pipeline for indexing
try:
    from src.routes.search import (
        RAG_AVAILABLE,
        RAG_INITIALIZED,
        initialize_rag_if_needed,
        rag_pipeline,
    )
except ImportError:
    rag_pipeline = None
    RAG_AVAILABLE = False
    RAG_INITIALIZED = False
    initialize_rag_if_needed = lambda db: None

# Create router
router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("/")
async def list_documents(
    document_type: Optional[str] = None,
    jurisdiction: Optional[str] = None,
    has_summary: Optional[bool] = Query(
        None, description="Filter by whether document has a summary"
    ),
    has_entities: Optional[bool] = Query(
        None, description="Filter by whether document has extracted entities"
    ),
    has_key_terms: Optional[bool] = Query(
        None, description="Filter by whether document has extracted key terms"
    ),
    skip: int = Query(0, description="Number of records to skip for pagination"),
    limit: int = Query(100, description="Maximum number of records to return"),
    sort_by: str = Query(
        "created_at",
        description="Field to sort by (created_at, updated_at, word_count, title)",
    ),
    sort_order: str = Query("desc", description="Sort order (asc, desc)"),
    db: Session = Depends(get_db),
):
    """
    List all documents with optional filtering.

    Args:
        document_type (str, optional): Filter by document type.
        jurisdiction (str, optional): Filter by jurisdiction.
        has_summary (bool, optional): Filter by whether document has a summary.
        has_entities (bool, optional): Filter by whether document has extracted entities.
        has_key_terms (bool, optional): Filter by whether document has extracted key terms.
        skip (int): Number of records to skip for pagination.
        limit (int): Maximum number of records to return.
        sort_by (str): Field to sort by.
        sort_order (str): Sort order.
        db (Session): Database session.

    Returns:
        dict: List of documents with pagination info.
    """
    query = db.query(LegalDocument)

    # Apply basic filters
    if document_type:
        query = query.filter(LegalDocument.document_type == document_type)

    if jurisdiction:
        query = query.filter(LegalDocument.jurisdiction == jurisdiction)

    # Apply advanced filters
    if has_summary is not None:
        if has_summary:
            query = query.filter(LegalDocument.summary.isnot(None))
        else:
            query = query.filter(LegalDocument.summary.is_(None))

    if has_entities is not None:
        entity_subquery = db.query(DocumentEntity.document_id).distinct().subquery()
        if has_entities:
            query = query.filter(LegalDocument.id.in_(entity_subquery))
        else:
            query = query.filter(~LegalDocument.id.in_(entity_subquery))

    if has_key_terms is not None:
        term_subquery = db.query(DocumentKeyTerm.document_id).distinct().subquery()
        if has_key_terms:
            query = query.filter(LegalDocument.id.in_(term_subquery))
        else:
            query = query.filter(~LegalDocument.id.in_(term_subquery))

    # Get total count before applying pagination
    total = query.count()

    # Apply sorting
    if sort_by == "created_at" and sort_order == "desc":
        query = query.order_by(LegalDocument.created_at.desc())
    elif sort_by == "created_at" and sort_order == "asc":
        query = query.order_by(LegalDocument.created_at.asc())
    elif sort_by == "updated_at" and sort_order == "desc":
        query = query.order_by(LegalDocument.updated_at.desc())
    elif sort_by == "updated_at" and sort_order == "asc":
        query = query.order_by(LegalDocument.updated_at.asc())
    elif sort_by == "word_count" and sort_order == "desc":
        query = query.order_by(LegalDocument.word_count.desc().nullslast())
    elif sort_by == "word_count" and sort_order == "asc":
        query = query.order_by(LegalDocument.word_count.asc().nullsfirst())
    elif sort_by == "title" and sort_order == "desc":
        query = query.order_by(LegalDocument.title.desc())
    elif sort_by == "title" and sort_order == "asc":
        query = query.order_by(LegalDocument.title.asc())
    else:
        # Default sort
        query = query.order_by(LegalDocument.created_at.desc())

    # Apply pagination
    documents = query.offset(skip).limit(limit).all()

    result = {
        "total": total,
        "items": [
            {
                "id": doc.id,
                "title": doc.title,
                "document_type": doc.document_type,
                "jurisdiction": doc.jurisdiction,
                "publication_date": doc.publication_date,
                "created_at": doc.created_at,
                "updated_at": doc.updated_at,
                "word_count": doc.word_count,
                "has_summary": doc.summary is not None,
                "snippet": (
                    doc.content[:300] + "..." if len(doc.content) > 300 else doc.content
                ),
            }
            for doc in documents
        ],
        "pagination": {"skip": skip, "limit": limit, "total": total},
    }

    # Add insights on available document metadata
    available_document_types = [
        dt[0] for dt in db.query(LegalDocument.document_type).distinct().all() if dt[0]
    ]
    available_jurisdictions = [
        j[0] for j in db.query(LegalDocument.jurisdiction).distinct().all() if j[0]
    ]

    result["available_filters"] = {
        "document_types": available_document_types,
        "jurisdictions": available_jurisdictions,
    }

    return result


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    document_type: str = Form(...),
    jurisdiction: str = Form(...),
    publication_date: Optional[str] = Form(None),
    process_with_ai: bool = Form(True),
    auto_analyze: bool = Form(
        False, description="Automatically analyze the document after upload"
    ),
    db: Session = Depends(get_db),
):
    """
    Upload a new legal document.

    Args:
        file (UploadFile): The document file to upload.
        title (str): Document title.
        document_type (str): Type of legal document.
        jurisdiction (str): Jurisdiction the document belongs to.
        publication_date (str, optional): Publication date in ISO format.
        process_with_ai (bool): Whether to use AI for document processing.
        db (Session): Database session.

    Returns:
        dict: Created document information.
    """
    # Read file content
    content = await file.read()

    # Extract metadata from the document
    metadata = {
        "title": title,
        "document_type": document_type,
        "jurisdiction": jurisdiction,
    }

    try:
        # Process the document with AI if available and requested
        if process_with_ai and AI_PROCESSING_AVAILABLE and document_processor:
            logging.info(f"Processing document {title} with AI")
            processed = document_processor.process_document(
                content=content, filename=file.filename, metadata=metadata
            )

            # Extract text and enhanced metadata
            text = processed["text"]
            enhanced_metadata = processed["metadata"]

            # Update metadata with AI extracted values if they're present
            if "extracted_document_type" in enhanced_metadata and not document_type:
                document_type = enhanced_metadata["extracted_document_type"]

            if "extracted_jurisdiction" in enhanced_metadata and not jurisdiction:
                jurisdiction = enhanced_metadata["extracted_jurisdiction"]

            if "extracted_date" in enhanced_metadata and not publication_date:
                publication_date = enhanced_metadata["extracted_date"]
        else:
            # Basic processing - just decode the content
            text = content.decode("utf-8", errors="replace")
    except Exception as e:
        logging.error(f"Error processing document: {e}")
        # Fallback to basic processing
        text = content.decode("utf-8", errors="replace")

    # Parse publication date if provided
    pub_date = None
    if publication_date:
        try:
            pub_date = datetime.fromisoformat(publication_date)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid publication date format. Use ISO format (YYYY-MM-DD).",
            )

    # Create document record
    document = LegalDocument(
        title=title,
        content=text,
        document_type=document_type,
        jurisdiction=jurisdiction,
        publication_date=pub_date,
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    # Index the document in RAG pipeline if available
    if RAG_AVAILABLE and rag_pipeline:
        try:
            logging.info(f"Indexing document {document.id} in RAG pipeline")
            if not RAG_INITIALIZED:
                # Initialize RAG with all documents
                initialize_rag_if_needed(db)
            else:
                # Add just this document to the index
                rag_pipeline.index_documents(
                    [
                        {
                            "id": document.id,
                            "content": document.content,
                            "title": document.title,
                            "document_type": document.document_type,
                            "jurisdiction": document.jurisdiction,
                        }
                    ]
                )
        except Exception as e:
            logging.error(f"Error indexing document in RAG: {e}")

    response = {
        "id": document.id,
        "title": document.title,
        "document_type": document.document_type,
        "jurisdiction": document.jurisdiction,
        "status": "Document uploaded and processed successfully",
        "ai_processing_used": process_with_ai and AI_PROCESSING_AVAILABLE,
        "indexed_for_search": RAG_AVAILABLE and rag_pipeline is not None,
    }

    # If auto-analyze is enabled, analyze the document
    if auto_analyze and AI_PROCESSING_AVAILABLE and document_processor:
        try:
            logging.info(f"Auto-analyzing document {document.id}")

            # Perform 'all' analysis
            # 1. Extract entities
            entities = document_processor.extract_entities(document.content)
            stored_entity_count = 0

            for entity in entities:
                db_entity = DocumentEntity(
                    document_id=document.id,
                    entity_text=entity["text"],
                    entity_type=entity["type"],
                    start_pos=entity.get("start"),
                    end_pos=entity.get("end"),
                )
                db.add(db_entity)
                stored_entity_count += 1

            # 2. Generate summary
            summary = ""
            try:
                from libs.ai_models.src.summarization.summarizer import (
                    LegalDocumentSummarizer,
                )

                summarizer = LegalDocumentSummarizer()
                summary = summarizer.summarize(document.content)
                document.summary = summary
            except ImportError:
                logging.warning("Summarization module not available for auto-analysis")

            # 3. Extract key terms
            key_terms = document_processor.extract_key_terms(document.content)
            stored_term_count = 0

            for term in key_terms:
                db_term = DocumentKeyTerm(
                    document_id=document.id,
                    term=term["term"],
                    relevance=(
                        float(term["relevance"]) * 100
                        if term["relevance"] is not None
                        else None
                    ),
                    frequency=term["frequency"],
                )
                db.add(db_term)
                stored_term_count += 1

            # Commit all changes
            db.commit()

            # Update document metadata
            if not document.metadata:
                document.metadata = {}

            document.metadata["analyzed_at"] = datetime.now(timezone.utc).isoformat()
            document.metadata["analysis_stats"] = {
                "entity_count": stored_entity_count,
                "key_term_count": stored_term_count,
                "has_summary": bool(summary),
            }
            document.word_count = len(document.content.split())
            db.commit()

            response["analysis"] = {
                "status": "completed",
                "entity_count": stored_entity_count,
                "key_term_count": stored_term_count,
                "has_summary": bool(summary),
            }

        except Exception as e:
            logging.error(f"Error during auto-analysis: {e}")
            response["analysis"] = {"status": "failed", "error": str(e)}

    return response


@router.get("/{document_id}")
async def get_document(
    document_id: int,
    include_content: bool = Query(
        True, description="Whether to include the full document content"
    ),
    include_metadata: bool = Query(
        False, description="Whether to include document metadata"
    ),
    db: Session = Depends(get_db),
):
    """
    Get a specific document by ID.

    Args:
        document_id (int): ID of the document to retrieve.
        include_content (bool): Whether to include the full document content.
        include_metadata (bool): Whether to include document metadata.
        db (Session): Database session.

    Returns:
        dict: Document information.
    """
    document = db.query(LegalDocument).filter(LegalDocument.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    response = {
        "id": document.id,
        "title": document.title,
        "document_type": document.document_type,
        "jurisdiction": document.jurisdiction,
        "publication_date": document.publication_date,
        "created_at": document.created_at,
        "updated_at": document.updated_at,
        "word_count": document.word_count,
        "has_summary": document.summary is not None,
    }

    if include_content:
        response["content"] = document.content

    if document.summary:
        response["summary"] = document.summary

    if include_metadata and document.metadata:
        response["metadata"] = document.metadata

    return response


@router.post("/{document_id}/analyze")
async def analyze_document(
    document_id: int,
    analysis_type: str = Query(
        ..., description="Type of analysis to perform (entities, summary, key_terms)"
    ),
    db: Session = Depends(get_db),
):
    """
    Analyze a document with AI processing. Extract entities, summarize, or identify key terms.

    Args:
        document_id (int): ID of the document to analyze.
        analysis_type (str): Type of analysis to perform.
        db (Session): Database session.

    Returns:
        dict: Analysis results.
    """
    document = db.query(LegalDocument).filter(LegalDocument.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    if not AI_PROCESSING_AVAILABLE or not document_processor:
        raise HTTPException(
            status_code=503, detail="AI document analysis not available."
        )

    results = {}

    try:
        if analysis_type == "entities":
            # Extract legal entities from the document
            entities = document_processor.extract_entities(document.content)

            # Store entities in the database
            stored_entities = []
            for entity in entities:
                db_entity = DocumentEntity(
                    document_id=document.id,
                    entity_text=entity["text"],
                    entity_type=entity["type"],
                    start_pos=entity.get("start"),
                    end_pos=entity.get("end"),
                    relevance_score=None,  # Can be updated with relevance if available
                )
                db.add(db_entity)
                stored_entities.append(db_entity)

            db.commit()

            # Return both the extracted data and IDs of stored entities
            results = {
                "entities": entities,
                "stored_entity_count": len(stored_entities),
            }

        elif analysis_type == "summary":
            # Create a summary of the document using the summarizer
            try:
                from libs.ai_models.src.summarization.summarizer import (
                    LegalDocumentSummarizer,
                )

                summarizer = LegalDocumentSummarizer()
                summary = summarizer.summarize(document.content)

                # Store the summary in the document
                document.summary = summary
                db.commit()

                results = {"summary": summary}
            except ImportError:
                raise HTTPException(
                    status_code=503, detail="Summarization module not available."
                )

        elif analysis_type == "key_terms":
            # Extract key legal terms from the document
            key_terms = document_processor.extract_key_terms(document.content)

            # Store key terms in the database
            stored_terms = []
            for term in key_terms:
                db_term = DocumentKeyTerm(
                    document_id=document.id,
                    term=term["term"],
                    relevance=(
                        float(term["relevance"]) * 100
                        if term["relevance"] is not None
                        else None
                    ),
                    frequency=term["frequency"],
                )
                db.add(db_term)
                stored_terms.append(db_term)

            db.commit()

            # Return both the extracted data and IDs of stored terms
            results = {"key_terms": key_terms, "stored_term_count": len(stored_terms)}

        elif analysis_type == "all":
            # Perform all analysis types
            # 1. Extract entities
            entities = document_processor.extract_entities(document.content)
            stored_entity_count = 0

            for entity in entities:
                db_entity = DocumentEntity(
                    document_id=document.id,
                    entity_text=entity["text"],
                    entity_type=entity["type"],
                    start_pos=entity.get("start"),
                    end_pos=entity.get("end"),
                )
                db.add(db_entity)
                stored_entity_count += 1

            # 2. Generate summary
            summary = ""
            try:
                from libs.ai_models.src.summarization.summarizer import (
                    LegalDocumentSummarizer,
                )

                summarizer = LegalDocumentSummarizer()
                summary = summarizer.summarize(document.content)
                document.summary = summary
            except ImportError:
                logging.warning("Summarization module not available for 'all' analysis")

            # 3. Extract key terms
            key_terms = document_processor.extract_key_terms(document.content)
            stored_term_count = 0

            for term in key_terms:
                db_term = DocumentKeyTerm(
                    document_id=document.id,
                    term=term["term"],
                    relevance=(
                        float(term["relevance"]) * 100
                        if term["relevance"] is not None
                        else None
                    ),
                    frequency=term["frequency"],
                )
                db.add(db_term)
                stored_term_count += 1

            # Commit all changes
            db.commit()

            # Update document metadata
            if not document.metadata:
                document.metadata = {}

            document.metadata["analyzed_at"] = datetime.now(timezone.utc).isoformat()
            document.metadata["analysis_stats"] = {
                "entity_count": stored_entity_count,
                "key_term_count": stored_term_count,
                "has_summary": bool(summary),
            }
            document.word_count = len(document.content.split())
            db.commit()

            results = {
                "entities": entities,
                "stored_entity_count": stored_entity_count,
                "key_terms": key_terms[
                    :10
                ],  # Return just first 10 terms in results for brevity
                "stored_term_count": stored_term_count,
                "has_summary": bool(summary),
            }

        else:
            raise HTTPException(
                status_code=400, detail=f"Unsupported analysis type: {analysis_type}"
            )

    except Exception as e:
        logging.error(f"Error during document analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    return {
        "document_id": document.id,
        "title": document.title,
        "analysis_type": analysis_type,
        "results": results,
    }


@router.delete("/{document_id}")
async def delete_document(document_id: int, db: Session = Depends(get_db)):
    """
    Delete a document by ID.

    Args:
        document_id (int): ID of the document to delete.
        db (Session): Database session.

    Returns:
        dict: Status message.
    """
    document = db.query(LegalDocument).filter(LegalDocument.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    db.delete(document)
    db.commit()

    # Note: We don't remove the document from the RAG index here
    # This would require rebuilding the index which is expensive
    # In a production system, we would use a vector database that supports deletion

    return {"status": "Document deleted successfully"}


@router.get("/{document_id}/entities")
async def get_document_entities(
    document_id: int,
    entity_type: Optional[str] = Query(None, description="Filter entities by type"),
    limit: int = Query(50, description="Maximum number of entities to return"),
    offset: int = Query(0, description="Number of entities to skip"),
    sort_by: str = Query(
        "relevance", description="Sort by field (relevance, text, type)"
    ),
    sort_order: str = Query("desc", description="Sort order (asc, desc)"),
    db: Session = Depends(get_db),
):
    """
    Get entities for a specific document.

    Args:
        document_id (int): ID of the document to retrieve entities for.
        entity_type (str, optional): Filter entities by type.
        limit (int): Maximum number of entities to return.
        offset (int): Number of entities to skip.
        sort_by (str): Field to sort by.
        sort_order (str): Sort order.
        db (Session): Database session.

    Returns:
        dict: Document entities.
    """
    # Check if document exists
    document = db.query(LegalDocument).filter(LegalDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Build query
    query = db.query(DocumentEntity).filter(DocumentEntity.document_id == document_id)

    # Apply entity_type filter if provided
    if entity_type:
        query = query.filter(DocumentEntity.entity_type == entity_type)

    # Apply sorting
    if sort_by == "relevance" and sort_order == "desc":
        query = query.order_by(DocumentEntity.relevance_score.desc().nullslast())
    elif sort_by == "relevance" and sort_order == "asc":
        query = query.order_by(DocumentEntity.relevance_score.asc().nullsfirst())
    elif sort_by == "text" and sort_order == "desc":
        query = query.order_by(DocumentEntity.entity_text.desc())
    elif sort_by == "text" and sort_order == "asc":
        query = query.order_by(DocumentEntity.entity_text.asc())
    elif sort_by == "type" and sort_order == "desc":
        query = query.order_by(DocumentEntity.entity_type.desc())
    elif sort_by == "type" and sort_order == "asc":
        query = query.order_by(DocumentEntity.entity_type.asc())

    # Get count of total entities matching filter
    total_count = query.count()

    # Apply pagination
    query = query.limit(limit).offset(offset)

    # Execute query
    entities = query.all()

    # Format results
    entity_types = [
        et[0]
        for et in db.query(DocumentEntity.entity_type)
        .filter(DocumentEntity.document_id == document_id)
        .distinct()
        .all()
    ]

    return {
        "document_id": document_id,
        "entities": [
            {
                "id": entity.id,
                "text": entity.entity_text,
                "type": entity.entity_type,
                "start_pos": entity.start_pos,
                "end_pos": entity.end_pos,
                "relevance_score": entity.relevance_score,
            }
            for entity in entities
        ],
        "pagination": {"total": total_count, "limit": limit, "offset": offset},
        "available_entity_types": entity_types,
    }


@router.get("/{document_id}/key_terms")
async def get_document_key_terms(
    document_id: int,
    min_relevance: Optional[float] = Query(
        None, description="Filter terms by minimum relevance score (0-100)"
    ),
    min_frequency: Optional[int] = Query(
        None, description="Filter terms by minimum frequency"
    ),
    limit: int = Query(50, description="Maximum number of terms to return"),
    offset: int = Query(0, description="Number of terms to skip"),
    sort_by: str = Query(
        "relevance", description="Sort by field (relevance, term, frequency)"
    ),
    sort_order: str = Query("desc", description="Sort order (asc, desc)"),
    db: Session = Depends(get_db),
):
    """
    Get key terms for a specific document.

    Args:
        document_id (int): ID of the document to retrieve key terms for.
        min_relevance (float, optional): Filter terms by minimum relevance score.
        min_frequency (int, optional): Filter terms by minimum frequency.
        limit (int): Maximum number of terms to return.
        offset (int): Number of terms to skip.
        sort_by (str): Field to sort by.
        sort_order (str): Sort order.
        db (Session): Database session.

    Returns:
        dict: Document key terms.
    """
    # Check if document exists
    document = db.query(LegalDocument).filter(LegalDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Build query
    query = db.query(DocumentKeyTerm).filter(DocumentKeyTerm.document_id == document_id)

    # Apply min_relevance filter if provided
    if min_relevance is not None:
        query = query.filter(DocumentKeyTerm.relevance >= min_relevance)

    # Apply min_frequency filter if provided
    if min_frequency is not None:
        query = query.filter(DocumentKeyTerm.frequency >= min_frequency)

    # Apply sorting
    if sort_by == "relevance" and sort_order == "desc":
        query = query.order_by(DocumentKeyTerm.relevance.desc().nullslast())
    elif sort_by == "relevance" and sort_order == "asc":
        query = query.order_by(DocumentKeyTerm.relevance.asc().nullsfirst())
    elif sort_by == "term" and sort_order == "desc":
        query = query.order_by(DocumentKeyTerm.term.desc())
    elif sort_by == "term" and sort_order == "asc":
        query = query.order_by(DocumentKeyTerm.term.asc())
    elif sort_by == "frequency" and sort_order == "desc":
        query = query.order_by(DocumentKeyTerm.frequency.desc())
    elif sort_by == "frequency" and sort_order == "asc":
        query = query.order_by(DocumentKeyTerm.frequency.asc())

    # Get count of total key terms matching filters
    total_count = query.count()

    # Apply pagination
    query = query.limit(limit).offset(offset)

    # Execute query
    key_terms = query.all()

    # Get statistics about terms
    stats = (
        db.query(
            func.avg(DocumentKeyTerm.relevance).label("avg_relevance"),
            func.max(DocumentKeyTerm.relevance).label("max_relevance"),
            func.avg(DocumentKeyTerm.frequency).label("avg_frequency"),
            func.max(DocumentKeyTerm.frequency).label("max_frequency"),
        )
        .filter(DocumentKeyTerm.document_id == document_id)
        .first()
    )

    return {
        "document_id": document_id,
        "key_terms": [
            {
                "id": term.id,
                "term": term.term,
                "relevance": term.relevance,
                "frequency": term.frequency,
            }
            for term in key_terms
        ],
        "pagination": {"total": total_count, "limit": limit, "offset": offset},
        "stats": {
            "avg_relevance": (
                float(stats.avg_relevance) if stats and stats.avg_relevance else None
            ),
            "max_relevance": (
                float(stats.max_relevance) if stats and stats.max_relevance else None
            ),
            "avg_frequency": (
                float(stats.avg_frequency) if stats and stats.avg_frequency else None
            ),
            "max_frequency": (
                int(stats.max_frequency) if stats and stats.max_frequency else None
            ),
        },
    }


@router.get("/search")
async def search_documents(
    query: str = Query(..., description="Search query text"),
    document_type: Optional[str] = Query(None, description="Filter by document type"),
    jurisdiction: Optional[str] = Query(None, description="Filter by jurisdiction"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    key_term: Optional[str] = Query(None, description="Filter by key term"),
    search_strategy: str = Query(
        "hybrid", description="Search strategy: 'semantic', 'lexical', or 'hybrid'"
    ),
    limit: int = Query(10, description="Maximum number of documents to return"),
    offset: int = Query(0, description="Number of documents to skip"),
    db: Session = Depends(get_db),
):
    """
    Search documents using full-text and semantic search with optional filters.

    Args:
        query (str): Search query text
        document_type (str, optional): Filter by document type
        jurisdiction (str, optional): Filter by jurisdiction
        entity_type (str, optional): Filter by entity type presence in document
        key_term (str, optional): Filter by key term presence in document
        search_strategy (str): Search strategy to use (semantic, lexical, or hybrid)
        limit (int): Maximum number of documents to return
        offset (int): Number of documents to skip
        db (Session): Database session

    Returns:
        dict: Search results with pagination
    """
    # Start with base query
    base_query = db.query(LegalDocument)

    # Apply filters
    if document_type:
        base_query = base_query.filter(LegalDocument.document_type == document_type)

    if jurisdiction:
        base_query = base_query.filter(LegalDocument.jurisdiction == jurisdiction)

    if entity_type:
        entity_subquery = (
            db.query(DocumentEntity.document_id)
            .filter(DocumentEntity.entity_type == entity_type)
            .distinct()
            .subquery()
        )
        base_query = base_query.filter(LegalDocument.id.in_(entity_subquery))

    if key_term:
        term_subquery = (
            db.query(DocumentKeyTerm.document_id)
            .filter(DocumentKeyTerm.term.ilike(f"%{key_term}%"))
            .distinct()
            .subquery()
        )
        base_query = base_query.filter(LegalDocument.id.in_(term_subquery))

    results = []
    total_count = 0

    # Check if RAG is available for semantic search
    use_semantic = (
        search_strategy in ["semantic", "hybrid"]
        and RAG_AVAILABLE
        and rag_pipeline is not None
    )
    use_lexical = search_strategy in ["lexical", "hybrid"]

    # Execute appropriate search strategy
    if use_semantic:
        try:
            # Get document IDs from filtered base query
            filtered_doc_ids = [doc.id for doc in base_query.all()]

            # If no documents match filters, return empty results
            if not filtered_doc_ids:
                return {
                    "total": 0,
                    "items": [],
                    "pagination": {"offset": offset, "limit": limit, "total": 0},
                }

            # Use RAG pipeline for semantic search
            semantic_results = rag_pipeline.search(
                query=query,
                top_k=limit
                * 2,  # Get more results than needed to account for filtering
                filter_doc_ids=filtered_doc_ids,
            )

            # Extract document IDs and scores from semantic results
            semantic_doc_ids = [int(result["id"]) for result in semantic_results]
            semantic_scores = {
                int(result["id"]): result["score"] for result in semantic_results
            }

            # Query documents by IDs from semantic search
            semantic_docs = (
                db.query(LegalDocument)
                .filter(LegalDocument.id.in_(semantic_doc_ids))
                .all()
            )

            # Map documents to results with scores
            semantic_results = [
                {
                    "id": doc.id,
                    "title": doc.title,
                    "document_type": doc.document_type,
                    "jurisdiction": doc.jurisdiction,
                    "publication_date": doc.publication_date,
                    "created_at": doc.created_at,
                    "updated_at": doc.updated_at,
                    "score": semantic_scores.get(doc.id, 0),
                    "search_method": "semantic",
                    "snippet": (
                        doc.content[:300] + "..."
                        if len(doc.content) > 300
                        else doc.content
                    ),
                    "has_summary": doc.summary is not None,
                }
                for doc in semantic_docs
            ]

            # Sort by score
            semantic_results.sort(key=lambda x: x["score"], reverse=True)

        except Exception as e:
            logging.error(f"Error in semantic search: {e}")
            semantic_results = []

    # Lexical search (full-text)
    if use_lexical:
        try:
            # Apply full-text search on content and title
            lexical_query = base_query.filter(
                or_(
                    LegalDocument.content.ilike(f"%{query}%"),
                    LegalDocument.title.ilike(f"%{query}%"),
                )
            )

            # Get total count for pagination
            lexical_count = lexical_query.count()

            # Get documents from lexical search
            lexical_docs = lexical_query.order_by(LegalDocument.created_at.desc()).all()

            # Map documents to results
            lexical_results = [
                {
                    "id": doc.id,
                    "title": doc.title,
                    "document_type": doc.document_type,
                    "jurisdiction": doc.jurisdiction,
                    "publication_date": doc.publication_date,
                    "created_at": doc.created_at,
                    "updated_at": doc.updated_at,
                    "score": 1.0,  # Default score for lexical results
                    "search_method": "lexical",
                    "snippet": (
                        doc.content[:300] + "..."
                        if len(doc.content) > 300
                        else doc.content
                    ),
                    "has_summary": doc.summary is not None,
                }
                for doc in lexical_docs
            ]

        except Exception as e:
            logging.error(f"Error in lexical search: {e}")
            lexical_results = []
            lexical_count = 0

    # Combine results based on strategy
    if search_strategy == "semantic" and use_semantic:
        results = semantic_results
        total_count = len(results)  # Since we already filtered and got all results
    elif search_strategy == "lexical" and use_lexical:
        results = lexical_results
        total_count = lexical_count
    elif search_strategy == "hybrid" and (use_semantic or use_lexical):
        # Combine semantic and lexical results
        combined_results = {}

        # Add semantic results with their scores
        if use_semantic:
            for result in semantic_results:
                combined_results[result["id"]] = result

        # Add lexical results or update scores for existing results
        if use_lexical:
            for result in lexical_results:
                doc_id = result["id"]
                if doc_id in combined_results:
                    # If document is in both, mark as hybrid and boost score
                    combined_results[doc_id]["search_method"] = "hybrid"
                    combined_results[doc_id]["score"] = (
                        combined_results[doc_id]["score"] * 1.2
                    )  # Boost score for hybrid matches
                else:
                    combined_results[doc_id] = result

        # Convert back to list and sort by score
        results = list(combined_results.values())
        results.sort(key=lambda x: x["score"], reverse=True)
        total_count = len(results)

    # Apply pagination after all filtering and sorting
    paginated_results = results[offset : offset + limit] if results else []

    # Get entity and key term information for results
    for result in paginated_results:
        doc_id = result["id"]

        # Get top 5 entities
        top_entities = (
            db.query(DocumentEntity)
            .filter(DocumentEntity.document_id == doc_id)
            .order_by(DocumentEntity.relevance_score.desc().nullslast())
            .limit(5)
            .all()
        )

        # Get top 5 key terms
        top_terms = (
            db.query(DocumentKeyTerm)
            .filter(DocumentKeyTerm.document_id == doc_id)
            .order_by(DocumentKeyTerm.relevance.desc().nullslast())
            .limit(5)
            .all()
        )

        # Add to result
        result["top_entities"] = [
            {"text": entity.entity_text, "type": entity.entity_type}
            for entity in top_entities
        ]

        result["top_key_terms"] = [
            {"term": term.term, "relevance": term.relevance} for term in top_terms
        ]

    return {
        "total": total_count,
        "items": paginated_results,
        "pagination": {"offset": offset, "limit": limit, "total": total_count},
        "search_info": {
            "query": query,
            "strategy": search_strategy,
            "semantic_available": use_semantic,
            "lexical_available": use_lexical,
        },
    }


async def process_document_batch(
    files, document_type, jurisdiction, process_with_ai, auto_analyze, batch_id, db_url
):
    """
    Background task to process a batch of documents.

    Args:
        files: List of document files to process
        document_type: Type of legal documents
        jurisdiction: Jurisdiction the documents belong to
        process_with_ai: Whether to use AI for document processing
        auto_analyze: Whether to automatically analyze documents after upload
        batch_id: Unique identifier for this batch
        db_url: Database URL for creating new session
    """
    import traceback
    from datetime import datetime

    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from src.services.document_processor import document_processor

    # Create new db session
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        for file in files:
            try:
                # Reset file cursor position
                file.file.seek(0)
                content = await file.read()

                # Skip empty files
                if not content:
                    continue

                # Create metadata with batch info
                batch_metadata = {
                    "batch_id": batch_id,
                    "processing_started": datetime.now(timezone.utc).isoformat(),
                    "processing_status": "in_progress",
                    "file_name": file.filename,
                }

                # Process document
                processed = None
                if process_with_ai:
                    try:
                        processed = document_processor.process_document(
                            content=content,
                            filename=file.filename,
                            metadata={
                                "document_type": document_type,
                                "jurisdiction": jurisdiction,
                                **batch_metadata,
                            },
                        )
                    except Exception as e:
                        logging.error(
                            f"AI processing failed for {file.filename}: {str(e)}"
                        )
                        batch_metadata["ai_processing_error"] = str(e)

                # If AI processing failed or was skipped, create basic document
                if processed is None:
                    processed = {
                        "content": content.decode("utf-8", errors="replace"),
                        "metadata": {
                            "document_type": document_type,
                            "jurisdiction": jurisdiction,
                            "file_name": file.filename,
                            **batch_metadata,
                        },
                    }

                # Create document in database
                document = LegalDocument(
                    title=processed.get("title") or file.filename,
                    content=processed.get("content"),
                    document_type=document_type,
                    jurisdiction=jurisdiction,
                    metadata=processed.get("metadata") or batch_metadata,
                    summary=processed.get("summary"),
                    word_count=processed.get("word_count"),
                )

                # Update processing status
                document.metadata["processing_status"] = "completed"
                document.metadata["processing_completed"] = datetime.now(
                    timezone.utc
                ).isoformat()

                db.add(document)
                db.commit()

                # Analyze document if requested
                if auto_analyze and document.id:
                    try:
                        # Extract entities
                        entities = document_processor.extract_entities(document.content)
                        for entity in entities:
                            db_entity = DocumentEntity(
                                document_id=document.id,
                                text=entity["text"],
                                entity_type=entity["type"],
                                start_offset=entity.get("start"),
                                end_offset=entity.get("end"),
                                relevance=entity.get("relevance", 50),
                            )
                            db.add(db_entity)

                        # Extract key terms
                        key_terms = document_processor.extract_key_terms(
                            document.content
                        )
                        for term in key_terms:
                            db_term = DocumentKeyTerm(
                                document_id=document.id,
                                term=term["term"],
                                relevance=term.get("relevance", 50),
                                frequency=term.get("frequency", 1),
                            )
                            db.add(db_term)

                        # Mark document as analyzed
                        document.metadata["analyzed_at"] = datetime.now(
                            timezone.utc
                        ).isoformat()
                        db.commit()
                    except Exception as e:
                        logging.error(
                            f"Auto-analysis failed for document {document.id}: {str(e)}"
                        )
                        document.metadata["analysis_error"] = str(e)
                        db.commit()

            except Exception as e:
                logging.error(f"Error processing {file.filename} in batch: {str(e)}")
                logging.error(traceback.format_exc())

                # Create failed document record
                error_metadata = {
                    "batch_id": batch_id,
                    "processing_started": datetime.now(timezone.utc).isoformat(),
                    "processing_completed": datetime.now(timezone.utc).isoformat(),
                    "processing_status": "failed",
                    "file_name": file.filename,
                    "error": str(e),
                }

                failed_doc = LegalDocument(
                    title=f"Failed: {file.filename}",
                    content=None,
                    document_type=document_type,
                    jurisdiction=jurisdiction,
                    metadata=error_metadata,
                )
                db.add(failed_doc)
                db.commit()

    except Exception as e:
        logging.error(f"Batch processing error: {str(e)}")
        logging.error(traceback.format_exc())
    finally:
        db.close()


@router.post("/batch-upload")
async def batch_upload_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    document_type: str = Form(...),
    jurisdiction: str = Form(...),
    process_with_ai: bool = Form(True),
    auto_analyze: bool = Form(False),
    db: Session = Depends(get_db),
):
    """
    Upload multiple legal documents in a batch.

    Args:
        background_tasks: FastAPI background tasks handler
        files: List of document files to upload
        document_type: Type of legal documents
        jurisdiction: Jurisdiction the documents belong to
        process_with_ai: Whether to use AI for document processing
        auto_analyze: Whether to automatically analyze documents after upload
        db: Database session

    Returns:
        dict: Status of batch upload operation
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files were uploaded")

    if len(files) > 20:
        raise HTTPException(
            status_code=400, detail="Maximum 20 files can be uploaded in a batch"
        )

    batch_id = f"batch_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{hash(str(files))}"

    # Process documents in background
    background_tasks.add_task(
        process_document_batch,
        files=files,
        document_type=document_type,
        jurisdiction=jurisdiction,
        process_with_ai=process_with_ai,
        auto_analyze=auto_analyze,
        batch_id=batch_id,
        db_url=str(
            db.bind.url
        ),  # Pass database URL for creating new session in background task
    )

    return {
        "status": "Batch processing started",
        "batch_id": batch_id,
        "document_count": len(files),
        "document_type": document_type,
        "jurisdiction": jurisdiction,
        "ai_processing_enabled": process_with_ai,
        "auto_analyze_enabled": auto_analyze,
    }


@router.get("/batch-status/{batch_id}")
async def get_batch_status(batch_id: str, db: Session = Depends(get_db)):
    """
    Get the status of a batch document upload operation.

    Args:
        batch_id: ID of the batch operation
        db: Database session

    Returns:
        dict: Batch processing status information
    """
    from sqlalchemy import cast
    from sqlalchemy.dialects.postgresql import JSONB

    # Query documents with this batch ID in metadata
    documents = (
        db.query(LegalDocument)
        .filter(
            cast(LegalDocument.doc_metadata, JSONB).op("->>")("batch_id") == batch_id
        )
        .all()
    )

    if not documents:
        return {
            "batch_id": batch_id,
            "status": "pending",
            "documents_processed": 0,
            "total_documents": 0,  # Unknown until processing starts
            "started_at": None,
        }

    # Count documents by status
    total_docs = len(documents)
    processed_docs = sum(
        1
        for doc in documents
        if doc.doc_metadata.get("processing_status") == "completed"
    )
    failed_docs = sum(
        1 for doc in documents if doc.doc_metadata.get("processing_status") == "failed"
    )
    analyzed_docs = sum(
        1 for doc in documents if doc.doc_metadata.get("analyzed_at") is not None
    )

    # Get earliest started_at timestamp
    started_timestamps = [
        doc.doc_metadata.get("processing_started")
        for doc in documents
        if doc.doc_metadata.get("processing_started")
    ]
    started_at = min(started_timestamps) if started_timestamps else None

    # Get latest completed_at timestamp
    completed_timestamps = [
        doc.doc_metadata.get("processing_completed")
        for doc in documents
        if doc.doc_metadata.get("processing_completed")
    ]
    completed_at = (
        max(completed_timestamps)
        if completed_timestamps and len(completed_timestamps) == total_docs
        else None
    )

    # Determine overall status
    if failed_docs == total_docs:
        status = "failed"
    elif processed_docs == total_docs:
        status = "completed"
    else:
        status = "in_progress"

    return {
        "batch_id": batch_id,
        "status": status,
        "documents": {
            "total": total_docs,
            "processed": processed_docs,
            "failed": failed_docs,
            "analyzed": analyzed_docs,
        },
        "started_at": started_at,
        "completed_at": completed_at,
        "document_ids": [doc.id for doc in documents],
    }


@router.post("/batch-export")
async def export_batch_documents(
    document_ids: List[int],
    export_format: str = Query("json", description="Export format: json, csv, or txt"),
    include_content: bool = Query(
        True, description="Whether to include document content"
    ),
    include_metadata: bool = Query(
        True, description="Whether to include document metadata"
    ),
    include_entities: bool = Query(
        False, description="Whether to include document entities"
    ),
    include_key_terms: bool = Query(
        False, description="Whether to include document key terms"
    ),
    db: Session = Depends(get_db),
):
    """
    Export multiple documents in a batch.

    Args:
        document_ids: List of document IDs to export
        export_format: Format to export in (json, csv, or txt)
        include_content: Whether to include document content
        include_metadata: Whether to include document metadata
        include_entities: Whether to include document entities
        include_key_terms: Whether to include document key terms
        db: Database session

    Returns:
        dict or StreamingResponse: Exported documents in specified format
    """
    import csv
    import io
    import json

    from fastapi.responses import StreamingResponse

    if not document_ids:
        raise HTTPException(status_code=400, detail="No document IDs provided")

    # Query documents
    documents = db.query(LegalDocument).filter(LegalDocument.id.in_(document_ids)).all()
    if not documents:
        raise HTTPException(
            status_code=404, detail="No documents found with the provided IDs"
        )

    # Process documents
    processed_docs = []
    for doc in documents:
        doc_data = {
            "id": doc.id,
            "title": doc.title,
            "document_type": doc.document_type,
            "jurisdiction": doc.jurisdiction,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
            "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
            "word_count": doc.word_count,
        }

        if include_content:
            doc_data["content"] = doc.content

        if include_metadata:
            doc_data["metadata"] = doc.metadata

        if include_entities:
            entities = (
                db.query(DocumentEntity)
                .filter(DocumentEntity.document_id == doc.id)
                .all()
            )
            doc_data["entities"] = [
                {
                    "text": entity.text,
                    "entity_type": entity.entity_type,
                    "relevance": entity.relevance,
                }
                for entity in entities
            ]

        if include_key_terms:
            key_terms = (
                db.query(DocumentKeyTerm)
                .filter(DocumentKeyTerm.document_id == doc.id)
                .all()
            )
            doc_data["key_terms"] = [
                {
                    "term": term.term,
                    "relevance": term.relevance,
                    "frequency": term.frequency,
                }
                for term in key_terms
            ]

        processed_docs.append(doc_data)

    # Create export ID for tracking
    export_id = f"export_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{hash(str(document_ids))}"

    # Export in the requested format
    if export_format.lower() == "json":
        # JSON export
        export_data = json.dumps(
            {
                "export_id": export_id,
                "export_date": datetime.now(timezone.utc).isoformat(),
                "document_count": len(processed_docs),
                "documents": processed_docs,
            },
            indent=2,
        )

        return StreamingResponse(
            io.StringIO(export_data),
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename=jurisai_documents_{export_id}.json"
            },
        )

    elif export_format.lower() == "csv":
        # CSV export - flatten nested data
        output = io.StringIO()
        writer = csv.writer(output)

        # Write header row
        headers = [
            "id",
            "title",
            "document_type",
            "jurisdiction",
            "created_at",
            "updated_at",
            "word_count",
        ]
        if include_content:
            headers.append("content")
        writer.writerow(headers)

        # Write data rows
        for doc in processed_docs:
            row = [
                doc["id"],
                doc["title"],
                doc["document_type"],
                doc["jurisdiction"],
                doc["created_at"],
                doc["updated_at"],
                doc["word_count"],
            ]
            if include_content:
                row.append(doc["content"])
            writer.writerow(row)

        output.seek(0)
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=jurisai_documents_{export_id}.csv"
            },
        )

    elif export_format.lower() == "txt":
        # Plain text export
        output = io.StringIO()
        for doc in processed_docs:
            output.write(f"Document ID: {doc['id']}\n")
            output.write(f"Title: {doc['title']}\n")
            output.write(f"Type: {doc['document_type']}\n")
            output.write(f"Jurisdiction: {doc['jurisdiction']}\n")
            output.write(f"Created: {doc['created_at']}\n")
            output.write(f"Updated: {doc['updated_at']}\n")
            output.write(f"Word Count: {doc['word_count']}\n\n")

            if include_content:
                output.write("CONTENT:\n")
                output.write(f"{doc['content']}\n\n")

            if include_entities and "entities" in doc:
                output.write("ENTITIES:\n")
                for entity in doc["entities"]:
                    output.write(
                        f"{entity['text']} ({entity['entity_type']}) - Relevance: {entity['relevance']}\n"
                    )
                output.write("\n")

            if include_key_terms and "key_terms" in doc:
                output.write("KEY TERMS:\n")
                for term in doc["key_terms"]:
                    output.write(
                        f"{term['term']} - Relevance: {term['relevance']}, Frequency: {term['frequency']}\n"
                    )
                output.write("\n")

            output.write("------------------------------------------\n\n")

        output.seek(0)
        return StreamingResponse(
            output,
            media_type="text/plain",
            headers={
                "Content-Disposition": f"attachment; filename=jurisai_documents_{export_id}.txt"
            },
        )

    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported export format. Supported formats: json, csv, txt",
        )


@router.post("/batch-analyze")
async def batch_analyze_documents(
    background_tasks: BackgroundTasks,
    document_ids: List[int],
    analysis_types: List[str] = Query(
        ..., description="Types of analysis to perform: entities, key_terms, summary"
    ),
    db: Session = Depends(get_db),
):
    """
    Analyze multiple documents in a batch.

    Args:
        background_tasks: FastAPI background tasks handler
        document_ids: List of document IDs to analyze
        analysis_types: Types of analysis to perform
        db: Database session

    Returns:
        dict: Status of batch analysis operation
    """
    from src.services.document_processor import document_processor

    if not document_ids:
        raise HTTPException(status_code=400, detail="No document IDs provided")

    if not analysis_types:
        raise HTTPException(status_code=400, detail="No analysis types specified")

    # Validate analysis types
    valid_types = {"entities", "key_terms", "summary"}
    invalid_types = set(analysis_types) - valid_types
    if invalid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid analysis types: {', '.join(invalid_types)}. Valid types: {', '.join(valid_types)}",
        )

    # Check if documents exist
    existing_docs = (
        db.query(LegalDocument.id).filter(LegalDocument.id.in_(document_ids)).all()
    )
    existing_ids = [doc.id for doc in existing_docs]

    if not existing_ids:
        raise HTTPException(
            status_code=404, detail="No documents found with the provided IDs"
        )

    missing_ids = set(document_ids) - set(existing_ids)
    if missing_ids:
        raise HTTPException(
            status_code=404,
            detail=f"Documents not found: {', '.join(str(id) for id in missing_ids)}",
        )

    # Create batch ID
    batch_id = f"analysis_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{hash(str(document_ids))}"

    # Update document metadata with batch info
    for doc_id in document_ids:
        doc = db.query(LegalDocument).filter(LegalDocument.id == doc_id).first()
        if not doc.metadata:
            doc.metadata = {}

        # Add analysis batch information
        if "analysis_batches" not in doc.metadata:
            doc.metadata["analysis_batches"] = []

        doc.metadata["analysis_batches"].append(
            {
                "batch_id": batch_id,
                "analysis_types": analysis_types,
                "status": "queued",
                "queued_at": datetime.now(timezone.utc).isoformat(),
            }
        )

        db.add(doc)

    db.commit()

    # Process documents in background
    def process_batch_analysis(document_ids, analysis_types, batch_id, db_url):
        import traceback

        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker

        # Create new db session
        engine = create_engine(db_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        try:
            for doc_id in document_ids:
                try:
                    # Get document
                    doc = (
                        db.query(LegalDocument)
                        .filter(LegalDocument.id == doc_id)
                        .first()
                    )
                    if not doc:
                        continue

                    # Update batch status to in progress
                    for batch in doc.metadata.get("analysis_batches", []):
                        if batch.get("batch_id") == batch_id:
                            batch["status"] = "in_progress"
                            batch["started_at"] = datetime.now(timezone.utc).isoformat()

                    db.add(doc)
                    db.commit()

                    # Process analysis types
                    if "entities" in analysis_types:
                        entities = document_processor.extract_entities(doc.content)
                        for entity in entities:
                            db_entity = DocumentEntity(
                                document_id=doc.id,
                                text=entity["text"],
                                entity_type=entity["type"],
                                start_offset=entity.get("start"),
                                end_offset=entity.get("end"),
                                relevance=entity.get("relevance", 50),
                            )
                            db.add(db_entity)

                    if "key_terms" in analysis_types:
                        key_terms = document_processor.extract_key_terms(doc.content)
                        for term in key_terms:
                            db_term = DocumentKeyTerm(
                                document_id=doc.id,
                                term=term["term"],
                                relevance=term.get("relevance", 50),
                                frequency=term.get("frequency", 1),
                            )
                            db.add(db_term)

                    if (
                        "summary" in analysis_types
                        and document_processor.can_summarize()
                    ):
                        summary = document_processor.summarize_document(doc.content)
                        doc.summary = summary

                    # Update batch status to completed
                    for batch in doc.metadata.get("analysis_batches", []):
                        if batch.get("batch_id") == batch_id:
                            batch["status"] = "completed"
                            batch["completed_at"] = datetime.now(
                                timezone.utc
                            ).isoformat()

                    doc.metadata["analyzed_at"] = datetime.now(timezone.utc).isoformat()
                    db.add(doc)
                    db.commit()

                except Exception as e:
                    logging.error(f"Error analyzing document {doc_id}: {str(e)}")
                    logging.error(traceback.format_exc())

                    # Update batch status to failed
                    doc = (
                        db.query(LegalDocument)
                        .filter(LegalDocument.id == doc_id)
                        .first()
                    )
                    if doc:
                        for batch in doc.metadata.get("analysis_batches", []):
                            if batch.get("batch_id") == batch_id:
                                batch["status"] = "failed"
                                batch["error"] = str(e)
                                batch["failed_at"] = datetime.now(
                                    timezone.utc
                                ).isoformat()

                        db.add(doc)
                        db.commit()

        except Exception as e:
            logging.error(f"Batch analysis error: {str(e)}")
            logging.error(traceback.format_exc())
        finally:
            db.close()

    # Start background task
    background_tasks.add_task(
        process_batch_analysis,
        document_ids=document_ids,
        analysis_types=analysis_types,
        batch_id=batch_id,
        db_url=str(db.bind.url),
    )

    return {
        "status": "Batch analysis started",
        "batch_id": batch_id,
        "document_count": len(document_ids),
        "analysis_types": analysis_types,
    }
