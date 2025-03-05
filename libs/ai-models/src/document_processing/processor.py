"""
Document processing module for JurisAI.
"""
import logging
import re
from typing import Dict, Any, List, Optional, Tuple
import PyPDF2
from io import BytesIO

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DocumentProcessor:
    """
    Document processor for legal documents.
    
    This class provides methods to extract text from different document formats
    and perform basic preprocessing for legal documents.
    """
    
    def __init__(self):
        """
        Initialize the document processor.
        """
        logger.info("Initializing document processor")
        
    def process_document(
        self,
        content: bytes,
        filename: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a document and extract text and metadata.
        
        Args:
            content (bytes): Raw document content.
            filename (str): Name of the file.
            metadata (Dict[str, Any], optional): Additional metadata.
            
        Returns:
            Dict[str, Any]: Processed document with extracted text and metadata.
        """
        if not content:
            logger.warning("Empty content provided for processing")
            return {"text": "", "metadata": metadata or {}}
            
        # Determine file type from filename
        file_extension = filename.split('.')[-1].lower() if '.' in filename else ""
        
        # Extract text based on file type
        if file_extension == "pdf":
            text = self._extract_from_pdf(content)
        elif file_extension in ["txt", "md"]:
            text = content.decode("utf-8", errors="replace")
        elif file_extension in ["docx", "doc"]:
            logger.warning("Word document processing not implemented yet")
            text = "Word document processing not implemented yet"
        else:
            logger.warning(f"Unsupported file format: {file_extension}")
            text = content.decode("utf-8", errors="replace")
            
        # Preprocess the extracted text
        clean_text = self._preprocess_text(text)
        
        # Extract additional metadata if possible
        extracted_metadata = self._extract_metadata(clean_text)
        
        # Combine provided and extracted metadata
        combined_metadata = {**(metadata or {}), **extracted_metadata}
        
        return {
            "text": clean_text,
            "metadata": combined_metadata
        }
        
    def _extract_from_pdf(self, content: bytes) -> str:
        """
        Extract text from PDF content.
        
        Args:
            content (bytes): PDF file content.
            
        Returns:
            str: Extracted text.
        """
        try:
            pdf_file = BytesIO(content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text_parts = []
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text_parts.append(page.extract_text())
                
            return "\n".join(text_parts)
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            return ""
            
    def _preprocess_text(self, text: str) -> str:
        """
        Preprocess extracted text.
        
        Args:
            text (str): Raw extracted text.
            
        Returns:
            str: Preprocessed text.
        """
        if not text:
            return ""
            
        # Remove excessive whitespace
        clean_text = re.sub(r'\s+', ' ', text)
        clean_text = clean_text.strip()
        
        # Remove headers/footers that often appear in legal documents
        # (This is a simplified approach - more sophisticated methods would be used in production)
        lines = clean_text.split('\n')
        filtered_lines = []
        
        for line in lines:
            # Skip page numbers
            if re.match(r'^\s*\d+\s*$', line):
                continue
                
            # Skip typical headers/footers
            if any(pattern in line.lower() for pattern in [
                'confidential', 'page', 'draft', 'copyright', 'all rights reserved'
            ]):
                continue
                
            filtered_lines.append(line)
            
        return '\n'.join(filtered_lines)
        
    def _extract_metadata(self, text: str) -> Dict[str, Any]:
        """
        Extract metadata from document text.
        
        Args:
            text (str): Document text.
            
        Returns:
            Dict[str, Any]: Extracted metadata.
        """
        metadata = {}
        
        # Extract document date (simplified approach)
        date_match = re.search(r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{4}[/-]\d{1,2}[/-]\d{1,2})', text)
        if date_match:
            metadata["extracted_date"] = date_match.group(0)
            
        # Try to identify document type
        doc_types = {
            "agreement": ["agreement", "contract", "memorandum of understanding"],
            "judgment": ["judgment", "decision", "order", "ruling"],
            "legislation": ["act", "law", "regulation", "statute", "bill"],
            "legal_opinion": ["opinion", "legal opinion", "advice"],
            "court_filing": ["complaint", "motion", "petition", "brief"]
        }
        
        for doc_type, keywords in doc_types.items():
            if any(keyword in text.lower() for keyword in keywords):
                metadata["extracted_document_type"] = doc_type
                break
                
        # Try to identify jurisdiction
        jurisdictions = [
            "nigeria", "ghana", "kenya", "south africa", "united states", 
            "united kingdom", "european union", "canada", "australia"
        ]
        
        for jurisdiction in jurisdictions:
            if jurisdiction in text.lower():
                metadata["extracted_jurisdiction"] = jurisdiction
                break
                
        return metadata
        
    def extract_sections(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract sections from legal document text.
        
        Args:
            text (str): Document text.
            
        Returns:
            List[Dict[str, Any]]: List of sections with title and content.
        """
        # This is a simplified implementation - more sophisticated
        # methods would be used in production
        
        # Try to identify section patterns
        section_patterns = [
            r'(?:SECTION|Section)\s+\d+\.\s+(.*?)(?=(?:SECTION|Section)\s+\d+\.|$)',
            r'(?:ARTICLE|Article)\s+\d+\.\s+(.*?)(?=(?:ARTICLE|Article)\s+\d+\.|$)',
            r'(?:\d+\.\d+)\s+(.*?)(?=\d+\.\d+|$)',
            r'(?:\d+\.)\s+(.*?)(?=\d+\.|$)'
        ]
        
        for pattern in section_patterns:
            sections = re.findall(pattern, text, re.DOTALL)
            if sections:
                return [{"title": section.strip(), "content": section.strip()} for section in sections]
                
        # If no sections found, split by newlines
        paragraphs = text.split('\n\n')
        return [{"title": f"Paragraph {i+1}", "content": p.strip()} for i, p in enumerate(paragraphs) if p.strip()]
