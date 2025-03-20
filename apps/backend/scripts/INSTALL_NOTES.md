# Installation & Setup Notes

## Running the Sample Data Loader

To run the sample data loader script, you need to have all the required dependencies installed.
Since this project uses Poetry for dependency management, follow these steps:

### Option 1: Using Poetry (Recommended)

```bash
# Navigate to the backend directory
cd apps/backend

# Make sure Poetry is installed
# If not, follow instructions at https://python-poetry.org/docs/#installation

# Install dependencies
poetry install

# Run the script within the Poetry environment
poetry run python scripts/load_sample_data.py
```

### Option 2: Using a Virtual Environment

```bash
# Navigate to the backend directory
cd apps/backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install sqlalchemy fastapi uvicorn pydantic psycopg2-binary redis python-multipart alembic

# Run the script
python scripts/load_sample_data.py

# Deactivate when done
deactivate
```

### Option 3: Quick Installation

If you just want to install the required dependencies for the script directly:

```bash
pip install sqlalchemy
```

## Database Configuration

The script assumes that the database connection is configured in `src/core/database.py`. Make sure your database is set up and running before executing the script.

## Troubleshooting

If you encounter errors related to missing modules:
1. Make sure all dependencies are installed
2. Check that you're using the correct Python environment
3. Verify that the database connection configuration is correct
