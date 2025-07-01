#!/bin/bash

# Railway CLI Setup and Configuration Script
# ==========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RAILWAY_TOKEN="${RAILWAY_TOKEN:-11c4d4e8-1cb8-4061-8b08-90af0b64ceef}"
PROJECT_NAME="jurisai-monorepo"
FRONTEND_URL="https://jurisai-monorepo-it54.vercel.app"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Install Railway CLI if not present
install_railway_cli() {
    if command -v railway &> /dev/null; then
        log "Railway CLI already installed: $(railway --version)"
        return 0
    fi
    
    log "Installing Railway CLI..."
    
    # Check for npm
    if command -v npm &> /dev/null; then
        npm install -g @railway/cli
        success "Railway CLI installed via npm"
    elif command -v curl &> /dev/null; then
        # Install via curl
        curl -fsSL https://railway.app/install.sh | sh
        success "Railway CLI installed via curl"
    else
        error "Cannot install Railway CLI. Please install npm or curl first."
        exit 1
    fi
}

# Login to Railway
railway_login() {
    log "Logging into Railway..."
    
    if [ -z "$RAILWAY_TOKEN" ]; then
        error "RAILWAY_TOKEN is not set"
        error "Please set RAILWAY_TOKEN environment variable or pass it as argument"
        exit 1
    fi
    
    echo "$RAILWAY_TOKEN" | railway login --token
    success "Logged into Railway"
}

# Link to Railway project
link_project() {
    log "Linking to Railway project..."
    
    # Check if already linked
    if railway status &> /dev/null; then
        log "Already linked to Railway project"
        return 0
    fi
    
    # Try to link to project
    railway link $PROJECT_NAME || {
        warning "Could not automatically link project. Please link manually:"
        warning "  railway link"
        return 1
    }
    
    success "Linked to Railway project: $PROJECT_NAME"
}

# Configure environment variables
configure_environment() {
    log "Configuring environment variables..."
    
    # Production environment variables
    log "Setting production environment variables..."
    
    railway variables set RAILWAY_ENVIRONMENT=production --environment production
    railway variables set LOG_LEVEL=INFO --environment production
    railway variables set DEBUG=false --environment production
    railway variables set CORS_ALLOW_CREDENTIALS=true --environment production
    railway variables set FRONTEND_URL=$FRONTEND_URL --environment production
    railway variables set PORT=8000 --environment production
    
    # Note: Sensitive variables should be set manually in Railway dashboard
    warning "Please set the following sensitive variables manually in Railway dashboard:"
    warning "  - DATABASE_URL (automatically provided by Railway PostgreSQL service)"
    warning "  - REDIS_URL (automatically provided by Railway Redis service)"
    warning "  - SECRET_KEY (generate a secure random key)"
    warning "  - OPENAI_API_KEY (your OpenAI API key)"
    
    success "Environment variables configured"
}

# Deploy to Railway
deploy_to_railway() {
    log "Deploying to Railway..."
    
    # Deploy
    railway deploy
    
    if [ $? -eq 0 ]; then
        success "Deployment completed successfully"
        
        # Get the deployment URL
        DEPLOY_URL=$(railway status --json | jq -r '.deployments[0].url' 2>/dev/null || echo "")
        if [ -n "$DEPLOY_URL" ] && [ "$DEPLOY_URL" != "null" ]; then
            success "Application deployed at: $DEPLOY_URL"
        fi
    else
        error "Deployment failed"
        return 1
    fi
}

# Add Railway services (PostgreSQL and Redis)
add_services() {
    log "Adding Railway services..."
    
    # Add PostgreSQL
    log "Adding PostgreSQL service..."
    railway add postgres || warning "PostgreSQL service may already exist"
    
    # Add Redis  
    log "Adding Redis service..."
    railway add redis || warning "Redis service may already exist"
    
    success "Services configured"
}

# Show deployment status
show_status() {
    log "Current deployment status:"
    railway status
    
    log "Environment variables:"
    railway variables
}

# Main setup function
main() {
    log "Setting up Railway deployment for $PROJECT_NAME..."
    
    install_railway_cli
    railway_login
    link_project
    add_services
    configure_environment
    
    # Ask user if they want to deploy now
    read -p "Do you want to deploy now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_to_railway
    else
        log "Skipping deployment. Run 'railway deploy' when ready."
    fi
    
    show_status
    
    success "Railway setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Set sensitive environment variables in Railway dashboard"
    echo "2. Deploy: railway deploy"
    echo "3. Monitor: railway logs"
    echo "4. Status: railway status"
}

# Handle script arguments
case "${1:-setup}" in
    "setup")
        main
        ;;
    "login")
        railway_login
        ;;
    "deploy")
        railway_login
        link_project
        deploy_to_railway
        ;;
    "status")
        show_status
        ;;
    "env")
        railway_login
        link_project
        configure_environment
        ;;
    *)
        echo "Usage: $0 {setup|login|deploy|status|env} [RAILWAY_TOKEN]"
        echo "  setup  - Complete Railway setup and configuration"
        echo "  login  - Login to Railway only"
        echo "  deploy - Deploy to Railway"
        echo "  status - Show deployment status"
        echo "  env    - Configure environment variables only"
        echo ""
        echo "Environment variables:"
        echo "  RAILWAY_TOKEN - Railway authentication token (required)"
        echo ""
        echo "Example:"
        echo "  RAILWAY_TOKEN=your_token $0 setup"
        exit 1
        ;;
esac