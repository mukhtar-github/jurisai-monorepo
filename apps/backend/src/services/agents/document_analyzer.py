"""
Document Analysis Agent Service
Enhanced document analysis with agent intelligence
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
from dataclasses import dataclass
import uuid
import asyncio
import logging
from sqlalchemy.orm import Session

from src.models.agent_task import AgentTask
from src.models.document import LegalDocument
from src.services.legal_summarizer import LegalDocumentSummarizer
from src.services.feature_flags import FeatureFlagService

logger = logging.getLogger(__name__)


@dataclass
class AgentTaskContext:
    """Context for agent task execution."""
    task_id: str
    user_id: Optional[int]
    document_id: int
    parameters: Dict[str, Any]


class DocumentAnalysisAgent:
    """Enhanced document analysis agent with AI capabilities."""
    
    def __init__(self, db_session: Session, feature_flags: FeatureFlagService):
        self.db = db_session
        self.feature_flags = feature_flags
        self.agent_type = "document_analyzer"
        
        # Initialize existing services
        self.summarizer = LegalDocumentSummarizer()
        
        logger.info(f"Initialized {self.agent_type} agent")
    
    async def analyze_document(self, context: AgentTaskContext) -> Dict[str, Any]:
        """Enhanced document analysis with agent intelligence."""
        
        # Update task status to processing
        await self._update_task_status(context.task_id, "processing")
        
        try:
            # Get document
            document = await self._get_document(context.document_id)
            if not document:
                raise ValueError(f"Document not found: {context.document_id}")
            
            logger.info(f"Starting analysis for document {context.document_id}")
            
            # Enhanced analysis pipeline
            results = {}
            
            # Step 1: Basic analysis (leverage existing legal summarizer)
            if self.feature_flags.is_enabled('enable_document_analysis_agent'):
                basic_summary = await self._generate_summary(document, context.parameters)
                results['summary'] = basic_summary
                logger.debug("Generated document summary")
            
            # Step 2: Agent-enhanced entity extraction
            if self.feature_flags.is_enabled('enable_enhanced_entity_extraction'):
                entities = await self._enhanced_entity_extraction(document.content)
                results['entities'] = entities
                logger.debug("Extracted enhanced entities")
            
            # Step 3: Document type classification
            if self.feature_flags.is_enabled('enable_document_classification'):
                doc_type = await self._classify_document_type(document.content)
                results['document_type'] = doc_type
                document.document_type = doc_type  # Update document type
                logger.debug(f"Classified document type: {doc_type}")
            
            # Step 4: Risk assessment (for contracts/legal docs)
            if (self.feature_flags.is_enabled('enable_risk_assessment') and 
                results.get('document_type') in ['contract', 'agreement', 'legal_document']):
                risk_analysis = await self._assess_document_risks(document.content)
                results['risk_analysis'] = risk_analysis
                logger.debug("Completed risk assessment")
            
            # Step 5: Extract legal references and citations
            legal_refs = await self._extract_legal_references(document.content)
            results['legal_references'] = legal_refs
            
            # Calculate confidence score
            confidence = self._calculate_confidence(results)
            
            # Store results in task
            await self._store_results(context.task_id, results, confidence)
            
            # Update document metadata with agent results
            await self._update_document_metadata(document, results)
            
            logger.info(f"Completed analysis for document {context.document_id} with confidence {confidence}")
            
            return {
                'task_id': context.task_id,
                'status': 'completed',
                'results': results,
                'confidence': confidence,
                'agent_type': self.agent_type,
                'document_id': context.document_id
            }
            
        except Exception as e:
            logger.error(f"Error in document analysis: {str(e)}")
            await self._handle_error(context.task_id, str(e))
            raise
    
    async def _generate_summary(self, document: LegalDocument, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Generate document summary using existing legal summarizer."""
        try:
            # Use existing legal summarizer
            max_length = parameters.get('max_summary_length', 500)
            focus_area = parameters.get('focus_area')
            preserve_citations = parameters.get('preserve_citations', True)
            
            summary = await asyncio.to_thread(
                self.summarizer.summarize_legal_document,
                document.content,
                max_length=max_length,
                focus_area=focus_area,
                preserve_citations=preserve_citations
            )
            
            return {
                'text': summary,
                'max_length': max_length,
                'focus_area': focus_area,
                'citations_preserved': preserve_citations
            }
            
        except Exception as e:
            logger.warning(f"Summary generation failed: {e}")
            return {
                'text': document.content[:500] + "..." if len(document.content) > 500 else document.content,
                'error': str(e)
            }
    
    async def _enhanced_entity_extraction(self, text: str) -> Dict[str, List[str]]:
        """Enhanced entity extraction with legal focus."""
        try:
            # Leverage existing legal summarizer patterns
            entities = {
                'parties': [],
                'dates': [],
                'monetary_amounts': [],
                'legal_references': [],
                'locations': [],
                'case_citations': [],
                'statutes': []
            }
            
            # Use legal summarizer's citation detection
            case_citations = self.summarizer._extract_case_citations(text)
            entities['case_citations'] = [match.group(0) for match in case_citations]
            
            # Extract legal sections mentioned
            legal_sections = self.summarizer._identify_legal_sections(text)
            entities['legal_references'] = list(legal_sections)
            
            # Basic entity extraction (placeholder for more sophisticated NLP)
            import re
            
            # Extract dates
            date_pattern = r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b'
            dates = re.findall(date_pattern, text)
            entities['dates'] = dates[:10]  # Limit results
            
            # Extract monetary amounts
            money_pattern = r'₦[\d,]+(?:\.\d{2})?|\$[\d,]+(?:\.\d{2})?|NGN\s?[\d,]+|\b\d+\s?(?:naira|dollars?|kobo)\b'
            amounts = re.findall(money_pattern, text, re.IGNORECASE)
            entities['monetary_amounts'] = amounts[:10]
            
            # Extract locations (Nigerian states and major cities)
            nigerian_locations = [
                'Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt', 'Benin City',
                'Kaduna', 'Jos', 'Ilorin', 'Aba', 'Onitsha', 'Warri', 'Sokoto',
                'Federal High Court', 'Court of Appeal', 'Supreme Court'
            ]
            
            for location in nigerian_locations:
                if location.lower() in text.lower():
                    entities['locations'].append(location)
            
            return entities
            
        except Exception as e:
            logger.warning(f"Entity extraction failed: {e}")
            return {'error': str(e)}
    
    async def _classify_document_type(self, text: str) -> str:
        """Classify document type for targeted analysis."""
        try:
            # Use keyword-based classification (can be enhanced with ML)
            text_lower = text.lower()
            
            # Contract indicators
            contract_keywords = ['agreement', 'contract', 'party', 'whereas', 'consideration', 'covenant']
            if sum(1 for kw in contract_keywords if kw in text_lower) >= 3:
                return 'contract'
            
            # Court judgment indicators
            judgment_keywords = ['judgment', 'ruling', 'court', 'plaintiff', 'defendant', 'held']
            if sum(1 for kw in judgment_keywords if kw in text_lower) >= 3:
                return 'court_judgment'
            
            # Legal opinion indicators
            opinion_keywords = ['legal opinion', 'advised', 'counsel', 'chambers']
            if any(kw in text_lower for kw in opinion_keywords):
                return 'legal_opinion'
            
            # Statute/Act indicators
            statute_keywords = ['act', 'law', 'section', 'subsection', 'provision']
            if sum(1 for kw in statute_keywords if kw in text_lower) >= 3:
                return 'statute'
            
            return 'legal_document'  # Default classification
            
        except Exception as e:
            logger.warning(f"Document classification failed: {e}")
            return 'unknown'
    
    async def _assess_document_risks(self, text: str) -> Dict[str, Any]:
        """Risk assessment for legal documents."""
        try:
            risks = []
            risk_level = 'low'
            recommendations = []
            
            text_lower = text.lower()
            
            # High-risk indicators
            high_risk_terms = ['penalty', 'damages', 'termination', 'breach', 'default', 'liability']
            high_risk_count = sum(1 for term in high_risk_terms if term in text_lower)
            
            # Medium-risk indicators
            medium_risk_terms = ['obligation', 'warranty', 'indemnity', 'force majeure']
            medium_risk_count = sum(1 for term in medium_risk_terms if term in text_lower)
            
            # Assess risk level
            if high_risk_count >= 3:
                risk_level = 'high'
                risks.append('Multiple high-risk clauses detected')
                recommendations.append('Detailed legal review required')
            elif high_risk_count >= 1 or medium_risk_count >= 3:
                risk_level = 'medium'
                risks.append('Potential risk clauses identified')
                recommendations.append('Legal review recommended')
            
            # Specific risk checks
            if 'unlimited liability' in text_lower:
                risks.append('Unlimited liability clause detected')
                risk_level = 'high'
            
            if 'governing law' not in text_lower and 'contract' in text_lower:
                risks.append('No governing law clause found')
                recommendations.append('Add governing law clause')
            
            return {
                'risk_level': risk_level,
                'risk_factors': risks,
                'recommendations': recommendations,
                'risk_score': min(100, (high_risk_count * 20) + (medium_risk_count * 10))
            }
            
        except Exception as e:
            logger.warning(f"Risk assessment failed: {e}")
            return {'error': str(e)}
    
    async def _extract_legal_references(self, text: str) -> Dict[str, List[str]]:
        """Extract legal references and citations."""
        try:
            # Use existing legal summarizer capabilities
            case_citations = self.summarizer._extract_case_citations(text)
            legal_sections = self.summarizer._identify_legal_sections(text)
            
            return {
                'case_citations': [match.group(0) for match in case_citations],
                'legal_sections': list(legal_sections),
                'statutes': []  # Can be enhanced
            }
            
        except Exception as e:
            logger.warning(f"Legal reference extraction failed: {e}")
            return {'error': str(e)}
    
    def _calculate_confidence(self, results: Dict[str, Any]) -> float:
        """Calculate confidence score based on results quality."""
        try:
            confidence = 0.5  # Base confidence
            
            # Increase confidence based on successful operations
            if 'summary' in results and results['summary'].get('text'):
                confidence += 0.2
            
            if 'entities' in results and results['entities']:
                confidence += 0.15
            
            if 'document_type' in results and results['document_type'] != 'unknown':
                confidence += 0.1
            
            if 'risk_analysis' in results and 'error' not in results['risk_analysis']:
                confidence += 0.05
            
            return min(1.0, confidence)
            
        except Exception:
            return 0.5
    
    async def _update_task_status(self, task_id: str, status: str):
        """Update agent task status."""
        try:
            task = self.db.query(AgentTask).filter(AgentTask.id == task_id).first()
            if task:
                task.status = status
                if status == "processing":
                    task.started_at = datetime.utcnow()
                elif status in ["completed", "failed"]:
                    task.completed_at = datetime.utcnow()
                
                self.db.commit()
                
        except Exception as e:
            logger.error(f"Failed to update task status: {e}")
    
    async def _get_document(self, document_id: int) -> Optional[LegalDocument]:
        """Retrieve document from database."""
        try:
            return self.db.query(LegalDocument).filter(LegalDocument.id == document_id).first()
        except Exception as e:
            logger.error(f"Failed to get document {document_id}: {e}")
            return None
    
    async def _store_results(self, task_id: str, results: Dict[str, Any], confidence: float):
        """Store analysis results in agent task."""
        try:
            task = self.db.query(AgentTask).filter(AgentTask.id == task_id).first()
            if task:
                task.results = results
                task.confidence = confidence
                task.status = "completed"
                task.completed_at = datetime.utcnow()
                self.db.commit()
                
        except Exception as e:
            logger.error(f"Failed to store results for task {task_id}: {e}")
    
    async def _update_document_metadata(self, document: LegalDocument, results: Dict[str, Any]):
        """Update document metadata with agent analysis results."""
        try:
            if not document.metadata:
                document.metadata = {}
            
            # Update metadata with agent results
            document.metadata['agent_analysis'] = {
                'agent_type': self.agent_type,
                'analyzed_at': datetime.utcnow().isoformat(),
                'document_type': results.get('document_type'),
                'risk_level': results.get('risk_analysis', {}).get('risk_level'),
                'entities_count': len(results.get('entities', {})),
                'citations_count': len(results.get('legal_references', {}).get('case_citations', []))
            }
            
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Failed to update document metadata: {e}")
    
    async def _handle_error(self, task_id: str, error_message: str):
        """Handle task errors."""
        try:
            task = self.db.query(AgentTask).filter(AgentTask.id == task_id).first()
            if task:
                task.status = "failed"
                task.error_message = error_message
                task.completed_at = datetime.utcnow()
                self.db.commit()
                
        except Exception as e:
            logger.error(f"Failed to handle error for task {task_id}: {e}")


def create_analysis_task(db: Session, user_id: Optional[int], document_id: int, 
                        parameters: Dict[str, Any] = None) -> AgentTask:
    """Create a new document analysis task."""
    task_id = str(uuid.uuid4())
    
    task = AgentTask(
        id=task_id,
        agent_type="document_analyzer",
        status="pending",
        user_id=user_id,
        document_id=document_id,
        parameters=parameters or {}
    )
    
    db.add(task)
    db.commit()
    db.refresh(task)
    
    return task