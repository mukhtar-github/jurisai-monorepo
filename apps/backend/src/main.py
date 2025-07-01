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
from src.routes.feature_flags import router as feature_flags_router
from src.routes.agents import router as agents_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Define CORS settings
origins = [
    "http://localhost",
    "http://localhost:3000",  # Frontend development
    "http://localhost:8000",  # Backend development
    "http://localhost:8080",  # Alternative frontend
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:8080",
    "https://jurisai-monorepo-it54.vercel.app",  # Production frontend
]

# Add additional frontend URLs from environment
if os.getenv("FRONTEND_URL"):
    frontend_urls = os.getenv("FRONTEND_URL").split(",")
    origins.extend([url.strip() for url in frontend_urls])

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


# Initialize FastAPI app with Railway redirect fix
app = FastAPI(
    title="JurisAI API",
    description="Legal document management and analysis API",
    version="0.1.0",
    lifespan=lifespan,
    redirect_slashes=False  # Fix Railway health check redirects
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
app.include_router(feature_flags_router)  # Feature flags for agent system
app.include_router(agents_router)  # AI agent routes
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


# Railway-optimized health check endpoints
@app.get("/health")
@app.get("/health/")
async def railway_health_check():
    """Simple health check for Railway deployment."""
    return {"status": "healthy", "service": "jurisai-api"}


@app.get("/healthz")
@app.get("/healthz/")  
async def kubernetes_style_health():
    """Kubernetes-style health check."""
    return {"status": "OK"}


@app.get("/ready")
@app.get("/ready/")
async def readiness_check():
    """Readiness check for Railway."""
    return {"status": "ready", "service": "jurisai-api"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("src.main:app", host="0.0.0.0", port=port, reload=True)
