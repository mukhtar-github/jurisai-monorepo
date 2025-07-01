#!/bin/bash

# Development Environment Setup Script for JurisAI
# =================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if we're in the project root
check_project_root() {
    if [ ! -f "CLAUDE.md" ] || [ ! -d "apps/backend" ] || [ ! -d "apps/frontend" ]; then
        error "Please run this script from the project root directory"
        exit 1
    fi
}

# Setup Python virtual environment for backend
setup_backend_venv() {
    log "Setting up Python virtual environment for backend..."
    
    cd apps/backend
    
    # Check Python version
    if ! command -v python3 &> /dev/null; then
        error "Python 3 is not installed"
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    log "Python version: $PYTHON_VERSION"
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        log "Creating virtual environment..."
        python3 -m venv venv
    else
        log "Virtual environment already exists"
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Upgrade pip
    log "Upgrading pip..."
    pip install --upgrade pip
    
    # Install dependencies
    log "Installing Python dependencies..."
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
    else
        error "requirements.txt not found"
        exit 1
    fi
    
    # Install development dependencies if they exist
    if [ -f "requirements-dev.txt" ]; then
        log "Installing development dependencies..."
        pip install -r requirements-dev.txt
    fi
    
    success "Backend virtual environment setup complete"
    cd ../..
}

# Setup Node.js environment for frontend
setup_frontend_env() {
    log "Setting up Node.js environment for frontend..."
    
    cd apps/frontend
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    log "Node.js version: $NODE_VERSION"
    
    # Install dependencies
    log "Installing Node.js dependencies..."
    if [ -f "package.json" ]; then
        npm install --legacy-peer-deps
    else
        error "package.json not found"
        exit 1
    fi
    
    success "Frontend environment setup complete"
    cd ../..
}

# Create development environment files
create_env_files() {
    log "Creating development environment files..."
    
    # Backend .env file
    if [ ! -f "apps/backend/.env" ]; then
        log "Creating backend .env file from sample..."
        cp apps/backend/env_sample.txt apps/backend/.env
        
        # Update for local development
        sed -i 's|DATABASE_URL=postgresql://postgres:password@localhost:5432/jurisai|DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jurisai|g' apps/backend/.env
        sed -i 's|FRONTEND_URL=https://jurisai-monorepo-it54.vercel.app|FRONTEND_URL=http://localhost:3000|g' apps/backend/.env
        sed -i 's|your_secret_key_here|dev-secret-key-not-for-production|g' apps/backend/.env
        
        warning "Please update apps/backend/.env with your actual values (OpenAI API key, etc.)"
    else
        log "Backend .env file already exists"
    fi
    
    # Frontend .env.local already created above
    log "Frontend .env.local already configured"
}

# Setup database
setup_database() {
    log "Setting up database..."
    
    cd apps/backend
    
    # Check if PostgreSQL is running
    if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        warning "PostgreSQL is not running or not accessible"
        warning "Please start PostgreSQL service and create database 'jurisai'"
        warning "Commands:"
        warning "  sudo systemctl start postgresql  # On systemd systems"
        warning "  createdb jurisai  # Create database"
        cd ../..
        return
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Run database migrations
    log "Running database migrations..."
    if command -v alembic &> /dev/null; then
        alembic upgrade head
        success "Database migrations completed"
    else
        warning "Alembic not found in virtual environment"
    fi
    
    cd ../..
}

# Create development scripts
create_dev_scripts() {
    log "Creating development scripts..."
    
    # Backend development script
    cat > scripts/dev-backend.sh << 'EOF'
#!/bin/bash
cd apps/backend
source venv/bin/activate
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
EOF
    chmod +x scripts/dev-backend.sh
    
    # Frontend development script
    cat > scripts/dev-frontend.sh << 'EOF'
#!/bin/bash
cd apps/frontend
npm run dev
EOF
    chmod +x scripts/dev-frontend.sh
    
    # Test script for backend
    cat > scripts/test-backend.sh << 'EOF'
#!/bin/bash
cd apps/backend
source venv/bin/activate
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
pytest -v
EOF
    chmod +x scripts/test-backend.sh
    
    # Test script for frontend
    cat > scripts/test-frontend.sh << 'EOF'
#!/bin/bash
cd apps/frontend
npm test
EOF
    chmod +x scripts/test-frontend.sh
    
    success "Development scripts created in scripts/ directory"
}

# Main setup function
main() {
    log "Starting development environment setup for JurisAI..."
    
    check_project_root
    setup_backend_venv
    setup_frontend_env
    create_env_files
    setup_database
    create_dev_scripts
    
    success "Development environment setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Start the backend: ./scripts/dev-backend.sh"
    echo "2. Start the frontend: ./scripts/dev-frontend.sh"
    echo "3. Access the application at http://localhost:3000"
    echo "4. API documentation at http://localhost:8000/docs"
    echo ""
    echo "Testing:"
    echo "- Backend tests: ./scripts/test-backend.sh"
    echo "- Frontend tests: ./scripts/test-frontend.sh"
}

# Handle script arguments
case "${1:-setup}" in
    "setup")
        main
        ;;
    "backend")
        check_project_root
        setup_backend_venv
        ;;
    "frontend")
        check_project_root
        setup_frontend_env
        ;;
    "database")
        check_project_root
        setup_database
        ;;
    *)
        echo "Usage: $0 {setup|backend|frontend|database}"
        echo "  setup    - Complete development environment setup"
        echo "  backend  - Setup backend virtual environment only"
        echo "  frontend - Setup frontend environment only"
        echo "  database - Setup database only"
        exit 1
        ;;
esac