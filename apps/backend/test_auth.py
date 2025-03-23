"""
Simple test script for JWT authentication in the JurisAI backend.
This script directly tests the authentication logic without needing to start the server.
"""

import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError

# Use the same secret key as in your .env file
SECRET_KEY = "924ecd35d11f6719eefeef3885206bb232af090a46b32db85de6ff987c5eb8dc"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create a JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str):
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return {"error": "Token missing user ID"}
        return {"valid": True, "user_id": user_id}
    except JWTError as e:
        return {"error": f"Invalid token: {str(e)}"}

def main():
    # Test creating a token
    print("=== JWT Authentication Test ===")
    user_id = 1
    # Convert user_id to string when creating the token
    token = create_access_token(data={"sub": str(user_id)})
    print(f"Created token for user {user_id}:")
    print(f"Token: {token}")
    
    # Test validating the token
    print("\nValidating token...")
    result = decode_token(token)
    if "valid" in result:
        print(f"✅ Token is valid! User ID: {result['user_id']}")
    else:
        print(f"❌ Token validation failed: {result['error']}")
    
    # Test an invalid token
    print("\nTesting invalid token...")
    bad_token = token + "invalid"
    result = decode_token(bad_token)
    if "error" in result:
        print(f"✅ Correctly rejected invalid token: {result['error']}")
    else:
        print("❌ Failed: Invalid token was accepted")
    
    # Test with expired token
    print("\nTesting expired token...")
    # Convert user_id to string for expired token too
    expired_token = create_access_token(data={"sub": str(user_id)}, expires_delta=timedelta(seconds=-1))
    result = decode_token(expired_token)
    if "error" in result:
        print(f"✅ Correctly rejected expired token: {result['error']}")
    else:
        print("❌ Failed: Expired token was accepted")

if __name__ == "__main__":
    main()
