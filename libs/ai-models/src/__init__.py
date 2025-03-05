"""
JurisAI AI Models Library for legal document processing and analysis.
"""
__version__ = "0.1.0"

# Import and expose key modules
from .retrieval import RAGPipeline
from .summarization import LegalDocumentSummarizer
from .document_processing import DocumentProcessor

__all__ = [
    "RAGPipeline",
    "LegalDocumentSummarizer",
    "DocumentProcessor",
]
