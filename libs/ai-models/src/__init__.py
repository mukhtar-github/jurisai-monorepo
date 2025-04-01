"""
JurisAI AI Models Library

This package provides AI model implementations for the JurisAI application,
including document processing, retrieval, and summarization capabilities.
"""

# Import core components
from .document_processing.processor import DocumentProcessor
from .retrieval.rag import RAGPipeline
from .summarization.summarizer import LegalDocumentSummarizer

# Import advanced features
from .document_processing.legal_ner import LegalEntityRecognizer
from .summarization.enhanced_summarizer import EnhancedLegalSummarizer
from .finetuning.finetune import LegalModelFineTuner
from .advanced_features import JurisAIAdvanced

# Export version
__version__ = "0.2.0"

# Export public API
__all__ = [
    "DocumentProcessor",
    "RAGPipeline",
    "LegalDocumentSummarizer",
    "LegalEntityRecognizer",
    "EnhancedLegalSummarizer",
    "LegalModelFineTuner",
    "JurisAIAdvanced"
]
