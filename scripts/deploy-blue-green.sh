#!/bin/bash

# Blue-Green Deployment Script for JurisAI on Railway
# ===================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RAILWAY_TOKEN="${RAILWAY_TOKEN}"
PROJECT_NAME="jurisai-monorepo"
SERVICE_NAME="backend"
HEALTH_CHECK_URL="https://jurisai-monorepo-production.up.railway.app/health"
HEALTH_CHECK_TIMEOUT=30
ROLLBACK_TIMEOUT=300  # 5 minutes

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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if [ -z "$RAILWAY_TOKEN" ]; then
        error "RAILWAY_TOKEN environment variable is not set"
        exit 1
    fi
    
    if ! command -v railway &> /dev/null; then
        error "Railway CLI is not installed. Please install it first."
        error "Run: npm install -g @railway/cli"
        exit 1
    fi
    
    # Login to Railway
    echo "$RAILWAY_TOKEN" | railway login --token
    
    success "Prerequisites check passed"
}

# Health check function
health_check() {
    local url=$1
    local max_attempts=10
    local attempt=1
    
    log "Performing health check on $url"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf --max-time $HEALTH_CHECK_TIMEOUT "$url" > /dev/null 2>&1; then
            success "Health check passed (attempt $attempt/$max_attempts)"
            return 0
        else
            warning "Health check failed (attempt $attempt/$max_attempts)"
            sleep 10
            ((attempt++))
        fi
    done
    
    error "Health check failed after $max_attempts attempts"
    return 1
}

# Get current deployment info
get_deployment_info() {
    log "Getting current deployment information..."
    
    # Get current service status
    CURRENT_STATUS=$(railway status --json | jq -r '.deployments[0].status' 2>/dev/null || echo "UNKNOWN")
    CURRENT_COMMIT=$(railway status --json | jq -r '.deployments[0].meta.commitSha' 2>/dev/null || echo "UNKNOWN")
    
    log "Current deployment status: $CURRENT_STATUS"
    log "Current commit: $CURRENT_COMMIT"
}

# Create staging environment for blue-green
create_staging_environment() {
    log "Creating staging environment for blue-green deployment..."
    
    # Set staging environment variables
    railway variables set RAILWAY_ENVIRONMENT=staging --environment staging || warning "Could not set staging environment"
    railway variables set LOG_LEVEL=INFO --environment staging || warning "Could not set log level"
    railway variables set DEBUG=false --environment staging || warning "Could not set debug mode"
    railway variables set FRONTEND_URL=https://jurisai-monorepo-it54.vercel.app --environment staging || warning "Could not set frontend URL"
    
    success "Staging environment configured"
}

# Deploy to staging (green)
deploy_to_staging() {
    log "Deploying to staging environment (green)..."
    
    # Deploy to staging
    railway deploy --environment staging
    
    if [ $? -eq 0 ]; then
        success "Staging deployment completed"
    else
        error "Staging deployment failed"
        exit 1
    fi
    
    # Wait for deployment to be ready
    sleep 30
}

# Test staging deployment
test_staging_deployment() {
    log "Testing staging deployment..."
    
    # Get staging URL (this would need to be configured in Railway)
    STAGING_URL="https://jurisai-monorepo-staging.up.railway.app/health"
    
    if health_check "$STAGING_URL"; then
        success "Staging deployment is healthy"
        return 0
    else
        error "Staging deployment health check failed"
        return 1
    fi
}

# Switch traffic to green (promote staging to production)
promote_to_production() {
    log "Promoting staging to production..."
    
    # This is a simplified version - in a real Railway setup, you would:
    # 1. Update DNS or load balancer to point to staging
    # 2. Or use Railway's domain management features
    # 3. Or use a reverse proxy to switch traffic
    
    # For now, we'll deploy to production
    railway deploy --environment production
    
    if [ $? -eq 0 ]; then
        success "Production deployment completed"
    else
        error "Production deployment failed"
        return 1
    fi
    
    # Wait for deployment to be ready
    sleep 30
    
    # Test production deployment
    if health_check "$HEALTH_CHECK_URL"; then
        success "Production deployment is healthy"
        return 0
    else
        error "Production deployment health check failed"
        return 1
    fi
}

# Rollback function
rollback() {
    log "Rolling back deployment..."
    
    # Get previous deployment
    PREVIOUS_DEPLOYMENT=$(railway deployments --json | jq -r '.[1].id' 2>/dev/null)
    
    if [ "$PREVIOUS_DEPLOYMENT" != "null" ] && [ -n "$PREVIOUS_DEPLOYMENT" ]; then
        log "Rolling back to deployment: $PREVIOUS_DEPLOYMENT"
        
        # Note: Railway doesn't have a direct rollback command, so we would need to:
        # 1. Redeploy from a previous commit
        # 2. Or use Railway's deployment management
        warning "Automatic rollback not implemented. Please manually rollback using Railway dashboard."
        
        # For manual rollback instructions
        echo "Manual rollback steps:"
        echo "1. Go to Railway dashboard"
        echo "2. Select the previous working deployment"
        echo "3. Click 'Redeploy'"
        
    else
        warning "No previous deployment found for rollback"
    fi
}

# Cleanup staging environment
cleanup_staging() {
    log "Cleaning up staging environment..."
    
    # Optionally remove staging deployment or mark it for cleanup
    warning "Staging environment cleanup - manual intervention required"
    
    success "Blue-green deployment process completed"
}

# Main deployment function
main() {
    log "Starting Blue-Green deployment for $PROJECT_NAME"
    
    # Step 1: Check prerequisites
    check_prerequisites
    
    # Step 2: Get current deployment info
    get_deployment_info
    
    # Step 3: Create/configure staging environment
    create_staging_environment
    
    # Step 4: Deploy to staging (green environment)
    deploy_to_staging
    
    # Step 5: Test staging deployment
    if ! test_staging_deployment; then
        error "Staging deployment test failed. Aborting."
        exit 1
    fi
    
    # Step 6: Promote to production
    if ! promote_to_production; then
        error "Production promotion failed. Starting rollback..."
        rollback
        exit 1
    fi
    
    # Step 7: Cleanup
    cleanup_staging
    
    success "Blue-Green deployment completed successfully!"
    log "Application is now live at: $HEALTH_CHECK_URL"
}

# Trap errors and perform rollback
trap 'error "Deployment failed. Starting rollback..."; rollback; exit 1' ERR

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "health-check")
        health_check "$HEALTH_CHECK_URL"
        ;;
    "status")
        get_deployment_info
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health-check|status}"
        echo "  deploy      - Perform blue-green deployment"
        echo "  rollback    - Rollback to previous deployment"
        echo "  health-check - Check application health"
        echo "  status      - Show current deployment status"
        exit 1
        ;;
esac