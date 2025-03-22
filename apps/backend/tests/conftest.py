"""
Pytest configuration file for the backend tests.
"""

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Set TEST_MODE environment variable before importing from the app
os.environ["TEST_MODE"] = "true"

from src.core.database import Base, get_db
from src.main import app

# Create a SQLite test database in memory
# Using a shared in-memory database with a single connection via StaticPool
# which is thread-safe and maintains a single connection throughout the test session
TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Create all tables at the module level
Base.metadata.create_all(bind=engine)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def test_db():
    """
    Create a fresh database session for each test.
    """
    # Create a test database session
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


# Override the get_db dependency at the module level to avoid creating
# multiple connections in different threads
def override_get_db():
    """
    Override the get_db dependency to use the test database.
    """
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


# Apply the override once, at module import time
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
def client():
    """
    Create a test client for testing the API.
    """
    with TestClient(app) as test_client:
        yield test_client
