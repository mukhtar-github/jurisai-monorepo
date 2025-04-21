"""Add document tables 

Revision ID: b2c3d4e5f6a7
Revises: merge_multiple_heads
Create Date: 2025-04-21 13:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = 'merge_multiple_heads'
branch_labels = None
depends_on = None


def upgrade():
    # Create legal_documents table
    op.create_table(
        'legal_documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=True, index=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('document_type', sa.String(length=50), nullable=True, index=True),
        sa.Column('jurisdiction', sa.String(length=100), nullable=True, index=True),
        sa.Column('publication_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('doc_metadata', JSON(), nullable=True),
        sa.Column('file_format', sa.String(length=10), nullable=True),
        sa.Column('word_count', sa.Integer(), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create document_entities table
    op.create_table(
        'document_entities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=True, index=True),
        sa.Column('entity_type', sa.String(length=50), nullable=True),
        sa.Column('entity_text', sa.String(length=255), nullable=True),
        sa.Column('start_position', sa.Integer(), nullable=True),
        sa.Column('end_position', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['document_id'], ['legal_documents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create document_key_terms table
    op.create_table(
        'document_key_terms',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=True, index=True),
        sa.Column('term', sa.String(length=100), nullable=True),
        sa.Column('relevance_score', sa.Float(), nullable=True),
        sa.Column('frequency', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['document_id'], ['legal_documents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    # Drop tables in reverse order of creation to respect foreign key constraints
    op.drop_table('document_key_terms')
    op.drop_table('document_entities')
    op.drop_table('legal_documents')
