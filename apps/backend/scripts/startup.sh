#!/bin/bash
# Startup script for JurisAI backend on Railway
set -e

echo "Starting JurisAI backend deployment..."

# For debugging: Show current directory and list files
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

# NO cd command needed - we're already in the right directory
# when Railway deploys with a root directory of /apps/backend

# Set up Python environment if needed
echo "Setting up environment variables..."
export PYTHONPATH=$PYTHONPATH:.

# Run database migrations conditionally
echo "Checking database migration status..."
if [ -f "alembic.ini" ]; then
    if [ "$SKIP_MIGRATIONS" = "true" ]; then
        echo "Skipping migrations as requested by SKIP_MIGRATIONS env var"
    else
        echo "Attempting to run database migrations..."
        # Try to run migrations but continue if it fails
        python -m alembic upgrade head || echo "Migration failed, but continuing with deployment"
    fi
else
    echo "ERROR: alembic.ini not found. Current directory is $(pwd)"
    echo "Directory contents:"
    ls -la
fi

# Run model setup script to download lightweight models
echo "Setting up AI models..."
if [ -f "scripts/setup_models.py" ]; then
    # Try to run model setup but continue if it fails
    python scripts/setup_models.py || echo "Model setup failed, but continuing with deployment"
else
    echo "WARNING: setup_models.py not found. Looking in ./scripts:"
    ls -la ./scripts
    echo "Continuing without model setup..."
fi

# Start the application
echo "Starting FastAPI application..."
exec gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.main:app --bind 0.0.0.0:$PORT
