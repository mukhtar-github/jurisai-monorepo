"""
Routes for document management in the JurisAI API.
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json

from src.core.database import get_db
from src.models.document import LegalDocument

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
    title: str = Query(...),
    document_type: str = Query(...),
    jurisdiction: str = Query(...),
    publication_date: Optional[str] = None,
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
        db (Session): Database session.
        
    Returns:
        dict: Created document information.
    """
    # Process uploaded file
    content = await file.read()
    
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
        content=content.decode("utf-8", errors="replace"),
        document_type=document_type,
        jurisdiction=jurisdiction,
        publication_date=pub_date
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    # In a production system, we would index the document for search here
    # This would involve sending the content to a vector database or search engine
    
    return {
        "id": document.id,
        "title": document.title,
        "document_type": document.document_type,
        "jurisdiction": document.jurisdiction,
        "status": "Document uploaded successfully"
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
    
    return {"status": "Document deleted successfully"}
