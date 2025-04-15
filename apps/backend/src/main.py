"""
Main FastAPI application entry point.
"""

import logging
import os
from contextlib import asynccontextmanager
from typing import List

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import database
from src.core.database import create_tables

# Import middleware
from src.middleware import RequestLoggingMiddleware
from src.middleware.permission import PermissionMiddleware

# Import routers
from src.routes import documents, health, search, summarization, auth
from src.routes.roles import router as roles_router
from src.routes.permissions import router as permissions_router
from src.routes.system import router as system_router
from src.routes.admin import router as admin_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Define CORS settings
origins = [
    "http://localhost",
    "http://localhost:3000",  # Frontend
    "http://localhost:8000",  # Backend
    "http://localhost:8080",  # Alternative frontend
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:8080",
]

if os.getenv("FRONTEND_URL"):
    origins.append(os.getenv("FRONTEND_URL"))

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Define startup and shutdown events for the application.
    This replaces the deprecated on_event handlers.
    """
    # Startup actions
    logger.info("Starting up JurisAI API")
    create_tables()
    
    yield  # This yield separates startup from shutdown logic
    
    # Shutdown actions
    logger.info("Shutting down JurisAI API")


# Initialize FastAPI app
app = FastAPI(
    title="JurisAI API",
    description="Legal document management and analysis API",
    version="0.1.0",
    lifespan=lifespan,
)

# Add middlewares
app.add_middleware(RequestLoggingMiddleware)  # Add request logging middleware
app.add_middleware(PermissionMiddleware)  # Add permission middleware

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(documents)
# app.include_router(search)  # Not essential for first MVP
app.include_router(summarization)
app.include_router(health)
# app.include_router(auth)  # Will be added in future iterations
# app.include_router(roles_router)  # Not needed for pilot
# app.include_router(permissions_router)  # Not needed for pilot
# app.include_router(system_router)  # Not needed for pilot
# app.include_router(admin_router)  # Not needed for pilot

# Check for AI models
try:
    from libs.ai_models import __version__ as ai_models_version

    logger.info(f"AI models library is available (version: {ai_models_version})")

    # Try to load spaCy model if needed
    try:
        import spacy

        if not spacy.util.is_package("en_core_web_sm"):
            logger.warning(
                "spaCy model 'en_core_web_sm' not found. Will use basic NLP capabilities."
            )
            logger.info(
                "To install the model, run: python -m spacy download en_core_web_sm"
            )
    except ImportError:
        logger.warning("spaCy not available. Advanced NLP features will be limited.")

except ImportError:
    logger.warning("AI models library not available. Using basic document processing.")


@app.get("/", tags=["root"])
async def read_root():
    """Root endpoint for the API."""
    return {
        "app": "JurisAI API",
        "version": app.version,
        "status": "active",
        "docs_url": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("src.main:app", host="0.0.0.0", port=port, reload=True)
