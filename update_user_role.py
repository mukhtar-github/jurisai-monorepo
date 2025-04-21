import os
import sys
from sqlalchemy import create_engine, text

# Check if DATABASE_URL is provided
if len(sys.argv) < 2:
    print("Usage: python update_user_role.py <DATABASE_URL>")
    print("Example: python update_user_role.py postgresql://postgres:password@containers-us-west-123.railway.app:5432/railway")
    sys.exit(1)

# Get DATABASE_URL from command line argument
database_url = sys.argv[1]

# Create SQLAlchemy engine
engine = create_engine(database_url)

try:
    # Connect to the database
    with engine.connect() as connection:
        # Execute the UPDATE query
        result = connection.execute(
            text("UPDATE users SET role = 'admin' WHERE email = 'test@example.com'")
        )
        connection.commit()
        
        # Check if the update was successful
        if result.rowcount > 0:
            print(f"Success! Updated {result.rowcount} user(s) to admin role.")
            
            # Verify the change
            result = connection.execute(
                text("SELECT id, name, email, role FROM users WHERE email = 'test@example.com'")
            )
            user = result.fetchone()
            if user:
                print(f"User ID: {user.id}")
                print(f"Name: {user.name}")
                print(f"Email: {user.email}")
                print(f"Role: {user.role}")
        else:
            print("No users were updated. Check if the email exists in the database.")
            
except Exception as e:
    print(f"Error: {e}")
