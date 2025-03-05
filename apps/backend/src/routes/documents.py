"""
Routes for document management in the JurisAI API.
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query, Form
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import logging

from src.core.database import get_db
from src.models.document import LegalDocument

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
    from src.routes.search import rag_pipeline, RAG_AVAILABLE, RAG_INITIALIZED
    from src.routes.search import initialize_rag_if_needed
except ImportError:
    rag_pipeline = None
    RAG_AVAILABLE = False
    RAG_INITIALIZED = False
    initialize_rag_if_needed = lambda db: None

# Create router
router = APIRouter(prefix="/documents", tags=["documents"])

@router.get("/", response_model=List[dict])
async def list_documents(
    document_type: Optional[str] = None,
    jurisdiction: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    List all documents with optional filtering.
    
    Args:
        document_type (str, optional): Filter by document type.
        jurisdiction (str, optional): Filter by jurisdiction.
        skip (int, optional): Number of records to skip for pagination.
        limit (int, optional): Maximum number of records to return.
        db (Session): Database session.
        
    Returns:
        List[dict]: List of documents.
    """
    query = db.query(LegalDocument)
    
    if document_type:
        query = query.filter(LegalDocument.document_type == document_type)
    if jurisdiction:
        query = query.filter(LegalDocument.jurisdiction == jurisdiction)
    
    documents = query.offset(skip).limit(limit).all()
    
    return [
        {
            "id": doc.id,
            "title": doc.title,
            "document_type": doc.document_type,
            "jurisdiction": doc.jurisdiction,
            "publication_date": doc.publication_date,
            "created_at": doc.created_at,
            "snippet": doc.content[:300] + "..." if len(doc.content) > 300 else doc.content
        }
        for doc in documents
    ]

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    document_type: str = Form(...),
    jurisdiction: str = Form(...),
    publication_date: Optional[str] = Form(None),
    process_with_ai: bool = Form(True),
    db: Session = Depends(get_db)
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
                content=content,
                filename=file.filename,
                metadata=metadata
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
            raise HTTPException(status_code=400, detail="Invalid publication date format. Use ISO format (YYYY-MM-DD).")
    
    # Create document record
    document = LegalDocument(
        title=title,
        content=text,
        document_type=document_type,
        jurisdiction=jurisdiction,
        publication_date=pub_date
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
                rag_pipeline.index_documents([{
                    "id": document.id,
                    "content": document.content,
                    "title": document.title,
                    "document_type": document.document_type,
                    "jurisdiction": document.jurisdiction
                }])
        except Exception as e:
            logging.error(f"Error indexing document in RAG: {e}")
    
    return {
        "id": document.id,
        "title": document.title,
        "document_type": document.document_type,
        "jurisdiction": document.jurisdiction,
        "status": "Document uploaded and processed successfully",
        "ai_processing_used": process_with_ai and AI_PROCESSING_AVAILABLE,
        "indexed_for_search": RAG_AVAILABLE and rag_pipeline is not None
    }

@router.get("/{document_id}")
async def get_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific document by ID.
    
    Args:
        document_id (int): ID of the document to retrieve.
        db (Session): Database session.
        
    Returns:
        dict: Document information.
    """
    document = db.query(LegalDocument).filter(LegalDocument.id == document_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    
    return {
        "id": document.id,
        "title": document.title,
        "content": document.content,
        "document_type": document.document_type,
        "jurisdiction": document.jurisdiction,
        "publication_date": document.publication_date,
        "created_at": document.created_at,
        "updated_at": document.updated_at
    }

@router.post("/{document_id}/analyze")
async def analyze_document(
    document_id: int,
    analysis_type: str = Query(..., description="Type of analysis to perform (entities, summary, key_terms)"),
    db: Session = Depends(get_db)
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
        raise HTTPException(status_code=503, detail="AI document analysis not available.")
    
    results = {}
    
    try:
        if analysis_type == "entities":
            # Extract legal entities from the document
            entities = document_processor.extract_entities(document.content)
            results = {"entities": entities}
            
        elif analysis_type == "summary":
            # Create a summary of the document using the summarizer
            try:
                from libs.ai_models.src.summarization.summarizer import LegalDocumentSummarizer
                summarizer = LegalDocumentSummarizer()
                summary = summarizer.summarize(document.content)
                results = {"summary": summary}
            except ImportError:
                raise HTTPException(status_code=503, detail="Summarization module not available.")
            
        elif analysis_type == "key_terms":
            # Extract key legal terms from the document
            key_terms = document_processor.extract_key_terms(document.content)
            results = {"key_terms": key_terms}
            
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported analysis type: {analysis_type}")
            
    except Exception as e:
        logging.error(f"Error during document analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    
    return {
        "document_id": document.id,
        "title": document.title,
        "analysis_type": analysis_type,
        "results": results
    }

@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    db: Session = Depends(get_db)
):
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
