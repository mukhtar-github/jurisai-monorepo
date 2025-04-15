"""
Legal document summarization service for JurisAI.

This module provides specialized AI-based summarization for Nigerian legal documents with:
- Section-based processing
- Citation preservation
- Legal terminology handling
- Focus area filtering
"""

import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Tuple
import os
import httpx

import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Tuple

import httpx
from fastapi import HTTPException

# Configure logging
logger = logging.getLogger(__name__)


class LegalDocumentSummarizer:
    """
    Specialized summarizer for Nigerian legal documents.
    
    This class implements document preprocessing, citation detection, and
    section-based summarization specifically optimized for Nigerian legal context.
    """

    # Common Nigerian legal document section markers
    SECTION_MARKERS = [
        "JUDGMENT", "RULING", "HELD", "FACTS", "ISSUES FOR DETERMINATION",
        "RATIO DECIDENDI", "OBITER DICTUM", "JUDGMENT DELIVERED BY",
        "REPRESENTATION", "SUMMARY OF FACTS", "DECISION", "ORDER"
    ]
    
    # Nigerian case citation patterns
    CITATION_PATTERNS = [
        r'\[\d{4}\]\s+\w+\s+\d+',                # [2019] LPELR 12345
        r'\(\d{4}\)\s+\d+\s+\w+\s+\d+',          # (2020) 15 NWLR 123
        r'\d{4}\s+\w+\s+\d+',                    # 2018 NCLR 223
        r'[A-Z]+/\d+/\d{4}',                     # CA/L/142/2019
        r'[A-Z]+/[A-Z]+/\d+/\d{4}',              # SC/CV/124/2020
        r'LN-[A-Za-z0-9-]+',                     # LN-e-LR-12345
        r'[A-Z]+\s+NO\.\s*\d+\s+OF\s+\d{4}'      # SUIT NO. 123 OF 2018
    ]
    
    def __init__(self, model_name: str = None, api_key: str = None):
        """
        Initialize the legal document summarizer.
        
        Args:
            model_name: Name of the language model to use for summarization
            api_key: API key for accessing language model services
        """
        self.model_name = model_name or "jurisai-legal-summarizer"
        self.api_key = api_key
        self.endpoint = "https://api.jurisai.com/v1/summarize"
        
        # Compile citation patterns for faster matching
        self.citation_regex = re.compile("|".join(self.CITATION_PATTERNS), re.IGNORECASE)
        
        logger.info(f"Initialized LegalDocumentSummarizer with model: {self.model_name}")
    
    def preprocess_document(self, text: str) -> Dict[str, Any]:
        """
        Preprocess a legal document for summarization.
        
        Args:
            text: Raw document text content
            
        Returns:
            dict: Preprocessed document with sections and metadata
        """
        if not text or not isinstance(text, str):
            raise ValueError("Document text must be a non-empty string")
            
        # Extract all citations for preservation
        citations = self._extract_citations(text)
        
        # Split document into sections
        sections = self._split_into_sections(text)
        
        # Extract metadata (court, parties, date, etc.)
        metadata = self._extract_metadata(text)
        
        logger.debug(f"Preprocessed document: {len(sections)} sections, {len(citations)} citations")
        
        return {
            "sections": sections,
            "citations": citations,
            "metadata": metadata
        }
    
    def _extract_citations(self, text: str) -> List[str]:
        """
        Extract legal citations from document text.
        
        Args:
            text: Document text
            
        Returns:
            list: Extracted citations
        """
        matches = set(self.citation_regex.findall(text))
        return list(matches)
    
    def _split_into_sections(self, text: str) -> List[Dict[str, Any]]:
        """
        Split document into logical sections based on legal document structure.
        
        Args:
            text: Document text
            
        Returns:
            list: Document sections with title and content
        """
        # Create a regex pattern to find section markers
        section_pattern = r'\b(' + '|'.join(self.SECTION_MARKERS) + r')\b'
        
        # Split the document at section markers
        matches = list(re.finditer(section_pattern, text))
        
        if not matches:
            # If no sections detected, treat entire document as one section
            return [{"title": "DOCUMENT", "content": text}]
        
        sections = []
        for i, match in enumerate(matches):
            title = match.group(0)
            start_pos = match.start()
            
            # Calculate the end position (start of next section or end of text)
            end_pos = matches[i+1].start() if i < len(matches) - 1 else len(text)
            
            # Extract section content
            content = text[start_pos:end_pos].strip()
            
            sections.append({
                "title": title,
                "content": content
            })
            
        return sections
    
    def _extract_metadata(self, text: str) -> Dict[str, Any]:
        """
        Extract document metadata (court, date, parties, etc.).
        
        Args:
            text: Document text
            
        Returns:
            dict: Document metadata
        """
        # Simple metadata extraction (can be enhanced with more sophisticated logic)
        metadata = {
            "court": None,
            "date": None,
            "parties": [],
            "judges": []
        }
        
        # Look for court information
        court_patterns = [
            r'IN THE (\w+ COURT OF \w+)',
            r'IN THE (SUPREME COURT OF NIGERIA)',
            r'IN THE (COURT OF APPEAL)',
            r'IN THE (HIGH COURT OF \w+)'
        ]
        
        for pattern in court_patterns:
            match = re.search(pattern, text[:1000], re.IGNORECASE)
            if match:
                metadata["court"] = match.group(1)
                break
                
        # Look for date
        date_pattern = r'(\d{1,2})(?:st|nd|rd|th)? (\w+),? (\d{4})'
        date_match = re.search(date_pattern, text[:1000])
        if date_match:
            day, month, year = date_match.groups()
            metadata["date"] = f"{day} {month} {year}"
            
        return metadata
        
    async def summarize(
        self, 
        content: str, 
        max_length: int = 1000, 
        focus_area: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive summary of a legal document.
        
        Args:
            content: Document content to summarize
            max_length: Maximum length of summary
            focus_area: Optional area to focus summarization on
            
        Returns:
            dict: Document summary with key points, content, and citations
        """
        if not content:
            raise ValueError("Document content cannot be empty")
            
        try:
            # Preprocess the document
            preprocessed = self.preprocess_document(content)
            
            # Filter sections based on focus area if specified
            if focus_area:
                relevant_sections = [
                    s for s in preprocessed["sections"] 
                    if self._is_relevant_to_focus(s, focus_area)
                ]
            else:
                relevant_sections = preprocessed["sections"]
                
            if not relevant_sections:
                logger.warning(f"No relevant sections found for focus area: {focus_area}")
                return {
                    "summary": "No relevant content found for the specified focus area.",
                    "key_points": [],
                    "citations": preprocessed["citations"]
                }
                
            # For MVP, use API-based summarization
            summaries = await self._generate_summaries(relevant_sections, max_length)
            
            # Extract key points
            key_points = self._extract_key_points(summaries)
            
            # Combine section summaries
            full_summary = "\n\n".join(summaries)
            
            # Ensure all citations are preserved
            full_summary = self._ensure_citations_preserved(
                full_summary, 
                preprocessed["citations"]
            )
            
            return {
                "summary": full_summary,
                "key_points": key_points,
                "citations": preprocessed["citations"],
                "metadata": preprocessed["metadata"]
            }
            
        except Exception as e:
            logger.error(f"Error in document summarization: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to summarize document: {str(e)}"
            )
    
    def _is_relevant_to_focus(self, section: Dict[str, str], focus_area: str) -> bool:
        """
        Determine if a section is relevant to the focus area.
        
        Args:
            section: Document section
            focus_area: Focus area to check relevance against
            
        Returns:
            bool: True if section is relevant to focus area
        """
        # For MVP, use simple keyword matching
        # This can be enhanced with embedding-based similarity in the future
        focus_keywords = focus_area.lower().split()
        content = section["content"].lower()
        title = section["title"].lower()
        
        # Check if any focus keyword appears in title or content
        for keyword in focus_keywords:
            if keyword in title or keyword in content:
                return True
                
        return False
    
    async def _generate_summaries(
        self, 
        sections: List[Dict[str, str]], 
        max_length: int
    ) -> List[str]:
        """
        Generate summaries for document sections.
        
        Args:
            sections: Document sections
            max_length: Maximum length of combined summary
            
        Returns:
            list: Section summaries
        """
        # For MVP, we use a simple API-based approach
        # This can be replaced with local model inference later
        
        try:
            # Calculate max length per section
            per_section_length = max(100, max_length // len(sections))
            
            summaries = []
            for section in sections:
                prompt = (
                    f"Summarize the following Nigerian legal document section titled '{section['title']}', "
                    f"preserving key legal points and citations:\n\n{section['content']}"
                )
                
                # Call API for summarization
                summary = await self._call_summarization_api(
                    prompt, 
                    per_section_length
                )
                
                summaries.append(summary)
                
            return summaries
                
        except Exception as e:
            logger.error(f"Error generating summaries: {str(e)}")
            # Fallback to a simple extractive summary method
            return self._generate_extractive_summaries(sections, max_length)
    
    async def _call_summarization_api(self, prompt: str, max_length: int) -> str:
        """
        Call external API for summarization.
        
        Args:
            prompt: Summarization prompt
            max_length: Maximum summary length
            
        Returns:
            str: Generated summary
        """
        try:
            # Get API key from environment
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                logger.warning("OpenAI API key not found. Using fallback summarization.")
                return self._generate_extractive_summary_fallback(prompt, max_length)
            
            model = os.getenv("OPENAI_MODEL_NAME", "gpt-3.5-turbo")
            
            # Make request to OpenAI
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": [
                            {
                                "role": "system", 
                                "content": "You are a specialized Nigerian legal document summarizer. Preserve all legal citations and key legal points. Focus on the core legal principles and reasoning."
                            },
                            {"role": "user", "content": prompt}
                        ],
                        "max_tokens": max_length,
                        "temperature": 0.3  # Lower temperature for more factual responses
                    }
                )
                
                if response.status_code != 200:
                    logger.error(f"OpenAI API error: {response.text}")
                    raise Exception(f"API error: {response.status_code}")
                    
                result = response.json()
                return result["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {str(e)}")
            # Fall back to extractive summary
            return self._generate_extractive_summary_fallback(prompt, max_length)
            
    def _generate_extractive_summary_fallback(self, prompt: str, max_length: int) -> str:
        """
        Generate a simple extractive summary as fallback when API fails.
        
        Args:
            prompt: Original prompt with text to summarize
            max_length: Maximum length for summary
            
        Returns:
            str: Extractive summary
        """
        # Extract the document content from the prompt (after the instruction)
        content = prompt.split("\n\n", 1)[-1]
        
        # Simple extractive approach: take first few sentences up to max_length
        sentences = re.split(r'(?<=[.!?])\s+', content)
        
        summary = ""
        for sentence in sentences:
            if len(summary) + len(sentence) <= max_length:
                summary += sentence + " "
            else:
                break
                
        return summary.strip()
    
    def _generate_extractive_summaries(
        self, 
        sections: List[Dict[str, str]], 
        max_length: int
    ) -> List[str]:
        """
        Generate extractive summaries as fallback method.
        
        Args:
            sections: Document sections
            max_length: Maximum summary length
            
        Returns:
            list: Extractive summaries
        """
        # Simple extractive summarization by selecting key sentences
        summaries = []
        
        for section in sections:
            content = section["content"]
            # Split into sentences
            sentences = re.split(r'(?<=[.!?])\s+', content)
            
            # Take the first sentence and approximately 20% of key sentences
            key_sentences = [sentences[0]]
            
            if len(sentences) > 1:
                # Select sentences with citations or key terms
                for sentence in sentences[1:]:
                    if (
                        self.citation_regex.search(sentence) or
                        any(marker.lower() in sentence.lower() for marker in ["held", "ruled", "decided", "therefore"])
                    ):
                        key_sentences.append(sentence)
            
            # Limit to fit max length
            summary = " ".join(key_sentences)
            if len(summary) > max_length // len(sections):
                summary = summary[:max_length // len(sections)] + "..."
                
            summaries.append(summary)
            
        return summaries
    
    def _extract_key_points(self, summaries: List[str]) -> List[str]:
        """
        Extract key points from generated summaries.
        
        Args:
            summaries: Section summaries
            
        Returns:
            list: Key points extracted from summaries
        """
        # For MVP, extract sentences containing key legal indicators
        key_indicators = [
            "held that", "ruled that", "found that", "decided that", 
            "concluded that", "determined that", "ordered that"
        ]
        
        key_points = []
        
        for summary in summaries:
            sentences = re.split(r'(?<=[.!?])\s+', summary)
            
            for sentence in sentences:
                for indicator in key_indicators:
                    if indicator in sentence.lower():
                        # Clean and format the key point
                        point = sentence.strip()
                        if point and len(point) > 20:  # Avoid very short fragments
                            key_points.append(point)
                            break
        
        # Limit to reasonable number of key points
        return key_points[:5]
    
    def _ensure_citations_preserved(self, summary: str, citations: List[str]) -> str:
        """
        Ensure all important citations are preserved in the summary.
        
        Args:
            summary: Generated summary
            citations: Extracted citations from original document
            
        Returns:
            str: Summary with preserved citations
        """
        if not citations:
            return summary
            
        # Check if citations are present in the summary
        missing_citations = []
        for citation in citations:
            if citation not in summary:
                missing_citations.append(citation)
                
        if missing_citations:
            # Add missing citations section
            summary += "\n\nRelevant Citations: " + ", ".join(missing_citations)
            
        return summary


# Create a singleton instance
legal_summarizer = LegalDocumentSummarizer()
