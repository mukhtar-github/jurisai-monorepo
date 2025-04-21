"""Merge multiple heads

Revision ID: merge_multiple_heads
Revises: a1b2c3d4e5f6
Create Date: 2025-04-03T17:51:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'merge_multiple_heads'
down_revision = 'a1b2c3d4e5f6'  # This is our RBAC tables migration
branch_labels = None
depends_on = None


def upgrade():
    # This is a merge migration - no schema changes needed
    pass


def downgrade():
    # This is a merge migration - no downgrade needed
    pass
