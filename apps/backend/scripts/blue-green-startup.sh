#!/bin/bash
# Blue-Green Deployment Startup Script for Railway
set -e

echo "=== JurisAI Blue-Green Deployment Startup ==="

# Environment Detection
ENVIRONMENT_COLOR=${ENVIRONMENT_COLOR:-"blue"}
DEPLOYMENT_ID=${RAILWAY_DEPLOYMENT_ID:-"unknown"}
SERVICE_NAME=${RAILWAY_SERVICE_NAME:-"jurisai-backend"}

echo "🚀 Starting $ENVIRONMENT_COLOR environment"
echo "📦 Deployment ID: $DEPLOYMENT_ID"
echo "🔧 Service: $SERVICE_NAME"

# Current directory verification
echo "📁 Current directory: $(pwd)"
echo "📂 Directory contents:"
ls -la

# Environment setup
echo "🔧 Setting up Python environment..."
export PYTHONPATH=$PYTHONPATH:.

# Pre-deployment health check
echo "🏥 Running pre-deployment health checks..."

# Check database connectivity
echo "🗄️  Checking database connectivity..."
python3 -c "
import os
import psycopg2
from urllib.parse import urlparse

try:
    db_url = os.getenv('DATABASE_URL')
    if db_url:
        result = urlparse(db_url)
        conn = psycopg2.connect(
            host=result.hostname,
            port=result.port,
            database=result.path[1:],
            user=result.username,
            password=result.password
        )
        conn.close()
        print('✅ Database connection successful')
    else:
        print('⚠️  DATABASE_URL not set')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    exit(1)
"

# Check Redis connectivity
echo "🔴 Checking Redis connectivity..."
python3 -c "
import os
import redis

try:
    redis_url = os.getenv('REDIS_URL')
    if redis_url:
        r = redis.from_url(redis_url)
        r.ping()
        print('✅ Redis connection successful')
    else:
        print('⚠️  REDIS_URL not set')
except Exception as e:
    print(f'❌ Redis connection failed: {e}')
    exit(1)
"

# Database migrations with blue-green strategy
echo "🔄 Managing database migrations for blue-green deployment..."
if [ -f "alembic.ini" ]; then
    echo "📋 Running database migrations..."
    
    # For blue-green, we need to ensure migrations are backward compatible
    # or run them in a specific order
    python -m alembic upgrade head || {
        echo "❌ Migration failed"
        exit 1
    }
    
    echo "✅ Database migrations completed"
else
    echo "❌ alembic.ini not found"
    exit 1
fi

# Model setup and warm-up
echo "🤖 Setting up AI models..."
if [ -f "scripts/setup_models.py" ]; then
    echo "📥 Downloading and setting up models..."
    python scripts/setup_models.py || {
        echo "❌ Model setup failed"
        exit 1
    }
    
    # Model warm-up for faster first request
    if [ "$MODEL_WARM_UP_ENABLED" = "true" ]; then
        echo "🔥 Warming up models..."
        python3 -c "
from src.services.ai_service import AIService
try:
    ai_service = AIService()
    # Warm up with a small test
    ai_service.get_embeddings(['test'])
    print('✅ Model warm-up completed')
except Exception as e:
    print(f'⚠️  Model warm-up failed: {e}')
        "
    fi
else
    echo "❌ setup_models.py not found"
    exit 1
fi

# Application readiness check
echo "🔍 Performing application readiness check..."
python3 -c "
import sys
sys.path.append('src')

try:
    from main import app
    print('✅ Application import successful')
except Exception as e:
    print(f'❌ Application import failed: {e}')
    exit(1)
"

# Graceful shutdown handler
echo "🛡️  Setting up graceful shutdown handler..."
trap 'echo "🛑 Received shutdown signal, shutting down gracefully..."; kill -TERM $PID; wait $PID' TERM INT

# Start the application with blue-green optimizations
echo "🚀 Starting FastAPI application with blue-green configuration..."
echo "🌐 Environment: $ENVIRONMENT_COLOR"
echo "⚡ Port: $PORT"

# Use gunicorn with optimized settings for blue-green deployment
exec gunicorn \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:$PORT \
    --timeout 120 \
    --keepalive 5 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --graceful-timeout 30 \
    --worker-tmp-dir /dev/shm \
    --log-level info \
    --access-logfile - \
    --error-logfile - \
    --capture-output \
    --enable-stdio-inheritance \
    src.main:app &

PID=$!

echo "✅ Application started with PID: $PID"
echo "🔄 Blue-green deployment ready"

# Wait for the application to exit
wait $PID