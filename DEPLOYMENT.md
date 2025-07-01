# JurisAI Deployment Quick Reference

## 🚀 Quick Deploy

### Deploy to Railway (Backend)
```bash
export RAILWAY_TOKEN=11c4d4e8-1cb8-4061-8b08-90af0b64ceef
./scripts/railway-setup.sh deploy
```

### Deploy to Vercel (Frontend)
- Push to main branch (auto-deploy if connected)
- Or use Vercel CLI: `vercel --prod`

## 🔧 Configuration Summary

### URLs
- **Frontend**: https://jurisai-monorepo-it54.vercel.app
- **Backend**: https://jurisai-monorepo-production.up.railway.app

### Key Fixes Applied

#### ✅ Railway Health Check Fix
- Added `redirect_slashes=False` to FastAPI
- Multiple health endpoints: `/health`, `/healthz`, `/ready`
- Extended timeout to 180 seconds

#### ✅ CORS Configuration
- Added production frontend URL to CORS origins
- Support for multiple frontend URLs via environment variable

#### ✅ Environment Variables
- All configurations updated with correct frontend URL
- Railway uses `requirements.txt` instead of Poetry

#### ✅ Blue-Green Deployment
- Complete blue-green deployment script with Railway CLI
- Automatic rollback on failure
- Health check validation

## 📋 Required Railway Environment Variables

Set these in Railway dashboard:

**Auto-provided by Railway:**
- `DATABASE_URL` (PostgreSQL service)
- `REDIS_URL` (Redis service)
- `PORT` (Railway sets automatically)

**Must set manually:**
- `SECRET_KEY` (generate secure random key)
- `OPENAI_API_KEY` (your OpenAI API key)
- `FRONTEND_URL=https://jurisai-monorepo-it54.vercel.app`

**Optional:**
- `OPENAI_MODEL_NAME=gpt-3.5-turbo`
- `ACCESS_TOKEN_EXPIRE_MINUTES=60`
- `LOG_LEVEL=INFO`
- `DEBUG=false`

## 🛠️ Development Commands

```bash
# Setup development environment
./scripts/setup-dev-env.sh

# Run backend (with virtual environment)
./scripts/dev-backend.sh

# Run frontend
./scripts/dev-frontend.sh

# Run tests
./scripts/test-backend.sh
./scripts/test-frontend.sh

# Validate configuration
./scripts/validate-setup.sh
```

## 🔄 Deployment Commands

```bash
# Deploy to Railway
export RAILWAY_TOKEN=11c4d4e8-1cb8-4061-8b08-90af0b64ceef
./scripts/railway-setup.sh deploy

# Blue-green deployment
./scripts/deploy-blue-green.sh deploy

# Check deployment status
railway status

# View logs
railway logs
```

## ⚠️ Important Notes

1. **Railway Token**: Use the provided token `11c4d4e8-1cb8-4061-8b08-90af0b64ceef`
2. **Frontend URL**: Always use `https://jurisai-monorepo-it54.vercel.app`
3. **Health Checks**: Railway expects 200 responses, no redirects
4. **Virtual Environment**: Use scripts for proper environment activation
5. **Dependencies**: Project uses `requirements.txt`, not Poetry for Railway

## 🐛 Troubleshooting

### Railway Deployment Fails
```bash
# Check health endpoint locally
curl http://localhost:8000/health

# Check Railway logs
railway logs

# Redeploy
railway deploy
```

### CORS Issues
- Verify frontend URL in Railway environment variables
- Check CORS origins in `apps/backend/src/main.py`

### Database Issues
```bash
# Check database connection
railway connect postgres

# Run migrations
cd apps/backend && source venv/bin/activate && alembic upgrade head
```

## 📞 Support

- Check logs: `railway logs`
- Validate setup: `./scripts/validate-setup.sh`
- Review deployment guide: `docs/deployment-guide.md`