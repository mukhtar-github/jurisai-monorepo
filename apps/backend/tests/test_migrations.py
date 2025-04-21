"""
Test suite for database migrations and the migration repair system.
"""
import os
import pytest
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

# Setup test environment
os.environ["TEST_MODE"] = "true"

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from src.core.database import Base, engine as app_engine, get_db

# Import migration manager
from scripts.manage_migrations import (
    check_migration_status,
    verify_tables,
    fix_migration_sequence
)

# Import models to ensure they're registered with Base
from src.models.document import LegalDocument, DocumentEntity, DocumentKeyTerm
from src.models.user import User
from src.models.role import Role
from src.models.permission import Permission


def test_migration_checking():
    """Test that migration status checking works."""
    status = check_migration_status()
    
    # Verify keys in the response
    assert "database_connected" in status
    assert status["database_connected"] is True
    
    # Since we're using SQLite in-memory for tests, expect no migrations
    assert "current_revision" in status
    assert "latest_revision" in status
    

def test_verify_tables():
    """Test table verification functionality."""
    # Create all tables directly with SQLAlchemy
    Base.metadata.create_all(app_engine)
    
    # Now verify should pass
    assert verify_tables() is True
    
    # Check tables existence
    with app_engine.connect() as conn:
        tables = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
        table_names = [table[0] for table in tables]
        
        # Verify essential tables exist
        assert "legal_documents" in table_names
        assert "users" in table_names
        assert "roles" in table_names
        assert "permissions" in table_names


def test_fix_sequence():
    """Test migration sequence fix functionality."""
    # Create a new engine for this test to have a fresh DB
    test_engine = create_engine("sqlite:///:memory:")
    
    # Replace the app engine temporarily
    original_engine = app_engine
    from src.core.database import engine
    import src.core.database
    src.core.database.engine = test_engine
    
    try:
        # Create only RBAC tables but not users to simulate the problem
        with test_engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE roles (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    description VARCHAR(255),
                    is_default INTEGER,
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP
                )
            """))
            conn.execute(text("""
                CREATE TABLE permissions (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    description VARCHAR(255),
                    resource VARCHAR(100) NOT NULL,
                    action VARCHAR(100) NOT NULL
                )
            """))
            conn.execute(text("""
                CREATE TABLE role_permission (
                    role_id INTEGER NOT NULL,
                    permission_id INTEGER NOT NULL,
                    PRIMARY KEY (role_id, permission_id)
                )
            """))
            conn.execute(text("""
                CREATE TABLE user_role (
                    user_id INTEGER NOT NULL,
                    role_id INTEGER NOT NULL,
                    PRIMARY KEY (user_id, role_id)
                )
            """))
            conn.execute(text("""
                CREATE TABLE alembic_version (
                    version_num VARCHAR(32) NOT NULL
                )
            """))
            conn.execute(text("""
                INSERT INTO alembic_version (version_num) VALUES ('a1b2c3d4e5f6')
            """))
            
        # Now run the fix function
        result = fix_migration_sequence()
        
        # Check that the fix function detected the issue
        assert result is True
        
        # Now we should be able to verify tables
        assert verify_tables() is True
        
    finally:
        # Restore the original engine
        src.core.database.engine = original_engine


if __name__ == "__main__":
    pytest.main(["-xvs", __file__])
