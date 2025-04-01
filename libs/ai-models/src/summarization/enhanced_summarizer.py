"""
Enhanced legal document summarization module for JurisAI.

This module provides advanced summarization capabilities for legal documents
with improved accuracy, contextual awareness, and extraction of key legal concepts.
"""
import logging
from typing import Dict, List, Any, Optional, Union, Tuple
import torch
import re
import json
from transformers import (
    AutoTokenizer, 
    AutoModelForSeq2SeqLM,
    pipeline,
    T5ForConditionalGeneration,
    BartForConditionalGeneration
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnhancedLegalSummarizer:
    """
    Enhanced summarizer for legal documents.
    
    This class extends the basic summarization capabilities with:
    1. Legal domain fine-tuning support
    2. Section-based summarization for structured legal documents
    3. Key legal concept extraction
    4. Citation preservation
    5. Hierarchical summarization for very long documents
    """
    
    def __init__(
        self,
        model_name: str = "facebook/bart-large-cnn",  # Base model to use
        fine_tuned_model_path: Optional[str] = None,  # Path to fine-tuned model
        max_length: int = 500,
        min_length: int = 100,
        device: Optional[str] = None,
        preserve_citations: bool = True,
        extract_key_concepts: bool = True
    ):
        """
        Initialize the enhanced legal summarizer.
        
        Args:
            model_name: Base model name from HuggingFace
            fine_tuned_model_path: Path to fine-tuned model (if available)
            max_length: Maximum summary length in tokens
            min_length: Minimum summary length in tokens
            device: Device to run the model (cuda, cpu)
            preserve_citations: Whether to preserve legal citations in summaries
            extract_key_concepts: Whether to extract key legal concepts
        """
        self.max_length = max_length
        self.min_length = min_length
        self.preserve_citations = preserve_citations
        self.extract_key_concepts = extract_key_concepts
        
        # Determine device
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
            
        # Load model and tokenizer
        try:
            # Use fine-tuned model if available
            if fine_tuned_model_path:
                logger.info(f"Loading fine-tuned summarization model from {fine_tuned_model_path}")
                self.tokenizer = AutoTokenizer.from_pretrained(fine_tuned_model_path)
                self.model = AutoModelForSeq2SeqLM.from_pretrained(fine_tuned_model_path)
            else:
                logger.info(f"Loading base summarization model: {model_name}")
                self.tokenizer = AutoTokenizer.from_pretrained(model_name)
                self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
                
            # Move model to device
            self.model.to(self.device)
            
            # Create summarization pipeline
            self.summarizer = pipeline(
                "summarization",
                model=self.model,
                tokenizer=self.tokenizer,
                device=0 if self.device == "cuda" else -1
            )
            
            # Load legal citation patterns
            self._load_citation_patterns()
            
            # Load key legal concepts
            self._load_legal_concepts()
            
            logger.info("Enhanced legal summarizer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize summarizer: {e}")
            raise
    
    def _load_citation_patterns(self):
        """Load patterns for identifying legal citations."""
        self.citation_patterns = [
            # Case citations
            r'\d{1,3}\s+U\.S\.\s+\d{1,4}',  # US Reports
            r'\d{1,3}\s+S\.\s*Ct\.\s+\d{1,4}',  # Supreme Court Reporter
            r'\d{1,3}\s+F\.(?:3d|2d)?\s+\d{1,4}',  # Federal Reporter
            r'\d{1,3}\s+[A-Za-z\.]+\s+\d{1,4}',  # State reporter citations
            
            # Statutory citations
            r'\d+\s+U\.S\.C\.\s+[§s]\s*\d+[\w\-]*',  # US Code
            r'(?:Section|§)\s*\d+(?:\([a-z0-9]+\))?(?:\s+of\s+the\s+[A-Za-z\s]+)?',  # Section references
            r'(?:Article|Art\.)\s+[IVXivx\d]+(?:\s+of\s+the\s+[A-Za-z\s]+)?'  # Article references
        ]
    
    def _load_legal_concepts(self):
        """Load key legal concepts for extraction and emphasis."""
        self.legal_concepts = {
            # Procedural concepts
            "jurisdiction": ["jurisdiction", "subject matter jurisdiction", "personal jurisdiction"],
            "standing": ["standing", "legal standing", "standing to sue"],
            "procedure": ["civil procedure", "criminal procedure", "due process"],
            
            # Substantive law concepts
            "torts": ["negligence", "strict liability", "product liability", "tort", "injury"],
            "contracts": ["contract", "agreement", "offer", "acceptance", "consideration", "breach"],
            "property": ["property", "real property", "easement", "covenant", "deed", "title"],
            "constitutional": ["constitutional", "first amendment", "fourth amendment", "equal protection"],
            
            # Legal doctrines
            "doctrines": ["doctrine", "precedent", "stare decisis", "res judicata", "collateral estoppel"]
        }
    
    def _extract_citations(self, text: str) -> List[Tuple[str, int, int]]:
        """
        Extract legal citations from text with their positions.
        
        Args:
            text: Text to analyze
        
        Returns:
            List of tuples containing (citation, start_pos, end_pos)
        """
        citations = []
        
        # Find all citations
        for pattern in self.citation_patterns:
            for match in re.finditer(pattern, text):
                citations.append((match.group(), match.start(), match.end()))
                
        return citations
    
    def _extract_key_legal_concepts(self, text: str) -> Dict[str, List[str]]:
        """
        Extract key legal concepts from text.
        
        Args:
            text: Text to analyze
            
        Returns:
            Dictionary of concept categories with found instances
        """
        found_concepts = {}
        
        for category, terms in self.legal_concepts.items():
            found = []
            for term in terms:
                # Use word boundaries to match whole words only
                pattern = r'\b' + re.escape(term) + r'\b'
                if re.search(pattern, text, re.IGNORECASE):
                    found.append(term)
            
            if found:
                found_concepts[category] = found
                
        return found_concepts
    
    def _detect_document_sections(self, text: str) -> List[Dict[str, Any]]:
        """
        Detect and extract sections from a legal document.
        
        Args:
            text: Document text
            
        Returns:
            List of section dictionaries with title and content
        """
        # Common section header patterns in legal documents
        section_patterns = [
            r'^(?:SECTION|Section)\s+\d+[\.:]?\s*([A-Z][A-Za-z\s]+)$',
            r'^(?:ARTICLE|Article)\s+[IVX]+[\.:]?\s*([A-Z][A-Za-z\s]+)$',
            r'^(?:PART|Part)\s+[A-Z][\.:]?\s*([A-Z][A-Za-z\s]+)$',
            r'^(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\.\s+([A-Z][A-Za-z\s]+)$',
            r'^(?:\d+)\.(?:\d+)?\s+([A-Z][A-Za-z\s]+)$',
            r'^([A-Z][A-Z\s]+)$'  # All caps headers like "BACKGROUND" or "CONCLUSION"
        ]
        
        # Split text into lines
        lines = text.split('\n')
        sections = []
        current_section = {"title": "Introduction", "content": ""}
        
        for line in lines:
            # Check if this line is a section header
            is_header = False
            for pattern in section_patterns:
                match = re.match(pattern, line.strip())
                if match:
                    # Save current section if it has content
                    if current_section["content"].strip():
                        sections.append(current_section)
                    
                    # Start new section
                    current_section = {
                        "title": line.strip(),
                        "content": ""
                    }
                    is_header = True
                    break
            
            # If not a header, add to current section content
            if not is_header:
                current_section["content"] += line + "\n"
        
        # Add the last section
        if current_section["content"].strip():
            sections.append(current_section)
            
        return sections
        
    def summarize(
        self, 
        text: str,
        max_length: Optional[int] = None,
        min_length: Optional[int] = None,
        use_sections: bool = True
    ) -> Union[str, Dict[str, Any]]:
        """
        Generate an enhanced summary of the legal document.
        
        Args:
            text: Document to summarize
            max_length: Maximum summary length
            min_length: Minimum summary length
            use_sections: Whether to use section-based summarization
            
        Returns:
            Summary text or dictionary with summary and extracted information
        """
        if not text:
            logger.warning("Empty text provided for summarization")
            return ""
            
        # Use default lengths if not specified
        max_length = max_length or self.max_length
        min_length = min_length or self.min_length
        
        # Extract key information before summarization
        extracted_info = {}
        
        # Extract citations if enabled
        if self.preserve_citations:
            citations = self._extract_citations(text)
            extracted_info["citations"] = [citation[0] for citation in citations]
            
        # Extract key legal concepts if enabled
        if self.extract_key_concepts:
            legal_concepts = self._extract_key_legal_concepts(text)
            extracted_info["legal_concepts"] = legal_concepts
            
        # Determine summarization approach based on document length
        if len(text) > 10000 and use_sections:
            logger.info("Using section-based summarization for long document")
            return self._summarize_by_sections(text, max_length, min_length, extracted_info)
        else:
            logger.info(f"Summarizing document of length {len(text)}")
            return self._generate_summary(text, max_length, min_length, extracted_info)
            
    def _generate_summary(
        self,
        text: str,
        max_length: int,
        min_length: int,
        extracted_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate a single summary with enhanced features.
        
        Args:
            text: Text to summarize
            max_length: Maximum summary length
            min_length: Minimum summary length
            extracted_info: Pre-extracted information
            
        Returns:
            Dictionary with summary and extracted information
        """
        try:
            # Generate summary
            result = self.summarizer(
                text,
                max_length=max_length,
                min_length=min_length,
                do_sample=False
            )
            
            summary = result[0]['summary_text']
            
            # Ensure important citations are preserved in the summary
            if self.preserve_citations and "citations" in extracted_info:
                for citation in extracted_info["citations"]:
                    # If an important citation is missing from the summary, consider appending it
                    if citation not in summary and citation in text[:1000]:  # Only preserve citations from the beginning
                        citation_context = self._get_citation_context(text, citation)
                        if citation_context and len(summary) + len(citation_context) <= max_length * 1.1:  # Allow slight exceeding
                            summary += f" {citation_context}"
            
            # Prepare the full result
            result = {
                "summary": summary,
                "length": len(summary),
                **extracted_info
            }
            
            return result
        except Exception as e:
            logger.error(f"Error during summarization: {e}")
            # Fallback to extractive summary
            extractive_summary = self._fallback_extractive_summary(text, max_length)
            return {
                "summary": extractive_summary,
                "length": len(extractive_summary),
                "method": "extractive_fallback",
                **extracted_info
            }
    
    def _summarize_by_sections(
        self,
        text: str,
        max_length: int,
        min_length: int,
        extracted_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate a structured summary by processing document sections.
        
        Args:
            text: Document text
            max_length: Maximum total summary length
            min_length: Minimum total summary length
            extracted_info: Pre-extracted information
            
        Returns:
            Dictionary with section summaries and extracted information
        """
        # Detect document sections
        sections = self._detect_document_sections(text)
        
        # If no sections detected, fall back to regular summarization
        if not sections or len(sections) <= 1:
            logger.info("No sections detected, using standard summarization")
            return self._generate_summary(text, max_length, min_length, extracted_info)
            
        # Allocate summary length to each section based on relative importance
        section_summaries = []
        intro_conclusion_factor = 1.5  # Give more weight to intro and conclusion
        
        # Calculate weights for sections
        weights = []
        for i, section in enumerate(sections):
            # Give more weight to intro and conclusion
            if i == 0 or i == len(sections) - 1:
                weights.append(len(section["content"]) * intro_conclusion_factor)
            else:
                weights.append(len(section["content"]))
                
        total_weight = sum(weights)
        
        # Summarize each section
        for i, (section, weight) in enumerate(zip(sections, weights)):
            # Skip empty sections
            if not section["content"].strip():
                continue
                
            # Calculate proportional length for this section
            section_max_length = max(50, int((weight / total_weight) * max_length))
            section_min_length = max(25, int((weight / total_weight) * min_length))
            
            try:
                # Generate summary for this section
                result = self.summarizer(
                    section["content"],
                    max_length=section_max_length,
                    min_length=section_min_length,
                    do_sample=False
                )
                
                section_summary = {
                    "title": section["title"],
                    "content": result[0]['summary_text']
                }
                section_summaries.append(section_summary)
            except Exception as e:
                logger.error(f"Error summarizing section {section['title']}: {e}")
                # Add extractive fallback for this section
                extractive = self._fallback_extractive_summary(section["content"], section_max_length)
                section_summary = {
                    "title": section["title"],
                    "content": extractive
                }
                section_summaries.append(section_summary)
                
        # Combine summary with extracted information
        structured_summary = {
            "sections": section_summaries,
            "full_summary": " ".join([f"{s['title']}: {s['content']}" for s in section_summaries]),
            "method": "section-based",
            **extracted_info
        }
        
        return structured_summary
    
    def _fallback_extractive_summary(self, text: str, max_length: int) -> str:
        """
        Generate a simple extractive summary as a fallback.
        
        Args:
            text: Text to summarize
            max_length: Maximum summary length
            
        Returns:
            Extractive summary
        """
        # Split into sentences
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        # Use a simple approach - take the first few sentences
        extractive_summary = ""
        for sentence in sentences[:5]:  # Take up to 5 sentences
            if len(extractive_summary) + len(sentence) <= max_length:
                extractive_summary += sentence + " "
                
        return extractive_summary.strip()
    
    def _get_citation_context(self, text: str, citation: str) -> str:
        """
        Get context around a citation.
        
        Args:
            text: Document text
            citation: Citation to find context for
            
        Returns:
            Context sentence containing the citation
        """
        # Find the citation in the text
        index = text.find(citation)
        if index == -1:
            return ""
            
        # Get the sentence containing the citation
        start = max(0, text.rfind(".", 0, index) + 1)
        end = text.find(".", index)
        if end == -1:
            end = len(text)
            
        return text[start:end + 1].strip()
        
    def build_structured_summary(self, document_text: str) -> Dict[str, Any]:
        """
        Build a comprehensive structured summary of a legal document.
        
        Args:
            document_text: Full document text
            
        Returns:
            Dictionary with structured summary information
        """
        # Extract key information
        citations = self._extract_citations(document_text)
        legal_concepts = self._extract_key_legal_concepts(document_text)
        sections = self._detect_document_sections(document_text)
        
        # Get section-based summary
        summary = self.summarize(document_text, use_sections=True)
        
        # Build enhanced result with structured information
        result = {
            "summary": summary.get("full_summary", summary.get("summary", "")),
            "sections": summary.get("sections", []),
            "citations": [c[0] for c in citations],
            "legal_concepts": legal_concepts,
            "document_structure": [s["title"] for s in sections]
        }
        
        return result
