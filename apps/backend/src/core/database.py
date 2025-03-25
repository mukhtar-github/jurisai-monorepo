"""
Database configuration module for JurisAI backend.
"""

import os
import logging

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Check if we're in test mode - this will be used by our test fixtures
TEST_MODE = os.environ.get("TEST_MODE", "false").lower() == "true"

# Get database URL from environment variable or use a default for local development
if TEST_MODE:
    SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    # First check if DATABASE_URL is directly provided
    DATABASE_URL = os.environ.get("DATABASE_URL")
    
    if DATABASE_URL:
        logger = logging.getLogger(__name__)
        logger.info(f"Using DATABASE_URL from environment: {DATABASE_URL}")
        SQLALCHEMY_DATABASE_URL = DATABASE_URL
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
    else:
        # Use PostgreSQL for production with individual connection parameters
        USER = os.environ.get("POSTGRES_USER", "postgres")
        PASSWORD = os.environ.get("POSTGRES_PASSWORD", "postgres")
        HOST = os.environ.get("POSTGRES_HOST", "localhost")
        PORT = os.environ.get("POSTGRES_PORT", "5432")
        DATABASE = os.environ.get("POSTGRES_DB", "jurisai")

        SQLALCHEMY_DATABASE_URL = f"postgresql://{USER}:{PASSWORD}@{HOST}:{PORT}/{DATABASE}"
        logger = logging.getLogger(__name__)
        logger.warning(f"DATABASE_URL not found in environment, using constructed URL: {SQLALCHEMY_DATABASE_URL}")
        engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for declarative models
# Updated to use non-deprecated API in SQLAlchemy 2.0
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
    from src.models.document import DocumentEntity, DocumentKeyTerm, LegalDocument

    # Create tables
    Base.metadata.create_all(bind=engine)
