"""
Routes package for JurisAI API.
"""

from src.routes.auth import router as auth
from src.routes.documents import router as documents
from src.routes.health import router as health
from src.routes.search import router as search
from src.routes.summarization import router as summarization
