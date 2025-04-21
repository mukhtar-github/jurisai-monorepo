#!/bin/bash

# Test Production Configuration
# This script tests the JurisAI system with production configuration (PostgreSQL + OpenAI)

set -e  # Exit on error

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Display header
echo -e "${BOLD}JurisAI Production Configuration Test${NC}"
echo "==============================="
echo "This script will test JurisAI with production configuration:"
echo "- PostgreSQL database"
echo "- Redis cache"
echo "- OpenAI API integration"
echo -e "===============================${NC}"
echo

# Step 1: Check PostgreSQL and Redis are running
echo -e "${BOLD}Step 1: Checking PostgreSQL and Redis services...${NC}"

# Check PostgreSQL
if command -v pg_isready &> /dev/null; then
    if pg_isready -h localhost -p 5432; then
        echo -e "${GREEN}✓ PostgreSQL is running${NC}"
    else
        echo -e "${RED}✗ PostgreSQL is not running on localhost:5432${NC}"
        echo "Please start PostgreSQL service before continuing"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️ pg_isready command not found, cannot check PostgreSQL status${NC}"
    echo "Assuming PostgreSQL is running, but may fail later if it's not"
fi

# Check Redis
if command -v redis-cli &> /dev/null; then
    if redis-cli -h localhost -p 6379 ping | grep -q "PONG"; then
        echo -e "${GREEN}✓ Redis is running${NC}"
    else
        echo -e "${RED}✗ Redis is not running on localhost:6379${NC}"
        echo "Please start Redis service before continuing"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️ redis-cli command not found, cannot check Redis status${NC}"
    echo "Assuming Redis is running, but may fail later if it's not"
fi

# Step 2: Set production environment variables
echo -e "${BOLD}Step 2: Setting production environment variables...${NC}"
export DATABASE_URL="postgresql://postgres:password@localhost:5432/jurisai"
export REDIS_URL="redis://localhost:6379/0"
export OPENAI_API_KEY="YOUR_OPENAI_API_KEY" # Replace with your actual key when running
export OPENAI_MODEL_NAME="gpt-4"
echo -e "${GREEN}✓ Environment variables set${NC}"

# Step 3: Check database migrations
echo -e "${BOLD}Step 3: Checking database migrations...${NC}"
cd apps/backend
python -c "
import sys
from src.core.database import engine
from sqlalchemy import inspect, text

inspector = inspect(engine)
tables = inspector.get_table_names()
print(f'Found {len(tables)} tables in database:')
for table in tables:
    print(f'  - {table}')

# Check alembic_version if it exists
if 'alembic_version' in tables:
    with engine.connect() as conn:
        version = conn.execute(text('SELECT version_num FROM alembic_version')).scalar()
        print(f'Current migration version: {version}')
else:
    print('alembic_version table not found - database may not be migrated')
"

# Step 4: Start the backend server
echo -e "${BOLD}Step 4: Starting backend server with production config...${NC}"
uvicorn src.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started with PID $BACKEND_PID${NC}"

# Wait for backend to start
echo "Waiting for backend to initialize..."
sleep 5

# Step 5: Test API endpoints
echo -e "${BOLD}Step 5: Testing API endpoints...${NC}"
if curl -s http://localhost:8000/health | grep -q "status"; then
    echo -e "${GREEN}✓ Health endpoint working${NC}"
else
    echo -e "${RED}✗ Health endpoint not working${NC}"
fi

echo "Testing system status endpoint..."
curl -s http://localhost:8000/system/status | jq .

echo "Testing OpenAI integration..."
curl -s "http://localhost:8000/summarization/test?query=test" | jq .

# Step 6: Start the frontend
echo -e "${BOLD}Step 6: Starting frontend...${NC}"
cd ../frontend
export NEXT_PUBLIC_API_URL="http://localhost:8000"
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started with PID $FRONTEND_PID${NC}"

# Wait for frontend to start
echo "Waiting for frontend to initialize..."
sleep 10

echo -e "${YELLOW}Backend is running at: http://localhost:8000${NC}"
echo -e "${YELLOW}Frontend is running at: http://localhost:3000${NC}"
echo
echo -e "${BOLD}Test Instructions:${NC}"
echo "1. Visit http://localhost:3000/summarize in your browser"
echo "2. Try summarizing a test document to verify OpenAI integration"
echo "3. Visit http://localhost:3000/diagnostics to check system status"
echo "4. Press Alt+Shift+D on any page to test the debug panel"
echo
echo -e "${YELLOW}Press Ctrl+C to stop the servers when done testing${NC}"

# Keep script running until user presses Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo -e '${GREEN}Servers stopped${NC}'; exit 0" INT
wait
