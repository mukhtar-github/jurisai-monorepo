"""
Document Analysis Agent for enhanced AI-powered document processing.
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from dataclasses import dataclass

from sqlalchemy.orm import Session

from src.models.agent_task import AgentTask, AgentType, TaskType, AgentTaskStatus
from src.models.document import LegalDocument
from src.models.user import User

# Import existing services if available
try:
    from src.services.legal_summarizer import get_summarizer
    SUMMARIZER_AVAILABLE = True
except ImportError:
    SUMMARIZER_AVAILABLE = False
    logging.warning("Legal summarizer not available for agent integration")

try:
    from libs.ai_models.src.document_processing import DocumentProcessor
    DOCUMENT_PROCESSOR_AVAILABLE = True
except ImportError:
    DOCUMENT_PROCESSOR_AVAILABLE = False
    logging.warning("Document processor not available for agent integration")


logger = logging.getLogger(__name__)


@dataclass
class AgentTaskContext:
    """Context for agent task execution."""
    task_id: str
    user_id: int
    document_id: Optional[int]
    parameters: Dict[str, Any]
    db_session: Session


class DocumentAnalysisAgent:
    """Enhanced document analysis agent with AI capabilities."""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.agent_type = AgentType.DOCUMENT_ANALYZER.value
        
        # Initialize available services
        self.summarizer = None
        if SUMMARIZER_AVAILABLE:
            try:
                self.summarizer = get_summarizer()
            except Exception as e:
                logger.warning(f"Failed to initialize summarizer: {e}")
        
        self.document_processor = None
        if DOCUMENT_PROCESSOR_AVAILABLE:
            try:
                self.document_processor = DocumentProcessor()
            except Exception as e:
                logger.warning(f"Failed to initialize document processor: {e}")
    
    async def analyze_document(self, context: AgentTaskContext) -> Dict[str, Any]:
        """
        Enhanced document analysis with agent intelligence.
        
        Args:
            context: Agent task context containing task details
            
        Returns:
            Dict containing analysis results
        """
        # Get the task from database
        task = self.db.query(AgentTask).filter(AgentTask.id == context.task_id).first()
        if not task:
            raise ValueError(f"Task {context.task_id} not found")
        
        # Start processing
        task.start_processing()
        self.db.commit()
        
        try:
            # Get document
            document = self.db.query(LegalDocument).filter(
                LegalDocument.id == context.document_id
            ).first()
            
            if not document:
                raise ValueError(f"Document {context.document_id} not found")
            
            # Enhanced analysis pipeline
            results = await self._perform_analysis(document, context.parameters)
            
            # Calculate confidence
            confidence = self._calculate_confidence(results)
            
            # Mark task as completed
            task.complete_successfully(results, confidence)
            
            # Update document agent status
            document.agent_processing_status = "completed"
            document.agent_last_analysis = datetime.now()
            
            self.db.commit()
            
            return {
                'task_id': context.task_id,
                'status': 'completed',
                'results': results,
                'confidence': confidence,
                'agent_type': self.agent_type
            }
            
        except Exception as e:
            logger.error(f"Error in document analysis: {str(e)}")
            task.fail_with_error(str(e))
            self.db.commit()
            raise
    
    async def _perform_analysis(self, document: LegalDocument, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Perform the actual document analysis."""
        results = {}
        
        # Step 1: Basic analysis using existing service
        if self.summarizer:
            try:
                max_length = parameters.get('summary_max_length', 500)
                basic_summary = await self._safe_summarize(document.content, max_length)
                results['summary'] = basic_summary
            except Exception as e:
                logger.warning(f"Summarization failed: {e}")
                results['summary'] = document.summary or "Summary not available"
        else:
            # Fallback to existing summary
            results['summary'] = document.summary or "Summary not available"
        
        # Step 2: Enhanced entity extraction
        entities = await self._enhanced_entity_extraction(document.content)
        results['entities'] = entities
        
        # Step 3: Document type classification
        doc_type = await self._classify_document_type(document.content, document.document_type)
        results['document_type'] = doc_type
        
        # Step 4: Risk assessment (for contracts/legal docs)
        if doc_type in ['contract', 'agreement', 'legal_document']:
            risk_analysis = await self._assess_document_risks(document.content)
            results['risk_analysis'] = risk_analysis
        
        # Step 5: Key insights extraction
        insights = await self._extract_key_insights(document.content, doc_type)
        results['insights'] = insights
        
        # Step 6: Compliance analysis
        compliance = await self._analyze_compliance(document.content, doc_type)
        results['compliance'] = compliance
        
        return results
    
    async def _safe_summarize(self, content: str, max_length: int) -> str:
        """Safely call summarization service."""
        try:
            if asyncio.iscoroutinefunction(self.summarizer.summarize):
                return await self.summarizer.summarize(content, max_length=max_length)
            else:
                return self.summarizer.summarize(content, max_length=max_length)
        except Exception as e:
            logger.warning(f"Summarization failed: {e}")
            # Fallback to simple truncation
            return content[:max_length] + "..." if len(content) > max_length else content
    
    async def _enhanced_entity_extraction(self, text: str) -> Dict[str, Any]:
        """Enhanced entity extraction with legal focus."""
        # For now, return a basic structure
        # In production, this would use NLP models
        return {
            'parties': self._extract_parties(text),
            'dates': self._extract_dates(text),
            'monetary_amounts': self._extract_amounts(text),
            'legal_references': self._extract_legal_references(text),
            'locations': self._extract_locations(text)
        }
    
    async def _classify_document_type(self, text: str, existing_type: Optional[str]) -> str:
        """Classify document type for targeted analysis."""
        if existing_type:
            return existing_type
        
        # Simple keyword-based classification
        text_lower = text.lower()
        
        if any(word in text_lower for word in ['contract', 'agreement', 'hereby agree']):
            return 'contract'
        elif any(word in text_lower for word in ['judgment', 'court', 'plaintiff', 'defendant']):
            return 'judgment'
        elif any(word in text_lower for word in ['constitution', 'act', 'law', 'section']):
            return 'legislation'
        elif any(word in text_lower for word in ['memo', 'memorandum', 'brief']):
            return 'legal_memo'
        else:
            return 'legal_document'
    
    async def _assess_document_risks(self, text: str) -> Dict[str, Any]:
        """Risk assessment for legal documents."""
        risk_factors = []
        risk_level = 'low'
        
        # Simple risk indicators
        high_risk_terms = ['penalty', 'liquidated damages', 'termination', 'breach']
        medium_risk_terms = ['obligation', 'liability', 'warranty', 'indemnify']
        
        text_lower = text.lower()
        
        for term in high_risk_terms:
            if term in text_lower:
                risk_factors.append(f"Contains high-risk term: {term}")
                risk_level = 'high'
        
        for term in medium_risk_terms:
            if term in text_lower:
                risk_factors.append(f"Contains medium-risk term: {term}")
                if risk_level == 'low':
                    risk_level = 'medium'
        
        return {
            'risk_level': risk_level,
            'risk_factors': risk_factors,
            'recommendations': self._generate_risk_recommendations(risk_level, risk_factors)
        }
    
    async def _extract_key_insights(self, text: str, doc_type: str) -> Dict[str, Any]:
        """Extract key insights based on document type."""
        insights = {
            'key_points': [],
            'action_items': [],
            'deadlines': [],
            'obligations': []
        }
        
        # Basic keyword extraction for insights
        text_lower = text.lower()
        
        # Extract potential deadlines
        import re
        date_patterns = [
            r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
            r'\b\d{1,2}\s+\w+\s+\d{4}\b',
            r'\bwithin\s+\d+\s+days?\b'
        ]
        
        for pattern in date_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            insights['deadlines'].extend(matches)
        
        return insights
    
    async def _analyze_compliance(self, text: str, doc_type: str) -> Dict[str, Any]:
        """Analyze compliance requirements and issues."""
        return {
            'compliance_areas': ['general', 'data_protection', 'contract_law'],
            'potential_issues': [],
            'recommendations': ['Review with legal counsel', 'Ensure regulatory compliance']
        }
    
    def _extract_parties(self, text: str) -> list:
        """Extract party names from text."""
        # Simplified implementation
        import re
        # Look for patterns like "between X and Y" or "X hereby agrees"
        parties = []
        
        between_pattern = r'between\s+([^,\n]+?)\s+and\s+([^,\n]+?)(?:\s|,|\.)'
        matches = re.findall(between_pattern, text, re.IGNORECASE)
        for match in matches:
            parties.extend([match[0].strip(), match[1].strip()])
        
        return list(set(parties))  # Remove duplicates
    
    def _extract_dates(self, text: str) -> list:
        """Extract dates from text."""
        import re
        date_patterns = [
            r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
            r'\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b'
        ]
        
        dates = []
        for pattern in date_patterns:
            dates.extend(re.findall(pattern, text, re.IGNORECASE))
        
        return dates
    
    def _extract_amounts(self, text: str) -> list:
        """Extract monetary amounts from text."""
        import re
        amount_patterns = [
            r'₦[\d,]+(?:\.\d{2})?',  # Nigerian Naira
            r'\$[\d,]+(?:\.\d{2})?',  # US Dollar
            r'£[\d,]+(?:\.\d{2})?',   # British Pound
            r'€[\d,]+(?:\.\d{2})?',   # Euro
        ]
        
        amounts = []
        for pattern in amount_patterns:
            amounts.extend(re.findall(pattern, text))
        
        return amounts
    
    def _extract_legal_references(self, text: str) -> list:
        """Extract legal case/statute references."""
        import re
        # Simple pattern for case citations and statutes
        patterns = [
            r'\b\w+\s+v\.?\s+\w+\b',  # Case citations
            r'\b(?:Section|Sec\.)\s+\d+[a-z]?\b',  # Section references
            r'\b\d{4}\s+\w+\s+\d+\b'  # Year-based references
        ]
        
        references = []
        for pattern in patterns:
            references.extend(re.findall(pattern, text, re.IGNORECASE))
        
        return references
    
    def _extract_locations(self, text: str) -> list:
        """Extract location references."""
        # Simple implementation - in production would use NER
        common_locations = [
            'Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt', 'Benin City',
            'Nigeria', 'United States', 'United Kingdom', 'Ghana', 'Kenya'
        ]
        
        locations = []
        text_lower = text.lower()
        
        for location in common_locations:
            if location.lower() in text_lower:
                locations.append(location)
        
        return locations
    
    def _generate_risk_recommendations(self, risk_level: str, risk_factors: list) -> list:
        """Generate recommendations based on risk assessment."""
        recommendations = []
        
        if risk_level == 'high':
            recommendations.extend([
                'Seek immediate legal counsel review',
                'Consider risk mitigation strategies',
                'Review penalty and termination clauses carefully'
            ])
        elif risk_level == 'medium':
            recommendations.extend([
                'Legal review recommended',
                'Clarify obligations and warranties',
                'Ensure compliance procedures are in place'
            ])
        else:
            recommendations.extend([
                'Standard legal review process',
                'Document compliance procedures'
            ])
        
        return recommendations
    
    def _calculate_confidence(self, results: Dict[str, Any]) -> float:
        """Calculate confidence score based on results quality."""
        confidence_factors = []
        
        # Base confidence
        base_confidence = 0.7
        
        # Adjust based on available data
        if results.get('summary'):
            confidence_factors.append(0.1)
        
        if results.get('entities', {}).get('parties'):
            confidence_factors.append(0.05)
        
        if results.get('document_type') != 'legal_document':
            confidence_factors.append(0.1)  # Successfully classified
        
        if results.get('risk_analysis', {}).get('risk_factors'):
            confidence_factors.append(0.05)
        
        final_confidence = min(base_confidence + sum(confidence_factors), 1.0)
        return round(final_confidence, 2)


# Factory function for dependency injection
def get_document_analysis_agent(db: Session) -> DocumentAnalysisAgent:
    """Factory function to create document analysis agent."""
    return DocumentAnalysisAgent(db)