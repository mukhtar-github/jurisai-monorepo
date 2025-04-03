#!/bin/bash
# Startup script for JurisAI backend on Railway
set -e

echo "Starting JurisAI backend deployment..."

# Change to the correct directory
cd /app

# Set up Python environment if needed
echo "Setting up environment variables..."
export PYTHONPATH=$PYTHONPATH:/app

# Run database migrations
echo "Running database migrations..."
python -m alembic upgrade head

# Run model setup script to download lightweight models
echo "Setting up AI models..."
python scripts/setup_models.py

# Start the application
echo "Starting FastAPI application..."
exec gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.main:app --bind 0.0.0.0:$PORT
