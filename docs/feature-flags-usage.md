# Feature Flags Usage Guide

## Overview

The JurisAI feature flag system provides controlled rollout capabilities for new features, particularly the upcoming agent-based AI functionality. This system allows for:

- **Gradual rollouts** with percentage-based targeting
- **User and group targeting** for specific audiences
- **A/B testing** capabilities
- **Environment-specific** feature control
- **Time-based activation** for scheduled releases

## Quick Start

### 1. Enable the Feature Flag Routes

Feature flags are automatically included when you run the JurisAI backend. The routes are available at `/api/v1/feature-flags/`.

### 2. Run Database Migration

```bash
cd apps/backend
poetry run alembic upgrade head
```

This creates the `feature_flags` table and adds initial flags for the agent system.

### 3. Check User Feature Flags

```bash
# Get all feature flags for the current user
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/v1/feature-flags/user-flags

# Check a specific feature flag
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/v1/feature-flags/check/agent_document_analysis
```

## Administrative API Usage

### Create a Feature Flag

```bash
curl -X POST \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "new_ai_feature",
    "name": "New AI Feature",
    "description": "Enable new AI-powered document analysis",
    "enabled": true,
    "rollout_percentage": 25.0,
    "targeted_user_groups": ["beta_users"],
    "environment": "production"
  }' \
  http://localhost:8000/api/v1/feature-flags/admin/flags
```

### Update a Feature Flag

```bash
curl -X PUT \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rollout_percentage": 50.0,
    "enabled": true
  }' \
  http://localhost:8000/api/v1/feature-flags/admin/flags/new_ai_feature
```

### Toggle a Feature Flag

```bash
curl -X POST \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:8000/api/v1/feature-flags/admin/flags/new_ai_feature/toggle
```

### List All Feature Flags

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
     http://localhost:8000/api/v1/feature-flags/admin/flags
```

## Using Feature Flags in Code

### Method 1: Using the Service Directly

```python
from fastapi import Depends
from src.services.feature_flags import FeatureFlagService, get_feature_flag_service
from src.routes.auth import get_current_user

@router.post("/documents/{document_id}/analyze")
async def analyze_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    feature_service: FeatureFlagService = Depends(get_feature_flag_service)
):
    # Check if agent analysis is enabled for this user
    use_agents = await feature_service.is_enabled(
        "agent_document_analysis", 
        str(current_user.id)
    )
    
    if use_agents:
        return await agent_enhanced_analysis(document_id)
    else:
        return await legacy_analysis(document_id)
```

### Method 2: Using the Dependency Helper

```python
from src.services.dependencies import get_feature_context

@router.post("/documents/{document_id}/analyze")
async def analyze_document(
    document_id: str,
    feature_context = Depends(get_feature_context)
):
    context = await feature_context
    
    if context["is_enabled"]("agent_document_analysis"):
        return await agent_enhanced_analysis(document_id)
    else:
        return await legacy_analysis(document_id)
```

### Method 3: Using Feature-Gated Endpoints

```python
from src.services.dependencies import feature_flag_required

@router.post("/agents/analyze-document")
async def agent_analyze_document(
    document_id: str,
    flag_check = Depends(feature_flag_required("agent_document_analysis", fallback_allowed=False))
):
    # This endpoint is only accessible when the feature flag is enabled
    context = await flag_check
    return await agent_enhanced_analysis(document_id)
```

## Pre-configured Agent System Flags

The migration automatically creates these feature flags for the agent system:

### `agent_document_analysis`
- **Purpose**: Enable AI agent-powered document analysis
- **Default**: Disabled, admin-only access
- **Usage**: Controls access to enhanced document analysis features

### `agent_legal_research`
- **Purpose**: Enable AI agent-powered legal research
- **Default**: Disabled, admin-only access
- **Usage**: Controls access to autonomous legal research capabilities

### `agent_system_debug`
- **Purpose**: Enable debug panel for agent system monitoring
- **Default**: Disabled, admin-only access
- **Usage**: Shows diagnostic information and agent performance metrics

### `agent_websocket_updates`
- **Purpose**: Enable real-time WebSocket updates for agent tasks
- **Default**: Disabled, admin-only access
- **Usage**: Provides live status updates for long-running agent tasks

## Feature Flag Configuration Options

### Basic Settings
- **key**: Unique identifier (alphanumeric, hyphens, underscores only)
- **name**: Human-readable name
- **description**: Detailed description of the feature
- **enabled**: Global on/off switch
- **environment**: `development`, `staging`, or `production`

### Rollout Control
- **rollout_percentage**: 0-100% of users who should see the feature
- **targeted_user_ids**: Specific user IDs to include (overrides percentage)
- **targeted_user_groups**: User groups/roles to target (e.g., "admin", "beta_users")
- **excluded_user_ids**: Specific user IDs to exclude (overrides other settings)

### Time-based Control
- **start_date**: When the feature should become active
- **end_date**: When the feature should automatically disable

### Advanced Options
- **context_filters**: Custom context-based targeting rules
- **created_by**: User ID who created the flag (set automatically)

## Rollout Strategies

### 1. Admin-Only Testing
```json
{
  "enabled": true,
  "rollout_percentage": 0,
  "targeted_user_groups": ["admin"]
}
```

### 2. Beta User Group
```json
{
  "enabled": true,
  "rollout_percentage": 0,
  "targeted_user_groups": ["admin", "beta_users"]
}
```

### 3. Gradual Percentage Rollout
```json
{
  "enabled": true,
  "rollout_percentage": 10
}
```

### 4. Scheduled Feature Release
```json
{
  "enabled": true,
  "rollout_percentage": 100,
  "start_date": "2024-07-01T00:00:00Z"
}
```

### 5. Limited-Time Feature
```json
{
  "enabled": true,
  "rollout_percentage": 100,
  "start_date": "2024-07-01T00:00:00Z",
  "end_date": "2024-07-31T23:59:59Z"
}
```

## Monitoring and Analytics

### Check Flag Status
```bash
# Get detailed flag information
curl -H "Authorization: Bearer ADMIN_TOKEN" \
     http://localhost:8000/api/v1/feature-flags/admin/flags/agent_document_analysis
```

### User Flag Evaluation
```bash
# Check flags for a specific user with context
curl -X POST \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "flag_key": "agent_document_analysis",
    "context": {"document_type": "contract"}
  }' \
  http://localhost:8000/api/v1/feature-flags/evaluate
```

## Best Practices

### 1. Naming Conventions
- Use descriptive, kebab-case names: `agent_document_analysis`
- Include the system/feature area: `agent_*`, `ui_*`, `api_*`
- Avoid generic names like `new_feature` or `test`

### 2. Rollout Process
1. **Start with admin-only** testing
2. **Expand to beta users** for broader testing
3. **Gradual percentage rollout** (5% → 25% → 50% → 100%)
4. **Monitor performance** and error rates at each stage
5. **Full rollout** once confident

### 3. Documentation
- Always include clear descriptions for each flag
- Document the feature's purpose and impact
- Note any dependencies or prerequisites

### 4. Cleanup
- Remove flags after features are fully rolled out
- Archive historical flags for analytics purposes
- Set end dates for temporary features

## Troubleshooting

### Feature Flag Not Working
1. **Check flag existence**: Verify the flag exists in the database
2. **Check user permissions**: Ensure the user has access to the feature
3. **Check rollout percentage**: Verify the user falls within the rollout
4. **Check time constraints**: Ensure current time is within start/end dates
5. **Check cache**: Redis cache might need to be cleared

### Cache Issues
```bash
# Clear feature flag cache (if needed)
redis-cli FLUSHDB
```

### Database Issues
```bash
# Check if migration was applied
poetry run alembic current

# Apply missing migrations
poetry run alembic upgrade head
```

## Security Considerations

- **Admin access required** for flag management
- **User isolation**: Users can only check their own flags
- **Audit trail**: All flag changes are logged with timestamps
- **Rate limiting**: Consider implementing rate limits for flag checks
- **Cache security**: Ensure Redis is properly secured in production

## Environment-Specific Configuration

### Development
```json
{
  "environment": "development",
  "enabled": true,
  "rollout_percentage": 100
}
```

### Staging
```json
{
  "environment": "staging", 
  "enabled": true,
  "rollout_percentage": 50
}
```

### Production
```json
{
  "environment": "production",
  "enabled": true,
  "rollout_percentage": 10,
  "targeted_user_groups": ["beta_users"]
}
```