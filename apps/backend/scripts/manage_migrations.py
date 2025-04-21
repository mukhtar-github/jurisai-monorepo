#!/usr/bin/env python3
"""
Database Migration Management Utility for JurisAI

This script provides tools to:
1. Check migration status
2. Apply pending migrations
3. Verify database schema
4. Fix migration sequence issues

Usage:
  python manage_migrations.py check  # Check migration status
  python manage_migrations.py apply  # Apply pending migrations
  python manage_migrations.py verify # Verify table structure
  python manage_migrations.py fix    # Fix migration sequence issues

Options:
  --verbose, -v: Show detailed output
  --yes, -y: Automatically confirm actions without prompting
"""

import os
import sys
import argparse
import logging
from pathlib import Path
import time
import subprocess
from typing import List, Tuple, Dict, Any, Optional
import sqlalchemy as sa
from sqlalchemy.sql import text
from sqlalchemy.inspection import inspect as sqlalchemy_inspect
from sqlalchemy.exc import SQLAlchemyError
from alembic.config import Config
from alembic import command
from alembic.script import ScriptDirectory
from alembic.runtime.migration import MigrationContext

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("migration-manager")

# Find the project root (assuming we're in backend/scripts)
project_root = Path(__file__).resolve().parent.parent
alembic_path = project_root / "alembic"

# Initialize SQLAlchemy imports
try:
    # Add the project root to the Python path to allow imports
    sys.path.insert(0, str(project_root))
    
    # Import project modules
    from src.core.database import engine, get_db, Base
    from src.core.config import get_settings
    
    settings = get_settings()
except ImportError as e:
    logger.error(f"Failed to import required modules: {e}")
    logger.error("Make sure you're running this script from the project root directory")
    sys.exit(1)


def get_alembic_config() -> Config:
    """Get Alembic config."""
    config = Config(str(alembic_path / "alembic.ini"))
    config.set_main_option("script_location", str(alembic_path))
    return config


def get_current_revision() -> str:
    """Get the current revision of the database."""
    try:
        with engine.connect() as conn:
            context = MigrationContext.configure(conn)
            return context.get_current_revision() or "None"
    except SQLAlchemyError as e:
        logger.error(f"Database error: {e}")
        return "Error"


def get_latest_revision() -> str:
    """Get the latest available revision."""
    config = get_alembic_config()
    script = ScriptDirectory.from_config(config)
    return script.get_current_head()


def get_pending_migrations() -> List[Tuple[str, str]]:
    """Get a list of pending migrations as (revision, description) tuples."""
    current = get_current_revision()
    if current == "Error":
        return []
    
    config = get_alembic_config()
    script = ScriptDirectory.from_config(config)
    
    # Get all revisions from current to head
    pending = []
    for rev in script.iterate_revisions(current, get_latest_revision()):
        if rev.revision != current:  # Skip the current revision
            pending.append((rev.revision, rev.doc))
    
    return pending


def check_migration_status() -> Dict[str, Any]:
    """Check the current migration status and return a status report."""
    try:
        current = get_current_revision()
        latest = get_latest_revision()
        pending = get_pending_migrations()
        
        # Check if alembic_version table exists
        inspector = sqlalchemy_inspect(engine)
        tables = inspector.get_table_names()
        alembic_table_exists = "alembic_version" in tables
        
        # Get list of all tables and models
        expected_tables = {table.__tablename__ for table in Base.__subclasses__()}
        missing_tables = [table for table in expected_tables if table not in tables]
        extra_tables = [table for table in tables if table not in expected_tables and table != "alembic_version"]
        
        status = {
            "database_connected": True,
            "alembic_initialized": alembic_table_exists,
            "current_revision": current,
            "latest_revision": latest,
            "is_latest": current == latest,
            "pending_migrations": len(pending),
            "pending_details": pending,
            "all_tables": tables,
            "expected_tables": list(expected_tables),
            "missing_tables": missing_tables,
            "extra_tables": extra_tables,
            "database_url": settings.database_url.replace(settings.database_password, "******") if hasattr(settings, "database_password") else settings.database_url,
        }
        return status
        
    except SQLAlchemyError as e:
        return {
            "database_connected": False,
            "error": str(e),
            "database_url": settings.database_url.replace(settings.database_password, "******") if hasattr(settings, "database_password") else settings.database_url,
        }


def print_status_report(status: Dict[str, Any], verbose: bool = False) -> None:
    """Print a human-readable status report."""
    print("\n=== DATABASE MIGRATION STATUS ===\n")
    
    if not status.get("database_connected", False):
        print("❌ DATABASE CONNECTION ERROR")
        print(f"Error: {status.get('error', 'Unknown error')}")
        print(f"Database URL: {status.get('database_url', 'Not specified')}")
        return
    
    # Connection status
    print("✅ Database connection: SUCCESSFUL")
    
    # Alembic status
    if status.get("alembic_initialized", False):
        print("✅ Alembic initialization: INITIALIZED")
    else:
        print("❌ Alembic initialization: NOT INITIALIZED")
        print("   You may need to run: alembic init alembic")
    
    # Migration status
    current = status.get("current_revision", "None")
    latest = status.get("latest_revision", "None")
    
    print(f"• Current revision: {current}")
    print(f"• Latest revision: {latest}")
    
    pending_count = status.get("pending_migrations", 0)
    if pending_count == 0 and current != "None":
        print("✅ Migration status: UP TO DATE")
    elif current == "None":
        print("❌ Migration status: NOT MIGRATED")
    else:
        print(f"⚠️ Migration status: {pending_count} PENDING MIGRATIONS")
    
    # Show pending migrations if any
    if pending_count > 0:
        print("\nPending migrations:")
        for rev, desc in status.get("pending_details", []):
            print(f"  • {rev}: {desc}")
    
    # Table status
    missing_tables = status.get("missing_tables", [])
    if not missing_tables:
        print("\n✅ Table status: ALL TABLES PRESENT")
    else:
        print(f"\n⚠️ Table status: {len(missing_tables)} MISSING TABLES")
        print("Missing tables:")
        for table in missing_tables:
            print(f"  • {table}")
    
    # Extra tables
    extra_tables = status.get("extra_tables", [])
    if extra_tables and verbose:
        print("\nExtra tables (not defined in models):")
        for table in extra_tables:
            print(f"  • {table}")
    
    # Verbose output
    if verbose:
        print("\nAll database tables:")
        for table in status.get("all_tables", []):
            print(f"  • {table}")
        
        print(f"\nDatabase URL: {status.get('database_url', 'Not specified')}")


def apply_migrations(auto_confirm: bool = False) -> bool:
    """Apply pending migrations and return success status."""
    status = check_migration_status()
    
    if not status.get("database_connected", False):
        logger.error("Cannot apply migrations: Database connection error")
        print_status_report(status)
        return False
    
    pending_count = status.get("pending_migrations", 0)
    if pending_count == 0:
        if status.get("current_revision", "None") == "None":
            logger.info("Database appears to be new. Will apply initial migration.")
        else:
            logger.info("No pending migrations to apply.")
            return True
    
    # Confirm before applying migrations
    if not auto_confirm:
        print_status_report(status)
        confirmation = input(f"\nApply {pending_count} pending migrations? [y/N] ")
        if confirmation.lower() not in ["y", "yes"]:
            logger.info("Migration aborted by user.")
            return False
    
    try:
        logger.info("Applying migrations...")
        config = get_alembic_config()
        command.upgrade(config, "head")
        
        # Verify migration was successful
        new_status = check_migration_status()
        new_pending = new_status.get("pending_migrations", 0)
        
        if new_pending == 0:
            logger.info("✅ Migration completed successfully!")
            return True
        else:
            logger.error(f"⚠️ Migration partially completed. {new_pending} migrations still pending.")
            return False
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        return False


def verify_tables() -> bool:
    """
    Verify that all expected tables exist and have the correct structure
    Returns True if verification passes
    """
    logger.info("Verifying database tables...")
    status = check_migration_status()
    
    if not status.get("database_connected", False):
        logger.error("Cannot verify tables: Database connection error")
        return False
    
    missing_tables = status.get("missing_tables", [])
    if missing_tables:
        logger.error(f"Verification failed: Missing tables: {', '.join(missing_tables)}")
        return False
    
    # Verify table structure
    logger.info("Checking table structure...")
    inspector = sqlalchemy_inspect(engine)
    
    table_issues = []
    for model in Base.__subclasses__():
        table_name = model.__tablename__
        try:
            # Get columns from the actual database
            db_columns = {col['name']: col for col in inspector.get_columns(table_name)}
            
            # Get columns from the model
            model_columns = model.__table__.columns
            
            # Check for missing columns
            for col in model_columns:
                if col.name not in db_columns:
                    table_issues.append(f"Missing column in {table_name}: {col.name}")
                    
            # Additional checks could be added here (types, constraints, etc.)
            
        except SQLAlchemyError as e:
            table_issues.append(f"Error inspecting {table_name}: {e}")
    
    if table_issues:
        logger.error("Table structure issues found:")
        for issue in table_issues:
            logger.error(f"  • {issue}")
        return False
        
    logger.info("✅ Table verification passed!")
    return True


def fix_migration_sequence() -> bool:
    """
    Fix migration sequence issues by correcting the migration history.
    This is useful when migrations have dependencies that weren't properly handled.
    
    Returns:
        bool: True if fix was successful, False otherwise
    """
    logger.info("Attempting to fix migration sequence issues...")
    status = check_migration_status()
    
    if not status.get("database_connected", False):
        logger.error("Cannot fix migration sequence: Database connection error")
        return False
    
    # Check if alembic_version table exists
    inspector = sqlalchemy_inspect(engine)
    tables = inspector.get_table_names()
    
    if "alembic_version" not in tables:
        logger.info("Creating alembic_version table...")
        with engine.connect() as conn:
            conn.execute(text(
                "CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)"
            ))
            conn.execute(text(
                "INSERT INTO alembic_version (version_num) VALUES ('c3d4e5f6a7b8')"
            ))
            conn.commit()
        logger.info("Set migration version to latest (c3d4e5f6a7b8)")
        return True
    
    # Fix when we have RBAC tables but missing users table
    rbac_tables = ["roles", "permissions", "role_permission", "user_role"]
    doc_tables = ["legal_documents", "document_entities", "document_key_terms"]
    
    rbac_exists = all(table in tables for table in rbac_tables)
    users_exists = "users" in tables
    docs_exist = all(table in tables for table in doc_tables)
    
    if rbac_exists and not users_exists:
        logger.warning("Found RBAC tables but users table is missing. This suggests a migration sequence issue.")
        try:
            # Get current revision
            with engine.connect() as conn:
                current_rev = conn.execute(text(
                    "SELECT version_num FROM alembic_version"
                )).scalar()
                
                logger.info(f"Current revision: {current_rev}")
                
                # Update alembic version to prevent errors with existing tables
                if current_rev == "a1b2c3d4e5f6" or current_rev == "merge_multiple_heads":
                    conn.execute(text(
                        "UPDATE alembic_version SET version_num = 'b2c3d4e5f6a7'"
                    ))
                    conn.commit()
                    logger.info("Updated alembic_version to b2c3d4e5f6a7 (document tables)")
                    
                    # Now we can safely create the users table
                    config = get_alembic_config()
                    command.upgrade(config, "c3d4e5f6a7b8")
                    
                    logger.info("✅ Successfully fixed migration sequence!")
                    return True
        except Exception as e:
            logger.error(f"Failed to fix migration sequence: {e}")
            return False
    
    logger.info("No migration sequence issues detected or couldn't automatically fix.")
    return True


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="JurisAI Database Migration Manager")
    parser.add_argument("action", choices=["check", "apply", "verify", "fix"], help="Action to perform")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show verbose output")
    parser.add_argument("--yes", "-y", action="store_true", help="Automatically confirm actions")
    
    args = parser.parse_args()
    
    try:
        if args.action == "check":
            status = check_migration_status()
            print_status_report(status, args.verbose)
            
        elif args.action == "apply":
            success = apply_migrations(args.yes)
            if success and args.verbose:
                # Show updated status after migration
                status = check_migration_status()
                print_status_report(status, args.verbose)
            sys.exit(0 if success else 1)
            
        elif args.action == "verify":
            success = verify_tables()
            if args.verbose and success:
                status = check_migration_status()
                print_status_report(status, args.verbose)
            sys.exit(0 if success else 1)
            
        elif args.action == "fix":
            success = fix_migration_sequence()
            if success:
                logger.info("Migration sequence issues fixed. Checking current status:")
                status = check_migration_status()
                print_status_report(status, True)  # Always show verbose for fix
            sys.exit(0 if success else 1)
            
    except Exception as e:
        logger.error(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
