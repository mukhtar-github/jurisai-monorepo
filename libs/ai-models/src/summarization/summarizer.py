"""
Text summarization module for JurisAI.
"""
import logging
from typing import Optional
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LegalDocumentSummarizer:
    """
    Legal document summarizer using pre-trained language models.
    
    This class provides methods to summarize legal texts using
    transformer-based models from Hugging Face.
    """
    
    def __init__(
        self, 
        model_name: str = "facebook/bart-large-cnn",  # Good general summarization model
        max_length: int = 500,
        min_length: int = 100,
        device: Optional[str] = None
    ):
        """
        Initialize the summarizer with a pre-trained model.
        
        Args:
            model_name (str): Name of the HuggingFace model to use.
            max_length (int): Maximum length of generated summaries.
            min_length (int): Minimum length of generated summaries.
            device (str, optional): Device to run the model on ('cpu', 'cuda', etc.).
                If None, will use CUDA if available, otherwise CPU.
        """
        self.model_name = model_name
        self.max_length = max_length
        self.min_length = min_length
        
        # Determine device
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
            
        logger.info(f"Initializing summarizer with model {model_name} on {self.device}")
        
        # Load model and tokenizer
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
            self.model.to(self.device)
            
            # Create summarization pipeline
            self.summarizer = pipeline(
                "summarization",
                model=self.model,
                tokenizer=self.tokenizer,
                device=0 if self.device == "cuda" else -1
            )
            
            logger.info("Summarizer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize summarizer: {e}")
            raise
    
    def summarize(
        self, 
        text: str, 
        max_length: Optional[int] = None, 
        min_length: Optional[int] = None
    ) -> str:
        """
        Generate a summary of the provided text.
        
        Args:
            text (str): Text to summarize.
            max_length (int, optional): Maximum length of the summary.
                If None, uses the default set in the constructor.
            min_length (int, optional): Minimum length of the summary.
                If None, uses the default set in the constructor.
                
        Returns:
            str: Generated summary.
        """
        if not text:
            logger.warning("Empty text provided for summarization")
            return ""
            
        # Use default lengths if not specified
        max_length = max_length or self.max_length
        min_length = min_length or self.min_length
        
        # For very long texts, we need to chunk and summarize separately
        if len(text) > 10000:
            logger.info("Text is very long, chunking for summarization")
            return self._summarize_long_text(text, max_length, min_length)
            
        logger.info(f"Summarizing text of length {len(text)}")
        try:
            # Generate summary
            result = self.summarizer(
                text,
                max_length=max_length,
                min_length=min_length,
                do_sample=False
            )
            
            # Extract summary text
            summary = result[0]['summary_text']
            logger.info(f"Generated summary of length {len(summary)}")
            return summary
        except Exception as e:
            logger.error(f"Error during summarization: {e}")
            # Fall back to a simple extractive summary
            logger.info("Falling back to simple extractive summary")
            return text[:max_length]
            
    def _summarize_long_text(
        self, 
        text: str, 
        max_length: int, 
        min_length: int
    ) -> str:
        """
        Summarize a very long text by chunking it and summarizing each chunk.
        
        Args:
            text (str): Long text to summarize.
            max_length (int): Maximum length of the summary.
            min_length (int): Minimum length of the summary.
            
        Returns:
            str: Generated summary.
        """
        # Split text into chunks of 4000 characters with 200 character overlap
        chunk_size = 4000
        overlap = 200
        chunks = []
        
        for i in range(0, len(text), chunk_size - overlap):
            chunk = text[i:i + chunk_size]
            if len(chunk) > 200:  # Ensure chunk is long enough to summarize
                chunks.append(chunk)
        
        # Summarize each chunk
        chunk_summaries = []
        for i, chunk in enumerate(chunks):
            logger.info(f"Summarizing chunk {i+1}/{len(chunks)}")
            try:
                result = self.summarizer(
                    chunk,
                    max_length=max(100, max_length // len(chunks)),
                    min_length=min(50, min_length // len(chunks)),
                    do_sample=False
                )
                chunk_summaries.append(result[0]['summary_text'])
            except Exception as e:
                logger.error(f"Error summarizing chunk {i+1}: {e}")
                # Use first 100 characters as fallback
                chunk_summaries.append(chunk[:100] + "...")
        
        # Combine chunk summaries
        combined_summary = " ".join(chunk_summaries)
        
        # If the combined summary is still too long, summarize it again
        if len(combined_summary) > max_length * 2:
            logger.info("Combined summary is still long, summarizing again")
            try:
                result = self.summarizer(
                    combined_summary,
                    max_length=max_length,
                    min_length=min_length,
                    do_sample=False
                )
                final_summary = result[0]['summary_text']
                return final_summary
            except Exception as e:
                logger.error(f"Error during final summarization: {e}")
                return combined_summary[:max_length]
        
        return combined_summary
