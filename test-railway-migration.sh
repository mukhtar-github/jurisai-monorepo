#!/bin/bash

# Railway Production Migration Test
# This script tests the migration system on the Railway production backend

set -e  # Exit on error

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Display header
echo -e "${BOLD}JurisAI Railway Production Migration Test${NC}"
echo "==============================="
echo "This script tests the migration system on the Railway production backend"
echo "WARNING: This will make real API calls to the production backend"
echo "Run this script with caution!"
echo -e "===============================${NC}"
echo

# Check for auth token in environment
if [[ -z "$RAILWAY_AUTH_TOKEN" ]]; then
    # If not in environment, prompt for it
    read -sp "Enter your admin auth token for Railway: " AUTH_TOKEN
    echo
else
    # Use token from environment
    AUTH_TOKEN="$RAILWAY_AUTH_TOKEN"
    echo "Using auth token from environment"
fi

if [[ -z "$AUTH_TOKEN" ]]; then
    echo -e "${RED}No auth token provided. Exiting.${NC}"
    exit 1
fi

# Define the Railway API URL
RAILWAY_API_URL="https://jurisai-monorepo-production.up.railway.app"

# Function to make authenticated API calls
call_api() {
    local endpoint=$1
    local method=${2:-GET}
    local data=${3:-"{}"}
    
    echo "Calling $method $endpoint..."
    
    # Make the API call
    response=$(curl -s -X "$method" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d "$data" \
        "$RAILWAY_API_URL$endpoint")
    
    # Print the response
    echo "$response" | jq . || echo "$response"
    
    # Return the response for processing
    echo "$response"
}

# Step 1: Check system status
echo -e "${BOLD}Step 1: Checking system status...${NC}"
call_api "/system/status"

# Step 2: Check migration status
echo -e "\n${BOLD}Step 2: Checking migration status...${NC}"
migration_check=$(call_api "/system/migrations?action=check" "POST")

# Extract migration status information
echo -e "\n${BOLD}Migration Status Summary:${NC}"
if echo "$migration_check" | jq -e '.details.is_latest' &>/dev/null; then
    is_latest=$(echo "$migration_check" | jq -r '.details.is_latest')
    if [[ "$is_latest" == "true" ]]; then
        echo -e "${GREEN}✓ Database is at the latest migration version${NC}"
    else
        echo -e "${YELLOW}⚠️ Database is not at the latest migration version${NC}"
    fi
    
    current_rev=$(echo "$migration_check" | jq -r '.details.current_revision')
    latest_rev=$(echo "$migration_check" | jq -r '.details.latest_revision')
    echo "Current revision: $current_rev"
    echo "Latest revision: $latest_rev"
    
    pending=$(echo "$migration_check" | jq -r '.details.pending_migrations')
    if [[ "$pending" != "null" && "$pending" != "0" ]]; then
        echo -e "${YELLOW}Pending migrations: $pending${NC}"
    fi
else
    echo -e "${RED}Could not parse migration check response${NC}"
fi

# Step 3: Verify database tables
echo -e "\n${BOLD}Step 3: Verifying database tables...${NC}"
table_verify=$(call_api "/system/migrations?action=verify" "POST")

# Step 4: Ask if we should fix migrations
echo -e "\n${BOLD}Step 4: Fix migration sequence (if needed)${NC}"
read -p "Do you want to fix the migration sequence? (y/N): " fix_confirm
if [[ "$fix_confirm" =~ ^[Yy]$ ]]; then
    echo "Fixing migration sequence..."
    call_api "/system/migrations?action=fix" "POST"
else
    echo "Skipping migration fix."
fi

# Step 5: Ask if we should apply pending migrations
echo -e "\n${BOLD}Step 5: Apply pending migrations (if any)${NC}"
read -p "Do you want to apply pending migrations? (y/N): " apply_confirm
if [[ "$apply_confirm" =~ ^[Yy]$ ]]; then
    echo "Applying pending migrations..."
    call_api "/system/migrations?action=apply" "POST"
else
    echo "Skipping migration application."
fi

# Step 6: Final status check
echo -e "\n${BOLD}Step 6: Final status check...${NC}"
call_api "/system/status"

echo -e "\n${GREEN}✓ Railway migration test complete${NC}"
