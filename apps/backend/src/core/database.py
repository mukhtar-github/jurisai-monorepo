"""
Database configuration module for JurisAI backend.
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Check if we're in test mode - this will be used by our test fixtures
is_test_mode = os.getenv("TEST_MODE", "").lower() == "true"

# Get database URL from environment variable or use a default for local development
if is_test_mode:
    # Use in-memory SQLite for tests
    SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
    # Create SQLAlchemy engine with SQLite-specific settings
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    # Use PostgreSQL for production
    SQLALCHEMY_DATABASE_URL = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost/jurisai"
    )
    # Create SQLAlchemy engine
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for declarative models
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
