"""Add document ownership

Revision ID: f6a7b8c9d1e2
Revises: e5f6a7b8c9d1
Create Date: 2025-07-01 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f6a7b8c9d1e2'
down_revision = 'e5f6a7b8c9d1'
branch_labels = None
depends_on = None


def upgrade():
    # Add owner_id column to legal_documents table
    op.add_column('legal_documents', sa.Column('owner_id', sa.Integer(), nullable=True))
    
    # Create index for owner_id
    op.create_index(op.f('ix_legal_documents_owner_id'), 'legal_documents', ['owner_id'])
    
    # Create foreign key constraint
    op.create_foreign_key(
        'fk_legal_documents_owner_id',
        'legal_documents', 'users',
        ['owner_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade():
    # Drop foreign key constraint
    op.drop_constraint('fk_legal_documents_owner_id', 'legal_documents', type_='foreignkey')
    
    # Drop index
    op.drop_index(op.f('ix_legal_documents_owner_id'), 'legal_documents')
    
    # Drop column
    op.drop_column('legal_documents', 'owner_id')