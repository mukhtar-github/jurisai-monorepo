#!/bin/bash
# Startup script for JurisAI backend on Railway
set -e

echo "Starting JurisAI backend deployment..."

# Change to the backend directory
cd /app/apps/backend

# Set up Python environment if needed
echo "Setting up environment variables..."
export PYTHONPATH=$PYTHONPATH:/app

# Run database migrations
echo "Running database migrations..."
poetry run alembic upgrade head

# Run model setup script to download lightweight models
echo "Setting up AI models..."
poetry run python scripts/setup_models.py

# Start the application
echo "Starting FastAPI application..."
exec poetry run gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.main:app --bind 0.0.0.0:$PORT
