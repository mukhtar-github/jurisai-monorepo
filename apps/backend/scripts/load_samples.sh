#!/bin/bash
# Script to load sample data into the JurisAI database

# Navigate to the backend directory
cd "$(dirname "$0")/.."

# Activate virtual environment if available
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run the sample data loader
python scripts/load_sample_data.py

# Deactivate virtual environment if we activated it
if [ -n "$VIRTUAL_ENV" ]; then
    deactivate
fi

echo "Sample data loading process completed!"
