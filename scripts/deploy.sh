#!/bin/bash
# deploy.sh - a simple deployment script

echo "Starting deployment process..."
# Example: Build the backend service
cd ../apps/backend
poetry install --no-dev
# Run tests if desired
# poetry run pytest

# Build Docker image (if using Docker)
docker build -f ../../infrastructure/docker/backend.Dockerfile -t jurisai-backend .

# Push image or deploy via your CI/CD pipeline
echo "Deployment script complete."
