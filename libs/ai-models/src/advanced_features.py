"""
Advanced AI features integration module for JurisAI.

This module integrates all the enhanced AI capabilities including:
- Fine-tuned models on legal datasets
- Enhanced Named Entity Recognition
- Improved Document Summarization

It provides a unified interface for the application to leverage these capabilities.
"""
import logging
import os
from typing import Dict, List, Any, Optional, Union
import json

from .document_processing.legal_ner import LegalEntityRecognizer
from .summarization.enhanced_summarizer import EnhancedLegalSummarizer
from .retrieval.rag import RAGPipeline
from .finetuning.finetune import LegalModelFineTuner

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class JurisAIAdvanced:
    """
    Advanced AI capabilities for JurisAI.
    
    This class serves as the main entry point for all enhanced AI features,
    integrating fine-tuned models, improved NER, and enhanced summarization.
    """
    
    def __init__(
        self,
        models_dir: str = "./models",
        use_fine_tuned: bool = True,
        device: Optional[str] = None
    ):
        """
        Initialize JurisAI advanced features.
        
        Args:
            models_dir: Directory containing fine-tuned models
            use_fine_tuned: Whether to use fine-tuned models if available
            device: Device to run models on (cuda, cpu)
        """
        self.models_dir = models_dir
        self.use_fine_tuned = use_fine_tuned
        
        # Create models directory if it doesn't exist
        os.makedirs(models_dir, exist_ok=True)
        
        # Load model paths
        self.model_paths = self._get_model_paths(models_dir)
        
        # Initialize components with fine-tuned models if available
        logger.info("Initializing advanced AI components...")
        self._init_ner_component()
        self._init_summarizer_component()
        self._init_rag_component()
        
        logger.info("Advanced AI components initialized successfully")
        
    def _get_model_paths(self, models_dir: str) -> Dict[str, str]:
        """
        Get paths to available fine-tuned models.
        
        Args:
            models_dir: Directory to check for models
            
        Returns:
            Dictionary of model types to their paths
        """
        model_paths = {
            "ner": None,
            "summarizer": None,
            "embeddings": None,
            "llm": None
        }
        
        # Check for NER model
        ner_path = os.path.join(models_dir, "legal_ner")
        if os.path.exists(ner_path):
            model_paths["ner"] = ner_path
            
        # Check for summarizer model
        summarizer_path = os.path.join(models_dir, "legal_summarizer")
        if os.path.exists(summarizer_path):
            model_paths["summarizer"] = summarizer_path
            
        # Check for embedding model
        embeddings_path = os.path.join(models_dir, "legal_embeddings")
        if os.path.exists(embeddings_path):
            model_paths["embeddings"] = embeddings_path
            
        # Check for LLM model
        llm_path = os.path.join(models_dir, "legal_llm")
        if os.path.exists(llm_path):
            model_paths["llm"] = llm_path
            
        return model_paths
    
    def _init_ner_component(self):
        """Initialize the legal NER component."""
        try:
            ner_model = self.model_paths["ner"] if self.use_fine_tuned else None
            self.ner = LegalEntityRecognizer(model_path=ner_model)
            logger.info(f"Legal NER initialized with {'fine-tuned' if ner_model else 'base'} model")
        except Exception as e:
            logger.error(f"Failed to initialize Legal NER: {e}")
            self.ner = None
    
    def _init_summarizer_component(self):
        """Initialize the enhanced summarizer component."""
        try:
            summarizer_model = self.model_paths["summarizer"] if self.use_fine_tuned else None
            self.summarizer = EnhancedLegalSummarizer(fine_tuned_model_path=summarizer_model)
            logger.info(f"Enhanced summarizer initialized with {'fine-tuned' if summarizer_model else 'base'} model")
        except Exception as e:
            logger.error(f"Failed to initialize Enhanced Summarizer: {e}")
            self.summarizer = None
    
    def _init_rag_component(self):
        """Initialize the RAG component."""
        try:
            embedding_model = "sentence-transformers/all-mpnet-base-v2"
            if self.use_fine_tuned and self.model_paths["embeddings"]:
                embedding_model = self.model_paths["embeddings"]
                
            llm_model = "facebook/opt-1.3b"
            if self.use_fine_tuned and self.model_paths["llm"]:
                llm_model = self.model_paths["llm"]
                
            self.rag = RAGPipeline(
                embedding_model_name=embedding_model,
                llm_model_name=llm_model
            )
            logger.info(f"RAG pipeline initialized with custom models")
        except Exception as e:
            logger.error(f"Failed to initialize RAG pipeline: {e}")
            self.rag = None
    
    def extract_legal_entities(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract legal entities from document text.
        
        Args:
            text: Document text to analyze
            
        Returns:
            List of extracted legal entities with types and positions
        """
        if not self.ner:
            logger.error("Legal NER component is not available")
            return []
            
        logger.info(f"Extracting legal entities from text of length {len(text)}")
        return self.ner.extract_entities(text)
    
    def generate_legal_summary(
        self,
        document: Union[str, Dict[str, Any]],
        use_sections: bool = True
    ) -> Dict[str, Any]:
        """
        Generate an enhanced legal document summary.
        
        Args:
            document: Document text or dictionary with text and metadata
            use_sections: Whether to use section-based summarization
            
        Returns:
            Dictionary with summary and extracted information
        """
        if not self.summarizer:
            logger.error("Enhanced summarizer component is not available")
            return {"summary": "", "error": "Summarizer not available"}
            
        # Extract text from document
        if isinstance(document, str):
            text = document
            metadata = {}
        else:
            text = document.get("text", "")
            metadata = {k: v for k, v in document.items() if k != "text"}
            
        if not text:
            logger.warning("Empty document provided for summarization")
            return {"summary": "", "error": "Empty document"}
            
        logger.info(f"Generating enhanced summary for document of length {len(text)}")
        
        # Generate structured summary
        result = self.summarizer.build_structured_summary(text)
        
        # Add metadata
        result["metadata"] = metadata
        
        return result
    
    def answer_legal_question(
        self,
        question: str,
        context_docs: Optional[List[Dict[str, Any]]] = None,
        use_rag: bool = True
    ) -> Dict[str, Any]:
        """
        Answer a legal question using enhanced models.
        
        Args:
            question: Legal question to answer
            context_docs: Optional context documents to use
            use_rag: Whether to use RAG for retrieval
            
        Returns:
            Dictionary with answer and supporting information
        """
        if not self.rag:
            logger.error("RAG component is not available")
            return {"answer": "", "error": "RAG not available"}
            
        logger.info(f"Answering legal question: {question}")
        
        # If context documents provided, index them first
        if context_docs and use_rag:
            self.rag.index_documents(context_docs)
            
        try:
            # Get answer using RAG
            answer = self.rag.query(question)
            
            # Get supporting documents
            supporting_docs = self.rag.search(question)
            
            result = {
                "answer": answer,
                "supporting_documents": supporting_docs
            }
            
            return result
        except Exception as e:
            logger.error(f"Error answering question: {e}")
            return {"answer": "", "error": str(e)}
    
    def fine_tune_models(
        self,
        training_data_path: str,
        model_type: str,
        base_model: Optional[str] = None,
        epochs: int = 3
    ) -> Dict[str, Any]:
        """
        Fine-tune AI models on legal datasets.
        
        Args:
            training_data_path: Path to training data
            model_type: Type of model to fine-tune (ner, summarizer, embeddings, llm)
            base_model: Base model to start from (if None, uses default)
            epochs: Number of training epochs
            
        Returns:
            Result of fine-tuning process
        """
        logger.info(f"Starting fine-tuning for {model_type} model")
        
        # Define model paths
        output_path = os.path.join(self.models_dir, f"legal_{model_type}")
        
        try:
            if model_type == "ner":
                # Fine-tune NER model
                if not base_model:
                    base_model = "en_core_web_lg"
                    
                LegalEntityRecognizer.fine_tune_model(
                    base_model,
                    training_data_path,
                    output_path,
                    n_iter=epochs
                )
                
            elif model_type == "summarizer":
                # Fine-tune summarizer model
                if not base_model:
                    base_model = "facebook/bart-large-cnn"
                    
                # Load training data
                with open(training_data_path, "r") as f:
                    training_data = json.load(f)
                    
                # Prepare datasets
                from torch.utils.data import Dataset
                
                class SummaryDataset(Dataset):
                    def __init__(self, data):
                        self.texts = [item["text"] for item in data]
                        self.summaries = [item["summary"] for item in data]
                        
                    def __len__(self):
                        return len(self.texts)
                        
                    def __getitem__(self, idx):
                        return {
                            "text": self.texts[idx],
                            "summary": self.summaries[idx]
                        }
                
                # Create fine-tuner
                fine_tuner = LegalModelFineTuner(
                    model_name=base_model,
                    task_type="summarization",
                    output_dir=output_path
                )
                
                # Prepare dataset
                dataset = fine_tuner.prepare_legal_dataset(
                    training_data_path,
                    text_field="text",
                    label_field="summary"
                )
                
                # Fine-tune
                fine_tuner.finetune(
                    train_dataset=dataset,
                    num_train_epochs=epochs
                )
                
            elif model_type in ["embeddings", "llm"]:
                # Fine-tune embedding or LLM model
                if not base_model:
                    base_model = "sentence-transformers/all-mpnet-base-v2" if model_type == "embeddings" else "facebook/opt-1.3b"
                    
                # Create fine-tuner
                fine_tuner = LegalModelFineTuner(
                    model_name=base_model,
                    task_type="qa" if model_type == "llm" else "classification",
                    output_dir=output_path
                )
                
                # Prepare dataset
                dataset = fine_tuner.prepare_legal_dataset(
                    training_data_path,
                    text_field="text",
                    label_field="answer" if model_type == "llm" else None
                )
                
                # Fine-tune
                fine_tuner.finetune(
                    train_dataset=dataset,
                    num_train_epochs=epochs
                )
                
            else:
                return {"success": False, "error": f"Unsupported model type: {model_type}"}
                
            # Update model paths
            self.model_paths = self._get_model_paths(self.models_dir)
            
            # Reinitialize component
            if model_type == "ner":
                self._init_ner_component()
            elif model_type == "summarizer":
                self._init_summarizer_component()
            elif model_type in ["embeddings", "llm"]:
                self._init_rag_component()
                
            return {
                "success": True,
                "model_type": model_type,
                "output_path": output_path
            }
            
        except Exception as e:
            logger.error(f"Error during fine-tuning: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def analyze_legal_document(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform comprehensive analysis of a legal document.
        
        Args:
            document: Dictionary with document text and metadata
            
        Returns:
            Analysis results including summary, entities, and key concepts
        """
        text = document.get("text", "")
        if not text:
            logger.warning("Empty document provided for analysis")
            return {"error": "Empty document"}
            
        logger.info(f"Analyzing legal document of length {len(text)}")
        
        result = {
            "document_id": document.get("id", None),
            "metadata": {k: v for k, v in document.items() if k not in ["text", "id"]}
        }
        
        # Extract entities
        if self.ner:
            result["entities"] = self.extract_legal_entities(text)
            
        # Generate summary
        if self.summarizer:
            summary = self.summarizer.build_structured_summary(text)
            result["summary"] = summary
            
        return result
