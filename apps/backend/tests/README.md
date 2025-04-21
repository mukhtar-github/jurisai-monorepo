# JurisAI Backend Tests

This directory contains tests for the JurisAI backend application.

## Test Structure

- `tests/api/`: Tests for API endpoints
- `tests/models/`: Tests for database models
- `conftest.py`: Test fixtures and configuration

## Running Tests

To run the tests, you'll need to install the development dependencies first:

```bash
cd apps/backend
poetry install --with dev
```

Then run the tests using pytest:

```bash
poetry run pytest
```

To run tests with coverage:

```bash
poetry run pytest --cov=src
```

To generate a coverage report:

```bash
poetry run pytest --cov=src --cov-report=html
```

## Writing Tests

When writing tests:

1. Place API tests in the `tests/api/` directory
2. Place model tests in the `tests/models/` directory
3. Use the fixtures defined in `conftest.py` when needed
4. Name test files with a `test_` prefix
5. Name test functions with a `test_` prefix
