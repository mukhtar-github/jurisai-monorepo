"""
Main application entry point for the JurisAI backend.
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="JurisAI API",
    description="API for JurisAI legal research and document management",
    version="0.1.0",
)

# Configure CORS
origins = [
    "http://localhost:3000",  # Local frontend
    "https://jurisai-frontend.vercel.app",  # Production frontend
]

if os.getenv("FRONTEND_URL"):
    origins.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint for health checks
@app.get("/health")
async def health_check():
    """
    Health check endpoint for the API.
    
    Returns:
        dict: Status information
    """
    return {"status": "healthy", "version": app.version}

# Import and include routers
from src.routes import documents, search, summarization

# Include routers
app.include_router(documents.router)
app.include_router(search.router)
app.include_router(summarization.router)

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("src.main:app", host="0.0.0.0", port=port, reload=True)
