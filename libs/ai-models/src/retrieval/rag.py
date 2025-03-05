"""
RAG (Retrieval-Augmented Generation) pipeline for JurisAI.
"""
from langchain.vectorstores import FAISS
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
from langchain.llms import HuggingFacePipeline
import logging
import os
from typing import List, Dict, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RAGPipeline:
    """
    RAG Pipeline for legal document retrieval and question answering.
    
    This class implements a complete RAG pipeline using HuggingFace models 
    for embeddings and LLM, with FAISS for vector storage.
    """
    
    def __init__(
        self, 
        embedding_model_name: str = "sentence-transformers/all-mpnet-base-v2",
        llm_model_name: str = "facebook/opt-350m",  # Using a smaller model for POC
        chunk_size: int = 1000,
        chunk_overlap: int = 100
    ):
        """
        Initialize the RAG pipeline.
        
        Args:
            embedding_model_name (str): Name of the HuggingFace embedding model.
            llm_model_name (str): Name of the HuggingFace LLM model.
            chunk_size (int): Size of text chunks for splitting documents.
            chunk_overlap (int): Overlap between chunks.
        """
        logger.info(f"Initializing RAG pipeline with {embedding_model_name} and {llm_model_name}")
        
        # Initialize embeddings
        self.embeddings = HuggingFaceEmbeddings(model_name=embedding_model_name)
        
        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        
        # Initialize LLM pipeline (will be loaded on demand to save memory)
        self.llm_model_name = llm_model_name
        self.llm = None
        
        # Initialize vector store
        self.vectorstore = None
        
    def _load_llm(self):
        """
        Load the LLM model on demand.
        """
        if self.llm is not None:
            return
            
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
            
            logger.info(f"Loading LLM model: {self.llm_model_name}")
            tokenizer = AutoTokenizer.from_pretrained(self.llm_model_name)
            model = AutoModelForCausalLM.from_pretrained(self.llm_model_name)
            
            pipe = pipeline(
                "text-generation",
                model=model,
                tokenizer=tokenizer,
                max_length=512,
                temperature=0.7,
                top_p=0.9
            )
            
            self.llm = HuggingFacePipeline(pipeline=pipe)
            logger.info("LLM loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load LLM: {e}")
            raise
        
    def index_documents(self, documents: List[Dict[str, Any]]):
        """
        Index a list of documents into the vector store.
        
        Args:
            documents (List[Dict[str, Any]]): List of document dictionaries.
                Each document should have at least a 'content' field.
        """
        if not documents:
            logger.warning("No documents provided for indexing")
            return
            
        logger.info(f"Indexing {len(documents)} documents")
        
        # Split documents into chunks
        texts = []
        metadatas = []
        
        for doc in documents:
            content = doc.get("content", "")
            if not content:
                logger.warning(f"Document has no content: {doc.get('id', 'unknown')}")
                continue
                
            chunks = self.text_splitter.split_text(content)
            
            # Create metadata for each chunk
            doc_metadata = {
                k: v for k, v in doc.items() if k != "content"
            }
            
            texts.extend(chunks)
            metadatas.extend([doc_metadata] * len(chunks))
            
        if not texts:
            logger.warning("No text chunks created from documents")
            return
            
        # Create vector store
        logger.info(f"Creating vector store with {len(texts)} chunks")
        self.vectorstore = FAISS.from_texts(
            texts=texts, 
            embedding=self.embeddings,
            metadatas=metadatas
        )
        logger.info("Vector store created successfully")
        
    def save_index(self, path: str = "legal_index"):
        """
        Save the vector store to disk.
        
        Args:
            path (str): Path to save the vector store.
        """
        if not self.vectorstore:
            logger.warning("No vector store to save")
            return
            
        logger.info(f"Saving vector store to {path}")
        os.makedirs(path, exist_ok=True)
        self.vectorstore.save_local(path)
        logger.info("Vector store saved successfully")
            
    def load_index(self, path: str = "legal_index"):
        """
        Load the vector store from disk.
        
        Args:
            path (str): Path to load the vector store from.
        """
        if not os.path.exists(path):
            logger.error(f"Index path does not exist: {path}")
            raise FileNotFoundError(f"Index path does not exist: {path}")
            
        logger.info(f"Loading vector store from {path}")
        self.vectorstore = FAISS.load_local(path, self.embeddings)
        logger.info("Vector store loaded successfully")
        
    def query(self, question: str, k: int = 4) -> str:
        """
        Query the RAG pipeline with a question.
        
        Args:
            question (str): Question to ask.
            k (int): Number of document chunks to retrieve.
            
        Returns:
            str: Answer from the RAG pipeline.
        """
        if not self.vectorstore:
            raise ValueError("Vector store not initialized. Please index documents or load an index first.")
            
        # Load LLM if not already loaded
        self._load_llm()
        
        logger.info(f"Querying with: {question}")
        qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            retriever=self.vectorstore.as_retriever(search_kwargs={"k": k})
        )
        
        try:
            result = qa_chain.run(question)
            logger.info("Query completed successfully")
            return result
        except Exception as e:
            logger.error(f"Error during query: {e}")
            raise
            
    def search(self, query: str, k: int = 4) -> List[Dict[str, Any]]:
        """
        Search for documents related to a query without using the LLM.
        
        Args:
            query (str): Search query.
            k (int): Number of documents to retrieve.
            
        Returns:
            List[Dict[str, Any]]: List of relevant documents with metadata.
        """
        if not self.vectorstore:
            raise ValueError("Vector store not initialized. Please index documents or load an index first.")
            
        logger.info(f"Searching for: {query}")
        try:
            docs = self.vectorstore.similarity_search(query, k=k)
            results = [
                {
                    "text": doc.page_content,
                    "metadata": doc.metadata
                }
                for doc in docs
            ]
            logger.info(f"Search returned {len(results)} results")
            return results
        except Exception as e:
            logger.error(f"Error during search: {e}")
            raise
