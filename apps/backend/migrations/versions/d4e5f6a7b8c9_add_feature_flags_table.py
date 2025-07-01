"""Add feature flags table for agent system rollout control

Revision ID: d4e5f6a7b8c9
Revises: merge_heads_migration
Create Date: 2025-06-30 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'd4e5f6a7b8c9'
down_revision = 'merge_heads_migration'
branch_labels = None
depends_on = None


def upgrade():
    """Create feature_flags table for controlling feature rollouts."""
    
    # Create feature_flags table
    op.create_table(
        'feature_flags',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('enabled', sa.Boolean(), nullable=False, default=False),
        sa.Column('rollout_percentage', sa.Float(), nullable=False, default=0.0),
        sa.Column('targeted_user_ids', sa.JSON(), nullable=True),
        sa.Column('targeted_user_groups', sa.JSON(), nullable=True),
        sa.Column('excluded_user_ids', sa.JSON(), nullable=True),
        sa.Column('environment', sa.String(length=50), nullable=False, default='production'),
        sa.Column('context_filters', sa.JSON(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('start_date', sa.DateTime(), nullable=True),
        sa.Column('end_date', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for performance
    op.create_index('ix_feature_flags_key', 'feature_flags', ['key'], unique=True)
    op.create_index('ix_feature_flags_enabled', 'feature_flags', ['enabled'])
    op.create_index('ix_feature_flags_environment', 'feature_flags', ['environment'])
    op.create_index('ix_feature_flags_created_at', 'feature_flags', ['created_at'])
    
    # Add foreign key constraint to users table if it exists
    op.create_foreign_key(
        'fk_feature_flags_created_by_users',
        'feature_flags', 'users',
        ['created_by'], ['id'],
        ondelete='SET NULL'
    )
    
    # Insert initial feature flags for agent system
    op.execute("""
        INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage, environment, targeted_user_groups) VALUES
        ('agent_document_analysis', 'Agent Document Analysis', 'Enable AI agent-powered document analysis', false, 0.0, 'production', '["admin"]'),
        ('agent_legal_research', 'Agent Legal Research', 'Enable AI agent-powered legal research', false, 0.0, 'production', '["admin"]'),
        ('agent_system_debug', 'Agent System Debug Panel', 'Enable debug panel for agent system monitoring', false, 0.0, 'production', '["admin"]'),
        ('agent_websocket_updates', 'Agent WebSocket Updates', 'Enable real-time WebSocket updates for agent tasks', false, 0.0, 'production', '["admin"]')
    """)


def downgrade():
    """Drop feature_flags table and related objects."""
    
    # Drop foreign key constraint
    op.drop_constraint('fk_feature_flags_created_by_users', 'feature_flags', type_='foreignkey')
    
    # Drop indexes
    op.drop_index('ix_feature_flags_created_at', table_name='feature_flags')
    op.drop_index('ix_feature_flags_environment', table_name='feature_flags')
    op.drop_index('ix_feature_flags_enabled', table_name='feature_flags')
    op.drop_index('ix_feature_flags_key', table_name='feature_flags')
    
    # Drop table
    op.drop_table('feature_flags')