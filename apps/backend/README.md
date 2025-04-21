# JurisAI Backend

The backend for JurisAI, an AI-powered legal assistant for professionals in Nigeria and Africa.

## Setup

### Prerequisites

- Python 3.12+
- Poetry (for dependency management)
- PostgreSQL
- Redis (optional, for caching)

### Installation

1. Install dependencies:

```bash
cd /path/to/jurisai-monorepo/apps/backend
poetry install
```

2. Configure environment variables:

Create a `.env` file in the backend directory with the following variables:

```
DATABASE_URL=postgresql://username:password@localhost/jurisai
REDIS_URL=redis://localhost:6379/0
FRONTEND_URL=http://localhost:3000
```

Replace the values with your actual database and Redis credentials.

3. Run database migrations:

```bash
poetry run alembic upgrade head
```

### Development

To run the development server:

```bash
poetry run uvicorn src.main:app --reload
```

The API will be available at http://localhost:8000

### API Documentation

When the server is running, you can access the API documentation at:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

- `src/core/` - Core functionality (database, cache, etc.)
- `src/models/` - Database models
- `src/routes/` - API routes
- `migrations/` - Database migrations

## Railway Deployment

For Railway deployment, make sure to set up the following environment variables:

- `DATABASE_URL` - Railway will provide this automatically when using their PostgreSQL plugin
- `REDIS_URL` - Railway will provide this automatically when using their Redis plugin
- `FRONTEND_URL` - The URL of the deployed frontend

## Testing

To run tests:

```bash
poetry run pytest
```

## Database Migration Management

JurisAI includes a comprehensive database migration and diagnostic system to help troubleshoot and fix database issues, especially in production environments.

### Using the Migration Manager Script

The `scripts/manage_migrations.py` script provides several tools to manage database migrations:

```bash
# Check migration status
poetry run python scripts/manage_migrations.py check

# Apply pending migrations
poetry run python scripts/manage_migrations.py apply

# Verify table structure
poetry run python scripts/manage_migrations.py verify

# Fix migration sequence issues
poetry run python scripts/manage_migrations.py fix
```

Add the `--verbose` or `-v` flag for more detailed output, and `--yes` or `-y` to automatically confirm actions.

### System Status API Endpoint

The backend provides a system status endpoint that can be used to check the database status without authentication:

```
GET /system/status
```

This returns information about:
- Database connection status
- Migration completeness
- List of available and missing tables
- System uptime and version

### Migration Management API (Admin Only)

For administrators, the system provides an API endpoint to manage migrations:

```
POST /system/migrations?action=check|apply|verify|fix
```

This requires admin authentication and allows for checking, applying, verifying, and fixing migrations directly through the API.

### Frontend Diagnostic Tools

A debugging panel is available in the frontend that can be toggled with `Alt+Shift+D`. This panel provides:
- System status checking
- API connectivity testing
- Migration management for admins
- Summarization testing
- Enhanced error logging toggle

### Troubleshooting Migration Issues

If you encounter database migration issues in production:

1. Check the system status using the `/system/status` endpoint
2. If tables are missing, use the migration fix tool:
   ```bash
   poetry run python scripts/manage_migrations.py fix
   ```
3. Verify that all tables are present:
   ```bash
   poetry run python scripts/manage_migrations.py verify
   ```
4. Apply any remaining migrations:
   ```bash
   poetry run python scripts/manage_migrations.py apply
   ```

For persistent issues, enable the detailed logging in the frontend debug panel.
