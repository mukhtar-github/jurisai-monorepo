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
