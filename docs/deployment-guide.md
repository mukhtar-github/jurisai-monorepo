# JurisAI Deployment Guide

## Overview

This guide covers the deployment setup for JurisAI's monorepo with Vercel frontend and Railway backend integration.

## Architecture

- **Frontend**: Next.js application deployed on Vercel
- **Backend**: FastAPI application deployed on Railway
- **Database**: PostgreSQL on Railway
- **Cache**: Redis on Railway
- **Deployment**: Blue-Green deployment strategy

## URLs

- **Production Frontend**: https://jurisai-monorepo-it54.vercel.app
- **Production Backend**: https://jurisai-monorepo-production.up.railway.app
- **API Documentation**: https://jurisai-monorepo-production.up.railway.app/docs

## Prerequisites

### Required Tools

1. **Node.js** (v18+ recommended)
2. **Python** (v3.12+ required)
3. **Railway CLI**
4. **Git**

### Accounts Required

1. **Vercel Account** (for frontend deployment)
2. **Railway Account** (for backend deployment)
3. **GitHub Account** (for CI/CD)

## Development Setup

### 1. Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd jurisai-monorepo

# Run the setup script
./scripts/setup-dev-env.sh
```

### 2. Manual Setup (if script fails)

#### Backend Setup

```bash
cd apps/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp env_sample.txt .env
# Edit .env with your values

# Run database migrations
alembic upgrade head
```

#### Frontend Setup

```bash
cd apps/frontend

# Install dependencies
npm install --legacy-peer-deps

# Create environment file
cp .env.example .env.local
# Edit .env.local with your values
```

### 3. Running Development Servers

```bash
# Backend (Terminal 1)
./scripts/dev-backend.sh

# Frontend (Terminal 2)  
./scripts/dev-frontend.sh
```

## Production Deployment

### Railway Backend Deployment

#### 1. Setup Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Or use the setup script
RAILWAY_TOKEN=your_token ./scripts/railway-setup.sh
```

#### 2. Manual Railway Setup

```bash
# Login to Railway
railway login

# Link to project
railway link jurisai-monorepo

# Add services
railway add postgres
railway add redis

# Set environment variables
railway variables set FRONTEND_URL=https://jurisai-monorepo-it54.vercel.app
railway variables set LOG_LEVEL=INFO
railway variables set DEBUG=false
# Set other variables in Railway dashboard

# Deploy
railway deploy
```

#### 3. Environment Variables (Railway Dashboard)

Set these variables in the Railway dashboard:

**Required:**
- `DATABASE_URL`: Automatically provided by PostgreSQL service
- `REDIS_URL`: Automatically provided by Redis service
- `SECRET_KEY`: Generate a secure random key
- `OPENAI_API_KEY`: Your OpenAI API key

**Optional:**
- `OPENAI_MODEL_NAME`: gpt-3.5-turbo (default)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: 60 (default)

### Vercel Frontend Deployment

#### 1. Vercel Dashboard Setup

1. Go to Vercel dashboard
2. Import the project from GitHub
3. Set root directory to `apps/frontend`
4. Configure environment variables

#### 2. Environment Variables (Vercel)

```bash
NEXT_PUBLIC_API_URL=https://jurisai-monorepo-production.up.railway.app
NEXT_PUBLIC_APP_NAME=JurisAI
NEXT_PUBLIC_ENVIRONMENT=production
```

#### 3. Build Settings

- **Framework Preset**: Next.js
- **Root Directory**: apps/frontend
- **Build Command**: `next build`
- **Output Directory**: `.next`

## Blue-Green Deployment

### Using the Deployment Script

```bash
# Set Railway token
export RAILWAY_TOKEN=your_token

# Run blue-green deployment
./scripts/deploy-blue-green.sh deploy

# Check deployment status
./scripts/deploy-blue-green.sh status

# Rollback if needed
./scripts/deploy-blue-green.sh rollback
```

### Manual Blue-Green Process

1. **Deploy to staging environment**
2. **Test staging deployment**
3. **Switch traffic to new deployment**
4. **Monitor and rollback if necessary**

## Health Checks

### Railway Health Check

The backend includes multiple health check endpoints:

- `/health` - Main health check for Railway
- `/healthz` - Kubernetes-style health check
- `/ready` - Readiness check

### Testing Health Checks

```bash
# Test local health check
curl http://localhost:8000/health

# Test production health check
curl https://jurisai-monorepo-production.up.railway.app/health
```

## Troubleshooting

### Common Issues

#### 1. Railway Health Check Failures

**Problem**: Railway deployment fails with health check errors

**Solution**: 
- FastAPI redirect issues fixed with `redirect_slashes=False`
- Multiple health check endpoints provided
- Extended health check timeout to 180 seconds

#### 2. CORS Issues

**Problem**: Frontend cannot connect to backend

**Solution**:
- Added production frontend URL to CORS origins
- Environment variable `FRONTEND_URL` configures additional origins

#### 3. Database Connection Issues

**Problem**: Cannot connect to PostgreSQL

**Solution**:
- Check `DATABASE_URL` environment variable
- Verify PostgreSQL service is running on Railway
- Run migrations: `alembic upgrade head`

#### 4. Virtual Environment Issues

**Problem**: Python packages not found

**Solution**:
```bash
cd apps/backend
source venv/bin/activate
pip install -r requirements.txt
```

### Debugging Commands

```bash
# Check Railway status
railway status

# View Railway logs
railway logs

# Check environment variables
railway variables

# Test API connectivity
curl -v https://jurisai-monorepo-production.up.railway.app/health

# Check frontend build
cd apps/frontend && npm run build
```

## Monitoring

### Railway Monitoring

- Use Railway dashboard for deployment status
- Monitor logs: `railway logs`
- Check metrics in Railway dashboard

### Application Monitoring

- Health check endpoints for service status
- Error logging in FastAPI application
- Frontend error tracking via browser dev tools

## Security Considerations

### Environment Variables

- Never commit `.env` files to Git
- Use Railway dashboard for sensitive variables
- Rotate secrets regularly

### CORS Configuration

- Only allow necessary origins
- Verify frontend URLs in CORS settings
- Monitor for CORS-related errors

### API Security

- JWT token authentication implemented
- Rate limiting recommended for production
- Regular security updates

## CI/CD Integration

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml` for automated deployment:

```yaml
name: Deploy to Railway
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        uses: railway/deploy@v1
        with:
          token: ${{ secrets.RAILWAY_TOKEN }}
```

## Performance Optimization

### Railway Optimization

- Use Gunicorn with multiple workers
- Enable PostgreSQL connection pooling
- Configure Redis for caching

### Vercel Optimization

- Enable Vercel Analytics
- Configure caching headers
- Optimize bundle size

## Backup and Recovery

### Database Backups

- Railway provides automatic PostgreSQL backups
- Additional backup strategies recommended for production

### Configuration Backups

- Export environment variables regularly
- Document configuration changes
- Version control infrastructure code

## Support and Resources

- **Railway Documentation**: https://docs.railway.app
- **Vercel Documentation**: https://vercel.com/docs
- **FastAPI Documentation**: https://fastapi.tiangolo.com
- **Next.js Documentation**: https://nextjs.org/docs