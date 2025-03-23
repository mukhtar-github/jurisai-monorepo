# JurisAI Railway Deployment Guide

This guide provides steps to deploy both the backend and frontend of JurisAI on Railway.app, a platform-as-a-service that makes deployment simple.

## Prerequisites

1. [Railway Account](https://railway.app/) - Sign up or log in
2. [Railway CLI](https://docs.railway.app/develop/cli) - Install with `npm i -g @railway/cli`
3. Git repository for your JurisAI project

## Backend Deployment

### Step 1: Initialize Railway Project

```bash
# Login to Railway
railway login

# Initialize a new project (or link to existing)
railway init
```

### Step 2: Configure Environment Variables

Set the following environment variables in Railway Dashboard for your backend service:

```
# Database Configuration
DATABASE_URL=postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}
TEST_MODE=false

# API Configuration
API_PORT=8000
API_HOST=0.0.0.0
DEBUG=false

# JWT Authentication
JWT_SECRET_KEY=<your-secret-key>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS Settings
FRONTEND_URL=<your-frontend-url>.railway.app

# AI Model Settings
AI_MODEL_PATH=/app/models
EMBEDDINGS_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2

# Logging
LOG_LEVEL=INFO
```

### Step 3: Add PostgreSQL Database

1. In Railway Dashboard, click "New"
2. Select "Database" > "PostgreSQL"
3. Once created, the database connection variables will be automatically available to your backend service

### Step 4: Deploy Backend

```bash
# Navigate to project root
cd /path/to/jurisai-monorepo

# Deploy to Railway
railway up
```

## Frontend Deployment

### Step 1: Create a New Service for Frontend

1. In Railway Dashboard, click "New"
2. Select "Service" > "GitHub Repo"
3. Choose your JurisAI repository
4. Set the root directory to `/apps/frontend`

### Step 2: Configure Frontend Environment Variables

Set the following environment variables in Railway Dashboard for your frontend service:

```
# API URL (point to your deployed backend)
NEXT_PUBLIC_API_URL=https://<your-backend-service>.railway.app

# Next.js Settings
NODE_ENV=production
```

### Step 3: Configure Build and Start Commands

In your frontend service settings:

1. Set the build command to: `npm run build`
2. Set the start command to: `npm start`

## Validating Deployment

### Backend Validation

1. Access the backend Swagger documentation at `https://<your-backend-service>.railway.app/docs`
2. Verify the health endpoint at `https://<your-backend-service>.railway.app/health`

### Frontend Validation

1. Access the frontend at `https://<your-frontend-service>.railway.app`
2. Test login functionality
3. Verify sample documents are loaded and accessible

## Common Issues and Troubleshooting

### CORS Issues

If you encounter CORS errors:

1. Verify the `FRONTEND_URL` in your backend environment variables
2. Check the CORS configuration in `main.py` to ensure it allows your frontend domain

### Database Connection Issues

If your backend can't connect to the database:

1. Verify the `DATABASE_URL` variable is correctly set
2. Check Railway logs for connection errors

### API Connection Issues

If your frontend can't connect to the backend:

1. Verify the `NEXT_PUBLIC_API_URL` is correctly set
2. Check browser console for network errors

## Continuous Deployment

Railway automatically deploys when you push to your connected repository. To enable branch-specific deployments:

1. Go to your service settings
2. Under "Deployments", configure which branches to watch

## Monitoring

Railway provides logs and monitoring for your services:

1. Navigate to your service in Railway Dashboard
2. Click on "Logs" to view real-time logs
3. Configure alerts for deployment failures or outages

## Scaling

As your application grows:

1. In Railway Dashboard, navigate to your service settings
2. Under "Settings" > "Instance", adjust compute resources as needed
3. Consider enabling auto-scaling for production workloads

---

For more information, refer to [Railway Documentation](https://docs.railway.app/).
