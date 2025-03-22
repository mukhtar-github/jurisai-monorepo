# JurisAI CI/CD Pipeline

This directory contains the continuous integration and continuous deployment workflows for the JurisAI project.

## Workflows

### Backend Tests (`backend-tests.yml`)

This workflow runs the automated tests for the backend application:

- Triggered on push/PR to `main` and `develop` branches when changes affect the backend code
- Sets up Python 3.12 and Poetry
- Installs all dependencies
- Runs the tests with coverage reporting
- Uploads coverage reports to Codecov

### Backend Linting (`backend-linting.yml`)

This workflow checks code quality for the backend application:

- Triggered on push/PR to `main` and `develop` branches when changes affect the backend code
- Sets up Python 3.12 and Poetry
- Runs code quality tools:
  - `flake8`: Checks for PEP 8 style guide compliance
  - `black`: Verifies code formatting
  - `isort`: Checks import sorting

## Testing Configuration

The backend tests are configured to run with:

- SQLite in-memory database for unit tests (controlled by `TEST_MODE` environment variable)
- PostgreSQL-specific features should be tested in a separate integration test suite

## Adding New Workflows

When adding new workflows, follow these guidelines:

1. Create a new `.yml` file in the `.github/workflows` directory
2. Use specific path filters to only run workflows when relevant files change
3. Consider adding both a test workflow and a linting workflow
4. Add build and deployment workflows when ready for production
