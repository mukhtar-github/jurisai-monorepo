# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JurisAI is an AI-powered legal assistant for legal professionals in Nigeria and Africa. The project is organized as a monorepo with three main applications:

- **Backend** (`apps/backend/`): FastAPI-based API server with PostgreSQL and Redis
- **Frontend** (`apps/frontend/`): Next.js React application with TypeScript
- **PWA** (`apps/pwa/`): Progressive Web App for mobile access

## Development Commands

### Backend (Python/FastAPI)
```bash
# Navigate to backend
cd apps/backend

# Install dependencies
poetry install

# Run development server
poetry run uvicorn src.main:app --reload

# Run tests
poetry run pytest

# Run tests with coverage
poetry run pytest --cov

# Code formatting
poetry run black .
poetry run isort .

# Linting
poetry run flake8

# Database migrations
poetry run alembic upgrade head
poetry run alembic revision --autogenerate -m "description"

# Migration management (diagnostic tools)
poetry run python scripts/manage_migrations.py check
poetry run python scripts/manage_migrations.py apply
poetry run python scripts/manage_migrations.py verify
poetry run python scripts/manage_migrations.py fix
```

### Frontend (Next.js/TypeScript)
```bash
# Navigate to frontend
cd apps/frontend

# Install dependencies
npm install --legacy-peer-deps

# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm run start

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Linting
npm run lint
```

## Architecture & Key Components

### Backend Architecture
- **FastAPI** framework with PostgreSQL database
- **SQLAlchemy** ORM with Alembic migrations
- **Redis** for caching and session management
- **Role-Based Access Control (RBAC)** system
- **Document processing** with AI-powered summarization
- **Vector search** using FAISS for semantic document retrieval

### Frontend Architecture
- **Next.js 15** with React 19 and TypeScript
- **React Query** for state management and API caching
- **Axios** HTTP client with interceptors
- **Shadcn UI** component library with Tailwind CSS
- **Custom hooks** for API integration
- **Context providers** for global state

### Database Models
Key models include:
- `User` with role-based permissions
- `Role` and `Permission` for RBAC
- `Document` for legal document management
- Located in `apps/backend/src/models/`

### API Structure
- **Authentication**: `/auth/` routes
- **Documents**: `/documents/` routes
- **Search**: `/search/` routes
- **Summarization**: `/summarization/` routes
- **Admin**: `/admin/` routes for user/role management
- **System**: `/system/` routes for health checks and diagnostics

## Testing Approach

### Backend Testing
- Uses **pytest** with in-memory SQLite for tests
- Test fixtures in `tests/conftest.py`
- API endpoint tests in `tests/api/`
- Model tests in `tests/models/`

### Frontend Testing  
- Uses **Jest** with Testing Library
- Component tests in `__tests__/components/`
- Hook tests in `__tests__/hooks/`
- API client tests in `__tests__/api/`

## Diagnostic Tools

### Frontend Debug Panel
- Press `Alt+Shift+D` to toggle debugging panel
- Provides system status, API testing, and admin migration tools
- Located in `components/summarization/SummarizationDebugger.tsx`

### Backend System Status
- `/system/status` endpoint for health checks
- Migration management scripts in `scripts/manage_migrations.py`
- Database verification tools

## Environment Configuration

### Backend Environment Variables
```
DATABASE_URL=postgresql://username:password@localhost/jurisai
REDIS_URL=redis://localhost:6379/0
FRONTEND_URL=http://localhost:3000
```

### Frontend Environment Variables
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Development Workflow

1. **Database Setup**: Run migrations before starting development
2. **Dependency Management**: Use Poetry for backend, npm for frontend
3. **Code Quality**: Run linting and formatting before commits
4. **Testing**: Ensure tests pass before submitting changes
5. **Type Safety**: TypeScript strict mode enabled for frontend

## Important Notes

- Frontend uses `--legacy-peer-deps` due to React 19 compatibility
- Backend requires Python 3.12+
- Database migrations should be tested with the diagnostic tools
- The project follows trunk-based development workflow
- Security best practices implemented with RBAC and proper validation