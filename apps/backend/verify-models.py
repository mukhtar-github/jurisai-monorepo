"""
Verify models script to check if SQLAlchemy and Pydantic models are compatible.

Run this before deploying to Railway to ensure your models are properly configured.
"""

import importlib
import inspect
import sys
from pathlib import Path

# Add the project directory to Python path
project_dir = Path(__file__).resolve().parent
if str(project_dir) not in sys.path:
    sys.path.insert(0, str(project_dir))

# Import core modules
try:
    from src.models.user import User
    from src.schemas.user import UserResponse
    from src.routes.auth import get_current_user
    from src.routes.roles import is_admin
    from fastapi import FastAPI
    
    print("✅ Core modules imported successfully")
except ImportError as e:
    print(f"❌ Error importing core modules: {e}")
    sys.exit(1)

# Check if UserResponse can be constructed from User
try:
    # Create a test User model
    test_user = User(
        id=1,
        name="Test User",
        email="test@example.com",
        hashed_password="hashedpassword",
        role="user"
    )
    
    # Try to create a UserResponse from it
    user_response = UserResponse.from_orm(test_user)
    print(f"✅ UserResponse created from User model: {user_response}")
except Exception as e:
    print(f"❌ Error creating UserResponse from User model: {e}")
    sys.exit(1)

# Test is_admin function with UserResponse
try:
    # Test that is_admin works with UserResponse
    result = is_admin(user_response)
    print(f"✅ is_admin function works with UserResponse: {result}")
except Exception as e:
    print(f"❌ Error using is_admin with UserResponse: {e}")
    sys.exit(1)

print("\n✅ All model verification tests passed!")
print("Your models are compatible and should work in the Railway deployment.")
