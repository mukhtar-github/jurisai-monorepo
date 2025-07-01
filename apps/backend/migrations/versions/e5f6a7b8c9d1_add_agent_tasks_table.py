"""Add agent tasks table for tracking AI agent workflows

Revision ID: e5f6a7b8c9d1
Revises: d4e5f6a7b8c9
Create Date: 2025-07-01 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'e5f6a7b8c9d1'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade():
    """Create agent_tasks table and add agent fields to documents table."""
    
    # Create agent_tasks table
    op.create_table(
        'agent_tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('document_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('agent_type', sa.String(length=100), nullable=False),
        sa.Column('task_type', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, default='pending'),
        sa.Column('parameters', sa.JSON(), nullable=True),
        sa.Column('result', sa.JSON(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for performance
    op.create_index('idx_agent_tasks_user_status', 'agent_tasks', ['user_id', 'status'])
    op.create_index('idx_agent_tasks_document', 'agent_tasks', ['document_id'])
    op.create_index('idx_agent_tasks_created', 'agent_tasks', ['created_at'])
    op.create_index('idx_agent_tasks_agent_type', 'agent_tasks', ['agent_type'])
    op.create_index('idx_agent_tasks_status', 'agent_tasks', ['status'])
    
    # Add foreign key constraints
    op.create_foreign_key(
        'fk_agent_tasks_user_id_users',
        'agent_tasks', 'users',
        ['user_id'], ['id'],
        ondelete='CASCADE'
    )
    
    op.create_foreign_key(
        'fk_agent_tasks_document_id_legal_documents',
        'agent_tasks', 'legal_documents',
        ['document_id'], ['id'],
        ondelete='CASCADE'
    )
    
    # Add agent processing fields to existing legal_documents table
    op.add_column('legal_documents', sa.Column('agent_processing_status', sa.String(length=50), nullable=True))
    op.add_column('legal_documents', sa.Column('agent_last_analysis', sa.DateTime(), nullable=True))
    
    # Create index for agent processing status
    op.create_index('idx_legal_documents_agent_status', 'legal_documents', ['agent_processing_status'])


def downgrade():
    """Drop agent_tasks table and remove agent fields from legal_documents table."""
    
    # Drop index from legal_documents table
    op.drop_index('idx_legal_documents_agent_status', table_name='legal_documents')
    
    # Remove agent columns from legal_documents table
    op.drop_column('legal_documents', 'agent_last_analysis')
    op.drop_column('legal_documents', 'agent_processing_status')
    
    # Drop foreign key constraints
    op.drop_constraint('fk_agent_tasks_document_id_legal_documents', 'agent_tasks', type_='foreignkey')
    op.drop_constraint('fk_agent_tasks_user_id_users', 'agent_tasks', type_='foreignkey')
    
    # Drop indexes
    op.drop_index('idx_agent_tasks_status', table_name='agent_tasks')
    op.drop_index('idx_agent_tasks_agent_type', table_name='agent_tasks')
    op.drop_index('idx_agent_tasks_created', table_name='agent_tasks')
    op.drop_index('idx_agent_tasks_document', table_name='agent_tasks')
    op.drop_index('idx_agent_tasks_user_status', table_name='agent_tasks')
    
    # Drop table
    op.drop_table('agent_tasks')