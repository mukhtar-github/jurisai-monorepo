# JurisAI Script Utilities

This directory contains utility scripts for the JurisAI project.

## Sample Data Loader

The `load_sample_data.py` script loads realistic sample Nigerian legal documents into the JurisAI database for testing and development purposes.

### What it does:

1. Creates sample document files in the `sample_data` directory
2. Loads these documents into the database with appropriate metadata
3. Adds sample entities for each document (people, organizations, legal concepts)
4. Adds sample key terms for each document with frequency and relevance data

### Sample documents included:

- **Constitution of the Federal Republic of Nigeria (1999)**
- **Companies and Allied Matters Act (2020)**
- **Evidence Act (2011)**
- **Court Cases**:
  - Dangote Industries Ltd v. Zenith Bank Plc
  - Federal Government of Nigeria v. Shell Petroleum Development Company

### How to use:

You can run the sample data loader in two ways:

#### Option 1: Using the shell script

```bash
./scripts/load_samples.sh
```

#### Option 2: Running the Python script directly

```bash
# From the backend directory
python scripts/load_sample_data.py
```

### Notes:

- The script checks for existing documents to avoid duplicates
- Each document includes realistic metadata, entities, and key terms
- The document content is simplified for demonstration purposes

You can modify the script to add more sample documents or customize the existing ones.
