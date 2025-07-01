"""Add agent tasks table

Revision ID: e5f6a7b8c9d1
Revises: d4e5f6a7b8c9
Create Date: 2025-07-01 12:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON


# revision identifiers, used by Alembic.
revision = 'e5f6a7b8c9d1'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade():
    # Create agent_tasks table
    op.create_table(
        'agent_tasks',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('agent_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, default='pending'),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('document_id', sa.Integer(), nullable=True),
        sa.Column('parameters', JSON(), nullable=True),
        sa.Column('results', JSON(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index(op.f('ix_agent_tasks_id'), 'agent_tasks', ['id'])
    op.create_index(op.f('ix_agent_tasks_agent_type'), 'agent_tasks', ['agent_type'])
    op.create_index(op.f('ix_agent_tasks_status'), 'agent_tasks', ['status'])
    op.create_index(op.f('ix_agent_tasks_user_id'), 'agent_tasks', ['user_id'])
    op.create_index(op.f('ix_agent_tasks_document_id'), 'agent_tasks', ['document_id'])
    
    # Create foreign key constraints
    op.create_foreign_key(
        'fk_agent_tasks_user_id',
        'agent_tasks', 'users',
        ['user_id'], ['id'],
        ondelete='SET NULL'
    )
    
    op.create_foreign_key(
        'fk_agent_tasks_document_id', 
        'agent_tasks', 'legal_documents',
        ['document_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade():
    # Drop foreign key constraints
    op.drop_constraint('fk_agent_tasks_document_id', 'agent_tasks', type_='foreignkey')
    op.drop_constraint('fk_agent_tasks_user_id', 'agent_tasks', type_='foreignkey')
    
    # Drop indexes
    op.drop_index(op.f('ix_agent_tasks_document_id'), 'agent_tasks')
    op.drop_index(op.f('ix_agent_tasks_user_id'), 'agent_tasks')
    op.drop_index(op.f('ix_agent_tasks_status'), 'agent_tasks')
    op.drop_index(op.f('ix_agent_tasks_agent_type'), 'agent_tasks')
    op.drop_index(op.f('ix_agent_tasks_id'), 'agent_tasks')
    
    # Drop table
    op.drop_table('agent_tasks')