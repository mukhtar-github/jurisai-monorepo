"""
Routes package for JurisAI API.
"""

from src.routes.auth import router as auth_router
from src.routes.documents import router as documents_router
from src.routes.health import router as health_router
from src.routes.search import router as search_router
from src.routes.summarization import router as summarization_router

# Export routers
auth = auth_router
documents = documents_router
health = health_router
search = search_router
summarization = summarization_router
