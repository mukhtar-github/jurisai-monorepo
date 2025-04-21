# Secure Handling of Credentials

This guide provides information on how to securely handle credentials in the JurisAI project.

## Current Issue: API Keys in Git History

GitHub has detected an API key in your Git history, specifically in the RAILWAY-DEPLOYMENT.md file. This is a security issue because:

1. API keys committed to Git history remain there even after you edit the file
2. Anyone with access to the repository can see these keys
3. Bad actors scan GitHub for exposed API keys

## Immediate Steps to Fix

Follow these steps to fix the current issue:

1. **Change your API keys immediately**
   - Go to the [OpenAI dashboard](https://platform.openai.com/api-keys) and generate a new API key
   - Update your Railway environment variables with the new key
   - Consider the old key as compromised

2. **Clean your Git history**
   - Use the provided script to clean the Git history
   ```bash
   chmod +x clean-git-history.sh
   ./clean-git-history.sh
   ```
   - Choose option 1 to completely remove RAILWAY-DEPLOYMENT.md from history
   - After cleaning, add back the current (safe) version of the file

3. **Force push the changes**
   ```bash
   git push origin master --force
   ```

## Best Practices for Credential Management

To avoid similar issues in the future:

### 1. Use Environment Files (Not in Git)

Create a `.env` file for local development and add it to your `.gitignore`:

```bash
# .env example
DATABASE_URL=postgresql://localhost:5432/jurisai
OPENAI_API_KEY=your_key_here
```

### 2. Use Railway's Environment Management

Store all production credentials in Railway's environment management system:
- Go to your Railway project
- Click on "Variables"
- Add each credential as a new variable

### 3. Use `.env.example` for Documentation

Instead of documenting actual credentials, create a `.env.example` file:

```bash
# PostgreSQL connection string
DATABASE_URL=postgresql://username:password@host:port/database

# OpenAI API key
OPENAI_API_KEY=sk_xxxxxxxxxxxxxxxxxxxx
```

### 4. Use a Credential Scanner

Set up a pre-commit hook to scan for credentials:

```bash
# Installation
npm install -g @secretlint/secretlint
npm install -g @secretlint/secretlint-rule-preset-recommend

# Create config
echo '{
  "rules": [
    {
      "id": "@secretlint/secretlint-rule-preset-recommend"
    }
  ]
}' > .secretlintrc.json

# Add to your pre-commit hook or run manually
secretlint "**/*"
```

## What to Do If You Accidentally Commit Credentials

1. Change the credentials immediately
2. Clean your Git history
3. Force push the changes
4. Notify your team about the incident

For more information, see GitHub's guide on [removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).
