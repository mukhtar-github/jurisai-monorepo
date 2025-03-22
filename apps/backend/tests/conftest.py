"""
Pytest configuration file for the backend tests.
"""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Set TEST_MODE environment variable before importing from the app
os.environ["TEST_MODE"] = "True"

from src.main import app
from src.core.database import Base, get_db

# Create a SQLite test database in memory
TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def test_db():
    """
    Create a fresh database for each test.
    """
    # Create the tables
    Base.metadata.create_all(bind=engine)
    
    # Create a test database session
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        
    # Drop the tables after the test is complete
    Base.metadata.drop_all(bind=engine)

def override_get_db():
    """
    Override the get_db dependency to use the test database.
    """
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Override the get_db dependency in the app
app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="function")
def client():
    """
    Create a test client for testing the API.
    """
    with TestClient(app) as test_client:
        yield test_client
