#!/bin/bash

# Configuration Validation Script for JurisAI
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Expected values
EXPECTED_FRONTEND_URL="https://jurisai-monorepo-it54.vercel.app"
EXPECTED_BACKEND_URL="https://jurisai-monorepo-production.up.railway.app"

# Functions
log() {
    echo -e "${BLUE}[VALIDATE]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓ PASS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[⚠ WARN]${NC} $1"
}

error() {
    echo -e "${RED}[✗ FAIL]${NC} $1"
}

# Check if we're in the project root
check_project_root() {
    if [ ! -f "CLAUDE.md" ] || [ ! -d "apps/backend" ] || [ ! -d "apps/frontend" ]; then
        error "Please run this script from the project root directory"
        exit 1
    fi
    success "Project root directory confirmed"
}

# Validate frontend configuration
validate_frontend() {
    log "Validating frontend configuration..."
    
    # Check Vercel configuration
    if [ -f "apps/frontend/vercel.json" ]; then
        if grep -q "$EXPECTED_BACKEND_URL" apps/frontend/vercel.json; then
            success "Vercel.json has correct backend URL"
        else
            error "Vercel.json backend URL mismatch"
        fi
    else
        error "vercel.json not found"
    fi
    
    # Check API client configuration
    if [ -f "apps/frontend/lib/api/client.ts" ]; then
        if grep -q "$EXPECTED_BACKEND_URL" apps/frontend/lib/api/client.ts; then
            success "API client has correct backend URL"
        else
            warning "API client may have incorrect backend URL"
        fi
    else
        error "API client not found"
    fi
    
    # Check environment files
    if [ -f "apps/frontend/.env.example" ]; then
        success "Frontend .env.example exists"
    else
        warning "Frontend .env.example missing"
    fi
    
    if [ -f "apps/frontend/.env.local" ]; then
        success "Frontend .env.local exists"
    else
        warning "Frontend .env.local missing (needed for development)"
    fi
}

# Validate backend configuration
validate_backend() {
    log "Validating backend configuration..."
    
    # Check main.py for Railway fixes
    if [ -f "apps/backend/src/main.py" ]; then
        if grep -q "redirect_slashes=False" apps/backend/src/main.py; then
            success "FastAPI redirect fix applied"
        else
            error "FastAPI redirect fix missing"
        fi
        
        if grep -q "$EXPECTED_FRONTEND_URL" apps/backend/src/main.py; then
            success "CORS configuration includes correct frontend URL"
        else
            warning "CORS configuration may be missing frontend URL"
        fi
        
        if grep -q "/health" apps/backend/src/main.py && grep -q "/ready" apps/backend/src/main.py; then
            success "Railway health check endpoints configured"
        else
            error "Railway health check endpoints missing"
        fi
    else
        error "Backend main.py not found"
    fi
    
    # Check requirements.txt
    if [ -f "apps/backend/requirements.txt" ]; then
        success "Backend requirements.txt exists"
        
        # Check for essential packages
        if grep -q "fastapi" apps/backend/requirements.txt; then
            success "FastAPI dependency found"
        else
            error "FastAPI dependency missing"
        fi
        
        if grep -q "gunicorn" apps/backend/requirements.txt; then
            success "Gunicorn dependency found"
        else
            error "Gunicorn dependency missing"
        fi
    else
        error "Backend requirements.txt not found"
    fi
    
    # Check environment files
    if [ -f "apps/backend/env_sample.txt" ]; then
        if grep -q "$EXPECTED_FRONTEND_URL" apps/backend/env_sample.txt; then
            success "Backend env_sample.txt has correct frontend URL"
        else
            error "Backend env_sample.txt frontend URL mismatch"
        fi
    else
        error "Backend env_sample.txt not found"
    fi
}

# Validate Railway configuration
validate_railway() {
    log "Validating Railway configuration..."
    
    if [ -f "railway.json" ]; then
        success "railway.json exists"
        
        # Check build command
        if grep -q "requirements.txt" railway.json; then
            success "Railway uses requirements.txt"
        else
            warning "Railway may not be using requirements.txt"
        fi
        
        # Check health check path
        if grep -q '"/health"' railway.json; then
            success "Railway health check path configured"
        else
            error "Railway health check path missing"
        fi
        
        # Check frontend URL
        if grep -q "$EXPECTED_FRONTEND_URL" railway.json; then
            success "Railway has correct frontend URL"
        else
            error "Railway frontend URL mismatch"
        fi
        
        # Check timeout
        if grep -q '"healthcheckTimeout": 180' railway.json; then
            success "Railway health check timeout extended"
        else
            warning "Railway health check timeout may be too short"
        fi
    else
        error "railway.json not found"
    fi
}

# Validate deployment scripts
validate_scripts() {
    log "Validating deployment scripts..."
    
    # Check if scripts exist and are executable
    scripts=(
        "scripts/setup-dev-env.sh"
        "scripts/deploy-blue-green.sh"
        "scripts/railway-setup.sh"
        "scripts/validate-setup.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ]; then
            if [ -x "$script" ]; then
                success "$script exists and is executable"
            else
                warning "$script exists but is not executable"
            fi
        else
            error "$script not found"
        fi
    done
}

# Test API connectivity
test_api_connectivity() {
    log "Testing API connectivity..."
    
    # Test health check endpoint
    if command -v curl &> /dev/null; then
        log "Testing production backend health check..."
        
        if curl -sf --max-time 10 "$EXPECTED_BACKEND_URL/health" > /dev/null 2>&1; then
            success "Production backend is accessible"
        else
            warning "Production backend is not accessible (may be expected if not deployed)"
        fi
    else
        warning "curl not available - skipping connectivity tests"
    fi
}

# Check project structure
validate_structure() {
    log "Validating project structure..."
    
    required_dirs=(
        "apps/backend"
        "apps/frontend"
        "docs"
        "scripts"
    )
    
    for dir in "${required_dirs[@]}"; do
        if [ -d "$dir" ]; then
            success "$dir directory exists"
        else
            error "$dir directory missing"
        fi
    done
    
    required_files=(
        "CLAUDE.md"
        "railway.json"
        "apps/backend/requirements.txt"
        "apps/backend/src/main.py"
        "apps/frontend/package.json"
        "apps/frontend/vercel.json"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            success "$file exists"
        else
            error "$file missing"
        fi
    done
}

# Generate summary report
generate_summary() {
    echo ""
    echo "================================================================"
    echo "                    VALIDATION SUMMARY"
    echo "================================================================"
    echo ""
    
    echo "Configuration Status:"
    echo "• Frontend URL: $EXPECTED_FRONTEND_URL"
    echo "• Backend URL: $EXPECTED_BACKEND_URL"
    echo "• Railway Token: ${RAILWAY_TOKEN:+Set}${RAILWAY_TOKEN:-Not Set}"
    echo ""
    
    echo "Next Steps:"
    echo "1. If validation passed: Ready for deployment"
    echo "2. Set Railway token: export RAILWAY_TOKEN=your_token"
    echo "3. Deploy to Railway: ./scripts/railway-setup.sh deploy"
    echo "4. Deploy to Vercel: Push to main branch (if connected to GitHub)"
    echo ""
    
    echo "Useful Commands:"
    echo "• Setup development: ./scripts/setup-dev-env.sh"
    echo "• Deploy to Railway: ./scripts/railway-setup.sh deploy"
    echo "• Blue-green deploy: ./scripts/deploy-blue-green.sh deploy"
    echo "• Check Railway status: railway status"
    echo ""
}

# Main validation function
main() {
    echo "================================================================"
    echo "              JurisAI Configuration Validation"
    echo "================================================================"
    echo ""
    
    check_project_root
    validate_structure
    validate_frontend
    validate_backend
    validate_railway
    validate_scripts
    test_api_connectivity
    
    generate_summary
    
    success "Validation complete! Check any errors or warnings above."
}

main