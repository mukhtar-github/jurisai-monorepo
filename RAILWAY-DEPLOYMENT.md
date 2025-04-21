# JurisAI Railway Deployment Guide

This document provides information about the JurisAI deployment on Railway and how to test connectivity between the frontend and the production backend.

## Production Environment Configuration

The JurisAI backend is deployed on Railway with the following configuration:

### Required Environment Variables

The following environment variables need to be configured in your Railway deployment:

| Variable | Description | Example Format |
|----------|-------------|----------------|
| DATABASE_URL | PostgreSQL connection string | `postgresql://username:password@host:port/database` |
| REDIS_URL | Redis connection string | `redis://username:password@host:port` |
| OPENAI_API_KEY | Your OpenAI API key | `sk-...` (obtain from OpenAI dashboard) |
| OPENAI_MODEL_NAME | The OpenAI model to use | `gpt-4` or `gpt-3.5-turbo` |

### Frontend Environment Variables

The frontend requires only a single environment variable:

| Variable | Description | Example |
|----------|-------------|---------|
| NEXT_PUBLIC_API_URL | URL of the backend API | `https://your-app-name.up.railway.app` |

> **IMPORTANT:** Never commit actual credentials or API keys to your repository. Use Railway's environment variable management system to securely store these values.

## Testing Railway Connectivity

The frontend of JurisAI is configured to connect to the Railway backend using the `NEXT_PUBLIC_API_URL` environment variable. To test this connectivity, you can use the provided test script:

```bash
chmod +x test-railway-connectivity.sh
./test-railway-connectivity.sh
```

This script will:
1. Test connectivity to the Railway backend
2. Start the frontend with the correct Railway URL configuration
3. Provide instructions for testing the full system

## Testing Production Migrations

To test and manage migrations on the Railway production backend, use the migration test script:

```bash
chmod +x test-railway-migration.sh
./test-railway-migration.sh
```

This script will:
1. Check the system status on Railway
2. Check the current migration status
3. Verify database tables
4. Offer to fix migration sequence issues (if needed)
5. Offer to apply pending migrations (if any)
6. Perform a final status check

**Note:** This script requires admin authentication to access the migration management endpoints.

## Existing Debug Tools

JurisAI already includes a built-in debugger component (`SummarizationDebugger.tsx`) that can be accessed on any page by pressing `Alt+Shift+D`. This debugger provides:

- System status checking (including database connection and migrations)
- API connectivity testing
- Database migration management for admins
- Detailed error logging controls

To use this debugger in production:
1. Visit the deployed JurisAI application
2. Press `Alt+Shift+D` to toggle the debugger panel
3. Use the provided tools to diagnose any issues

## Troubleshooting Production Issues

If you encounter issues with the production deployment on Railway:

### Database Connection Issues

1. Use the SummarizationDebugger to check the database connection status
2. Verify that the `DATABASE_URL` environment variable on Railway is correctly configured
3. Check that the PostgreSQL service is running on Railway

### OpenAI Integration Issues

1. Press `Alt+Shift+D` to open the debugger
2. Click "Test API Connection" to verify backend connectivity
3. If the API is reachable but summarization fails, the issue may be with the OpenAI API key
4. Verify that the `OPENAI_API_KEY` and `OPENAI_MODEL_NAME` environment variables are correctly set in Railway

### Migration Issues

If you encounter database migration issues in production:

1. Press `Alt+Shift+D` to open the debugger
2. Check the "Migration Status" indicator
3. If you have admin access, use the "Fix Migration Sequence Issues" option
4. Apply any pending migrations using the "Apply Pending Migrations" option

## Deploying Changes to Railway

To deploy changes to the Railway production environment, you need to push your changes to GitHub first. Railway is configured to automatically deploy changes from the GitHub repository.

### Manual GitHub Push

To push changes to GitHub:

1. Stage your changes:
   ```bash
   git add .
   ```

2. Commit your changes:
   ```bash
   git commit -m "Update migration system and connectivity testing"
   ```

3. Push to GitHub:
   ```bash
   git push origin main
   ```

### After Pushing to GitHub

1. Check your GitHub repository to confirm the push
2. Monitor the Railway deployment in the Railway dashboard
3. After deployment completes, test connectivity with:
   ```bash
   ./test-railway-connectivity.sh
   ```
4. Check and manage migrations if needed with:
   ```bash
   ./test-railway-migration.sh
   ```

## Monitoring

JurisAI does not currently have external monitoring tools set up. However, you can:

1. Periodically check the system status using the debugger
2. Review logs in the Railway dashboard
3. Set up automated health checks using an external service that pings the `/health` endpoint
