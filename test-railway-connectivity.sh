#!/bin/bash

# Test Railway Production Connectivity
# This script tests connectivity between the frontend and the Railway backend

set -e  # Exit on error

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Display header
echo -e "${BOLD}JurisAI Railway Production Connectivity Test${NC}"
echo "==============================="
echo "This script will test connectivity between the frontend and the"
echo "production backend deployed on Railway."
echo -e "===============================${NC}"
echo

# Define the Railway API URL
if [[ -z "$RAILWAY_API_URL" ]]; then
    RAILWAY_API_URL="https://jurisai-monorepo-production.up.railway.app"
    echo -e "Using default Railway URL: ${YELLOW}$RAILWAY_API_URL${NC}"
    echo -e "You can override this by setting the RAILWAY_API_URL environment variable."
else
    echo -e "Using Railway URL from environment: ${YELLOW}$RAILWAY_API_URL${NC}"
fi

# Step 1: Verify connectivity to Railway
echo -e "${BOLD}Step 1: Testing connectivity to Railway backend...${NC}"

# Test the health endpoint
echo "Testing Railway health endpoint..."
if curl -s "$RAILWAY_API_URL/health" | grep -q "status"; then
    echo -e "${GREEN}✓ Railway health endpoint working${NC}"
else
    echo -e "${RED}✗ Railway health endpoint not working${NC}"
    echo "Please check that the Railway service is running and accessible."
    exit 1
fi

# Test system status endpoint
echo "Testing Railway system status endpoint..."
curl -s "$RAILWAY_API_URL/system/status" | jq . || echo -e "${RED}Failed to parse response. Is jq installed?${NC}"

# Test summarization test endpoint (OpenAI integration)
echo "Testing Railway OpenAI integration..."
curl -s "$RAILWAY_API_URL/summarization/test" | jq . || echo -e "${RED}Failed to parse response. Is jq installed?${NC}"

# Step 2: Start the frontend pointing to Railway
echo -e "\n${BOLD}Step 2: Starting the frontend with Railway backend configuration...${NC}"
cd apps/frontend

# Create temporary .env.local file pointing to Railway
echo "NEXT_PUBLIC_API_URL=$RAILWAY_API_URL" > .env.local
echo -e "${GREEN}✓ Created temporary .env.local with Railway configuration${NC}"

# Start the frontend development server
echo "Starting frontend development server..."
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started with PID $FRONTEND_PID pointing to Railway backend${NC}"

# Wait for frontend to start
echo "Waiting for frontend to initialize..."
sleep 10

echo -e "${YELLOW}Railway backend URL: $RAILWAY_API_URL${NC}"
echo -e "${YELLOW}Frontend is running at: http://localhost:3000${NC}"
echo
echo -e "${BOLD}Test Instructions:${NC}"
echo "1. Visit http://localhost:3000/summarize in your browser"
echo "2. Upload and summarize a document to verify end-to-end functionality"
echo "3. Press Alt+Shift+D on any page to test the debug panel"
echo
echo -e "${YELLOW}Press Ctrl+C to stop the frontend server when done testing${NC}"

# Clean up function
cleanup() {
    echo -e "\nCleaning up..."
    # Kill the frontend process
    kill $FRONTEND_PID 2>/dev/null || true
    # Remove the temporary .env.local
    rm apps/frontend/.env.local 2>/dev/null || true
    echo -e "${GREEN}✓ Cleanup complete${NC}"
    exit 0
}

# Register the cleanup function on script exit
trap cleanup INT TERM EXIT

# Keep the script running
wait $FRONTEND_PID
