"""
Database configuration module for JurisAI backend.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os

# Check if we're in test mode - this will be used by our test fixtures
TEST_MODE = os.environ.get("TEST_MODE", "false").lower() == "true"

# Get database URL from environment variable or use a default for local development
if TEST_MODE:
    # Use in-memory SQLite for tests
    SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
    # Create SQLAlchemy engine with SQLite-specific settings
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    # Use PostgreSQL for production
    USER = os.environ.get("POSTGRES_USER", "postgres")
    PASSWORD = os.environ.get("POSTGRES_PASSWORD", "postgres")
    HOST = os.environ.get("POSTGRES_HOST", "localhost")
    PORT = os.environ.get("POSTGRES_PORT", "5432")
    DATABASE = os.environ.get("POSTGRES_DB", "jurisai")
    
    SQLALCHEMY_DATABASE_URL = f"postgresql://{USER}:{PASSWORD}@{HOST}:{PORT}/{DATABASE}"
    # Create SQLAlchemy engine
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for declarative models
# Updated to use non-deprecated API
Base = declarative_base()

def get_db():
    """
    Dependency to get a database session.
    
    Yields:
        SQLAlchemy Session: A database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """
    Create all database tables.
    This function is used during application startup.
    """
    # Import models to ensure they are registered with the Base class
    # These imports need to be here to avoid circular import issues
    from src.models.document import LegalDocument, DocumentEntity, DocumentKeyTerm
    
    # Create tables
    Base.metadata.create_all(bind=engine)
