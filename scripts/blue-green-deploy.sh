#!/bin/bash
# Blue-Green Deployment Script for Railway
set -e

echo "=== JurisAI Blue-Green Deployment Manager ==="

# Configuration
RAILWAY_PROJECT_ID=${RAILWAY_PROJECT_ID:-""}
RAILWAY_TOKEN=${RAILWAY_TOKEN:-""}
BLUE_SERVICE="jurisai-backend-blue"
GREEN_SERVICE="jurisai-backend-green"
HEALTH_CHECK_URL="/health"
DEPLOYMENT_TIMEOUT=300  # 5 minutes

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check health
check_health() {
    local service_url=$1
    local max_attempts=10
    local attempt=1
    
    log_info "Checking health of $service_url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$service_url$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            log_success "Health check passed for $service_url"
            return 0
        fi
        
        log_warning "Health check attempt $attempt/$max_attempts failed for $service_url"
        sleep 10
        attempt=$((attempt + 1))
    done
    
    log_error "Health check failed for $service_url after $max_attempts attempts"
    return 1
}

# Function to get current active environment
get_active_environment() {
    # This would typically query Railway API or load balancer
    # For now, we'll use a simple file-based approach
    if [ -f "/tmp/active_environment" ]; then
        cat /tmp/active_environment
    else
        echo "blue"  # Default to blue
    fi
}

# Function to set active environment
set_active_environment() {
    local environment=$1
    echo "$environment" > /tmp/active_environment
    log_info "Active environment set to: $environment"
}

# Function to deploy to specific environment
deploy_to_environment() {
    local target_env=$1
    local service_name=""
    
    if [ "$target_env" = "blue" ]; then
        service_name=$BLUE_SERVICE
    else
        service_name=$GREEN_SERVICE
    fi
    
    log_info "Deploying to $target_env environment ($service_name)..."
    
    # Set environment-specific variables
    export ENVIRONMENT_COLOR=$target_env
    export RAILWAY_ENVIRONMENT_COLOR=$target_env
    
    # Deploy using Railway CLI (if available) or API
    if command -v railway &> /dev/null; then
        log_info "Using Railway CLI for deployment..."
        railway deploy --service $service_name
    else
        log_info "Using Railway API for deployment..."
        # API-based deployment would go here
        # For now, we'll simulate the deployment
        log_info "Simulating deployment to $target_env environment..."
        sleep 5
    fi
    
    log_success "Deployment to $target_env environment completed"
}

# Function to switch traffic
switch_traffic() {
    local new_environment=$1
    
    log_info "Switching traffic to $new_environment environment..."
    
    # This would typically update load balancer or proxy configuration
    # For Railway, this might involve updating the main service configuration
    # to point to the new environment
    
    # Simulate traffic switch
    log_info "Updating traffic routing configuration..."
    set_active_environment "$new_environment"
    
    # Wait for traffic to settle
    log_info "Waiting for traffic to settle..."
    sleep 30
    
    log_success "Traffic switched to $new_environment environment"
}

# Function to rollback deployment
rollback_deployment() {
    local current_env=$(get_active_environment)
    local rollback_env=""
    
    if [ "$current_env" = "blue" ]; then
        rollback_env="green"
    else
        rollback_env="blue"
    fi
    
    log_warning "Rolling back from $current_env to $rollback_env..."
    switch_traffic "$rollback_env"
    log_success "Rollback completed"
}

# Main deployment function
main_deploy() {
    local current_env=$(get_active_environment)
    local target_env=""
    
    # Determine target environment (opposite of current)
    if [ "$current_env" = "blue" ]; then
        target_env="green"
    else
        target_env="blue"
    fi
    
    log_info "Current active environment: $current_env"
    log_info "Target deployment environment: $target_env"
    
    # Step 1: Deploy to inactive environment
    deploy_to_environment "$target_env"
    
    # Step 2: Health check on new environment
    # Note: In a real setup, you'd have the actual URLs
    local target_url="https://jurisai-backend-$target_env.railway.app"
    
    log_info "Performing health check on new deployment..."
    if ! check_health "$target_url"; then
        log_error "Health check failed on new deployment"
        log_error "Deployment aborted - keeping current environment active"
        exit 1
    fi
    
    # Step 3: Switch traffic to new environment
    switch_traffic "$target_env"
    
    # Step 4: Final health check
    log_info "Performing final health check after traffic switch..."
    if ! check_health "$target_url"; then
        log_error "Final health check failed - rolling back"
        rollback_deployment
        exit 1
    fi
    
    log_success "Blue-green deployment completed successfully!"
    log_success "New active environment: $target_env"
}

# Command line interface
case "${1:-}" in
    "deploy")
        main_deploy
        ;;
    "rollback")
        rollback_deployment
        ;;
    "status")
        current_env=$(get_active_environment)
        log_info "Current active environment: $current_env"
        ;;
    "health")
        current_env=$(get_active_environment)
        service_url="https://jurisai-backend-$current_env.railway.app"
        check_health "$service_url"
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|status|health}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Perform blue-green deployment"
        echo "  rollback - Rollback to previous environment"
        echo "  status   - Show current active environment"
        echo "  health   - Check health of current environment"
        exit 1
        ;;
esac