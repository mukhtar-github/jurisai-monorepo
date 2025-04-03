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

# Run database migrations
echo "Running database migrations..."
if [ -f "alembic.ini" ]; then
    python -m alembic upgrade head
else
    echo "ERROR: alembic.ini not found. Current directory is $(pwd)"
    echo "Directory contents:"
    ls -la
fi

# Run model setup script to download lightweight models
echo "Setting up AI models..."
if [ -f "scripts/setup_models.py" ]; then
    python scripts/setup_models.py
else
    echo "ERROR: setup_models.py not found. Looking in ./scripts:"
    ls -la ./scripts
fi

# Start the application
echo "Starting FastAPI application..."
exec gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.main:app --bind 0.0.0.0:$PORT
