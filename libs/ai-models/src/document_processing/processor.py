"""
Document processor for handling legal documents.

This module provides functionality for processing legal documents,
extracting text, and performing preprocessing for legal document analysis.
"""
import logging
import io
import re
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

# Try to import document handling libraries
try:
    import PyPDF2
    PDF_SUPPORT = True
except ImportError:
    logging.warning("PyPDF2 not available. PDF support disabled.")
    PDF_SUPPORT = False

try:
    from sentence_transformers import SentenceTransformer
    EMBEDDING_SUPPORT = True
except ImportError:
    logging.warning("SentenceTransformer not available. Embedding support disabled.")
    EMBEDDING_SUPPORT = False

try:
    import spacy
    NLP_SUPPORT = True
    try:
        nlp = spacy.load("en_core_web_sm")
    except:
        logging.warning("en_core_web_sm model not available. Using basic NLP model.")
        nlp = spacy.blank("en")
except ImportError:
    logging.warning("spaCy not available. NLP support disabled.")
    NLP_SUPPORT = False
    nlp = None

class DocumentProcessor:
    """
    Processor for legal documents that handles various formats and extracts text and metadata.
    """

    def __init__(self):
        """Initialize the document processor with necessary models and resources."""
        self.supported_formats = {
            "pdf": self._process_pdf if PDF_SUPPORT else None,
            "txt": self._process_text,
            "docx": None,  # TODO: Add support for docx
            "html": None,  # TODO: Add support for html
        }
        
        # Load embedding model if available
        if EMBEDDING_SUPPORT:
            try:
                self.embedding_model = SentenceTransformer('paraphrase-MiniLM-L6-v2')
                logging.info("Loaded embedding model for document processing")
            except Exception as e:
                logging.error(f"Error loading embedding model: {e}")
                self.embedding_model = None
        else:
            self.embedding_model = None
        
        # Legal entity recognition patters (regex-based fallback when NLP is not available)
        self.legal_entity_patterns = {
            'COURT': [r'(?i)court of', r'(?i)supreme court', r'(?i)district court', r'(?i)appellate court'],
            'JUDGE': [r'(?i)judge\s+\w+', r'(?i)justice\s+\w+', r'(?i)honorable\s+\w+'],
            'CASE_NUM': [r'(?i)case no[.:]?\s*\d+[-\w]+', r'(?i)docket no[.:]?\s*\d+[-\w]+'],
            'DATE': [r'\d{1,2}/\d{1,2}/\d{2,4}', r'\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}'],
            'STATUTE': [r'(?i)U\.S\.C\.\s+§\s*\d+', r'(?i)section\s+\d+', r'(?i)article\s+\d+'],
            'PARTY': [r'(?i)plaintiff', r'(?i)defendant', r'(?i)appellant', r'(?i)appellee', r'(?i)petitioner', r'(?i)respondent'],
        }
        
        # Legal term dictionary for key term extraction
        self.legal_terms = [
            "jurisdiction", "precedent", "statute", "tort", "plaintiff", "defendant", 
            "liability", "remedy", "damages", "injunction", "appeal", "petition", 
            "motion", "brief", "affidavit", "testimony", "evidence", "discovery", 
            "prima facie", "jurisprudence", "due process", "consent", "contract", 
            "breach", "negligence", "fraud", "malpractice", "damages", "remedy",
            "constitutional", "amendment", "civil", "criminal", "procedure", "probate",
            "writ", "subpoena", "deposition", "hearing", "trial", "verdict", "judgment"
        ]

    def process_document(self, content: bytes, filename: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Process a document from binary content.
        
        Args:
            content: Binary content of the document
            filename: Name of the file
            metadata: Optional metadata about the document
            
        Returns:
            Dict containing processed text and metadata
        """
        if metadata is None:
            metadata = {}
            
        # Determine file format from extension
        file_ext = filename.split('.')[-1].lower() if '.' in filename else ''
        
        processor = self.supported_formats.get(file_ext)
        if processor:
            text = processor(content)
        else:
            # Fallback to treating as plain text
            text = content.decode('utf-8', errors='replace')
            
        # Extract metadata from text
        extracted_metadata = self._extract_metadata(text)
        
        # Combine with provided metadata
        combined_metadata = {**extracted_metadata, **metadata}
        
        return {
            "text": text,
            "metadata": combined_metadata,
            "format": file_ext,
            "tokens": len(text.split()),
            "characters": len(text),
        }
    
    def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract legal entities from document text.
        
        Args:
            text: Document text to analyze
            
        Returns:
            List of extracted entities with type, text, and position
        """
        entities = []
        
        # Use spaCy for NER if available
        if NLP_SUPPORT and nlp:
            doc = nlp(text[:100000])  # Process first 100k chars to avoid memory issues
            for ent in doc.ents:
                entities.append({
                    "text": ent.text,
                    "type": ent.label_,
                    "start": ent.start_char,
                    "end": ent.end_char
                })
            
            # Add custom legal entity extraction
            for entity_type, patterns in self.legal_entity_patterns.items():
                for pattern in patterns:
                    for match in re.finditer(pattern, text):
                        entities.append({
                            "text": match.group(),
                            "type": entity_type,
                            "start": match.start(),
                            "end": match.end()
                        })
        else:
            # Fallback to regex-based entity extraction
            for entity_type, patterns in self.legal_entity_patterns.items():
                for pattern in patterns:
                    for match in re.finditer(pattern, text):
                        entities.append({
                            "text": match.group(),
                            "type": entity_type,
                            "start": match.start(),
                            "end": match.end()
                        })
        
        # Remove duplicates while preserving order
        unique_entities = []
        seen = set()
        
        for entity in entities:
            key = (entity["text"], entity["type"], entity["start"])
            if key not in seen:
                seen.add(key)
                unique_entities.append(entity)
        
        return unique_entities
    
    def extract_key_terms(self, text: str, max_terms: int = 20) -> List[Dict[str, Any]]:
        """
        Extract key legal terms from document text.
        
        Args:
            text: Document text to analyze
            max_terms: Maximum number of terms to return
            
        Returns:
            List of key terms with relevance scores
        """
        key_terms = []
        
        # Use embedding model if available for better term extraction
        if EMBEDDING_SUPPORT and self.embedding_model:
            # Create term-relevance pairs
            term_scores = []
            
            # Get document embedding
            doc_embedding = self.embedding_model.encode(text[:10000])  # Process first 10k chars
            
            # Compare with legal terms
            for term in self.legal_terms:
                # Skip if term doesn't appear in text
                if term.lower() not in text.lower():
                    continue
                    
                term_embedding = self.embedding_model.encode(term)
                from numpy import dot
                from numpy.linalg import norm
                
                # Calculate cosine similarity
                similarity = dot(doc_embedding, term_embedding) / (norm(doc_embedding) * norm(term_embedding))
                term_scores.append((term, float(similarity)))
            
            # Sort by relevance score
            term_scores.sort(key=lambda x: x[1], reverse=True)
            
            # Take top terms
            for term, score in term_scores[:max_terms]:
                key_terms.append({
                    "term": term,
                    "relevance": score,
                    "frequency": text.lower().count(term.lower())
                })
                
        else:
            # Fallback to frequency-based term extraction
            for term in self.legal_terms:
                count = text.lower().count(term.lower())
                if count > 0:
                    key_terms.append({
                        "term": term,
                        "relevance": None,
                        "frequency": count
                    })
            
            # Sort by frequency
            key_terms.sort(key=lambda x: x["frequency"], reverse=True)
            key_terms = key_terms[:max_terms]
            
        return key_terms
    
    def _process_pdf(self, content: bytes) -> str:
        """
        Extract text from PDF content.
        
        Args:
            content: Binary PDF content
            
        Returns:
            Extracted text
        """
        text = ""
        try:
            pdf_file = io.BytesIO(content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n\n"
        except Exception as e:
            logging.error(f"Error extracting text from PDF: {e}")
            text = content.decode('utf-8', errors='replace')
        
        return text
    
    def _process_text(self, content: bytes) -> str:
        """
        Process plain text content.
        
        Args:
            content: Binary text content
            
        Returns:
            Decoded text
        """
        return content.decode('utf-8', errors='replace')
    
    def _extract_metadata(self, text: str) -> Dict[str, Any]:
        """
        Extract metadata from document text.
        
        Args:
            text: Document text
            
        Returns:
            Dictionary of extracted metadata
        """
        metadata = {}
        
        # Extract potential document type
        doc_types = [
            "opinion", "order", "judgment", "decision", "brief", 
            "motion", "petition", "complaint", "answer", "statute",
            "regulation", "contract", "agreement", "affidavit"
        ]
        
        for doc_type in doc_types:
            if re.search(rf'\b{doc_type}\b', text, re.IGNORECASE):
                metadata["extracted_document_type"] = doc_type
                break
        
        # Extract potential jurisdiction
        jurisdictions = [
            "federal", "supreme court", "district court", "circuit court",
            "state", "appellate", "california", "new york", "texas", "florida"
        ]
        
        for jurisdiction in jurisdictions:
            if re.search(rf'\b{jurisdiction}\b', text, re.IGNORECASE):
                metadata["extracted_jurisdiction"] = jurisdiction
                break
        
        # Extract potential date
        date_patterns = [
            r'(\d{1,2}/\d{1,2}/\d{2,4})',
            r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}',
            r'(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})'
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    # Try to parse the date
                    date_str = match.group(0)
                    metadata["extracted_date"] = date_str
                    break
                except:
                    pass
        
        return metadata
