#!/usr/bin/env python
"""
Setup script for downloading and configuring lightweight LLM models for JurisAI.
This script is designed to be run during the deployment process to Railway.

It will:
1. Check available disk space and memory
2. Download appropriate model variants based on available resources
3. Configure the application to use the downloaded models
"""

import os
import logging
import sys
import shutil
import psutil
from pathlib import Path
import subprocess
import json
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("model_setup")

# Debug information about environment
logger.info(f"Current working directory: {os.getcwd()}")
logger.info(f"Python executable: {sys.executable}")
logger.info(f"Python path: {sys.path}")
logger.info(f"Directory contents: {os.listdir('.')}")
if os.path.exists('./scripts'):
    logger.info(f"Scripts directory contents: {os.listdir('./scripts')}")

# Model configuration
DEFAULT_EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
LIGHTWEIGHT_RAG_MODEL = "BAAI/bge-small-en-v1.5"
FALLBACK_MODEL = "distilbert-base-uncased"

# Get environment variables
MODEL_CACHE_DIR = os.environ.get("MODEL_CACHE_DIR", "./models")
MAX_MODEL_SIZE_GB = float(os.environ.get("MAX_MODEL_SIZE_GB", "3"))
USE_LIGHTWEIGHT_MODELS = os.environ.get("USE_LIGHTWEIGHT_MODELS", "true").lower() == "true"


def check_system_resources():
    """Check available system resources for model deployment."""
    # Check available disk space
    disk_usage = shutil.disk_usage("/")
    free_disk_gb = disk_usage.free / (1024 ** 3)
    
    # Check available memory
    memory_info = psutil.virtual_memory()
    free_memory_gb = memory_info.available / (1024 ** 3)
    
    logger.info(f"Available disk space: {free_disk_gb:.2f} GB")
    logger.info(f"Available memory: {free_memory_gb:.2f} GB")
    
    return {
        "free_disk_gb": free_disk_gb,
        "free_memory_gb": free_memory_gb
    }


def install_model(model_name):
    """Install a model from Hugging Face."""
    try:
        logger.info(f"Installing model: {model_name}")
        
        # Ensure huggingface_hub is installed
        try:
            import huggingface_hub
            logger.info("huggingface_hub is already installed")
        except ImportError:
            logger.info("Installing huggingface_hub package...")
            subprocess.run(
                [
                    sys.executable, 
                    "-m", 
                    "pip", 
                    "install", 
                    "huggingface_hub"
                ],
                check=True
            )
            # Now import should work
            import huggingface_hub
            logger.info("huggingface_hub installed successfully")
        
        # Create model directory if it doesn't exist
        os.makedirs(MODEL_CACHE_DIR, exist_ok=True)
        logger.info(f"Model directory created: {MODEL_CACHE_DIR}")
        
        # Download the model
        from huggingface_hub import snapshot_download
        
        logger.info(f"Downloading model {model_name} to {MODEL_CACHE_DIR}")
        model_path = snapshot_download(
            repo_id=model_name,
            cache_dir=MODEL_CACHE_DIR,
            local_dir=os.path.join(MODEL_CACHE_DIR, model_name.split("/")[-1])
        )
        
        logger.info(f"Successfully installed model {model_name} to {model_path}")
        return model_path
    except Exception as e:
        logger.error(f"Error installing model {model_name}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return None


def select_appropriate_models(resources):
    """Select appropriate models based on available resources."""
    models_to_install = {}
    
    if USE_LIGHTWEIGHT_MODELS:
        # Always use lightweight models on Railway
        models_to_install["embeddings"] = DEFAULT_EMBEDDING_MODEL
        
        if resources["free_disk_gb"] >= MAX_MODEL_SIZE_GB and resources["free_memory_gb"] >= 1.5:
            # We have enough resources for the small RAG model
            models_to_install["rag"] = LIGHTWEIGHT_RAG_MODEL
        else:
            # Fall back to the smallest model
            models_to_install["rag"] = FALLBACK_MODEL
            logger.warning("Limited resources detected, using minimal models only")
    else:
        # Use default models (not recommended for Railway unless using larger instances)
        models_to_install["embeddings"] = DEFAULT_EMBEDDING_MODEL
        
        if resources["free_disk_gb"] >= 6 and resources["free_memory_gb"] >= 4:
            # We have enough resources for a medium-sized model
            models_to_install["rag"] = "sentence-transformers/all-mpnet-base-v2"
        else:
            # Fall back to lightweight
            models_to_install["rag"] = LIGHTWEIGHT_RAG_MODEL
            logger.warning("Insufficient resources for standard models, falling back to lightweight")
    
    return models_to_install


def write_model_config(models):
    """Write model configuration to a file that the application can read."""
    config_file = os.path.join(MODEL_CACHE_DIR, "model_config.json")
    os.makedirs(MODEL_CACHE_DIR, exist_ok=True)
    
    with open(config_file, "w") as f:
        json.dump(models, f, indent=2)
    
    logger.info(f"Wrote model configuration to {config_file}")
    return config_file


def main():
    """Main function to set up models."""
    logger.info("Starting JurisAI model setup")
    
    # Ensure model directory exists
    os.makedirs(MODEL_CACHE_DIR, exist_ok=True)
    
    # Check system resources
    resources = check_system_resources()
    
    # Select appropriate models
    models_to_install = select_appropriate_models(resources)
    logger.info(f"Selected models: {models_to_install}")
    
    # Install models
    installed_models = {}
    for model_type, model_name in models_to_install.items():
        model_path = install_model(model_name)
        if model_path:
            installed_models[model_type] = {
                "name": model_name,
                "path": model_path
            }
    
    # Write model configuration
    config_file = write_model_config(installed_models)
    
    logger.info("Model setup complete!")
    return installed_models


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logger.error(f"Error during model setup: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        sys.exit(1)
