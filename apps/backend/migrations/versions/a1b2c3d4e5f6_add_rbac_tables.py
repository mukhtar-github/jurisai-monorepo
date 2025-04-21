"""Add RBAC tables for role-based access control

Revision ID: a1b2c3d4e5f6
Revises: 
Create Date: 2025-04-03 10:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create permissions table
    op.create_table(
        'permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('resource', sa.String(length=100), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Create roles table
    op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('is_default', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Create role_permission association table for many-to-many relationship
    op.create_table(
        'role_permission',
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('permission_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('role_id', 'permission_id')
    )
    
    # Create user_role association table for many-to-many relationship
    op.create_table(
        'user_role',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'role_id')
    )
    
    # Insert default roles and permissions
    op.execute(
        """
        INSERT INTO roles (name, description, is_default) VALUES 
        ('admin', 'Administrator with full access', 0),
        ('legal_professional', 'Legal professional with document management access', 1),
        ('researcher', 'Researcher with read access to documents', 1),
        ('guest', 'Guest with limited read-only access', 0)
        """
    )
    
    # Insert default permissions
    op.execute(
        """
        INSERT INTO permissions (name, resource, action, description) VALUES 
        ('document_create', 'document', 'create', 'Create new documents'),
        ('document_read', 'document', 'read', 'Read documents'),
        ('document_update', 'document', 'update', 'Update documents'),
        ('document_delete', 'document', 'delete', 'Delete documents'),
        ('search_read', 'search', 'read', 'Search documents'),
        ('summarization_read', 'summarization', 'read', 'Read document summaries'),
        ('summarization_create', 'summarization', 'create', 'Create document summaries'),
        ('user_create', 'user', 'create', 'Create users'),
        ('user_read', 'user', 'read', 'Read user information'),
        ('user_update', 'user', 'update', 'Update user information'),
        ('user_delete', 'user', 'delete', 'Delete users'),
        ('role_create', 'role', 'create', 'Create roles'),
        ('role_read', 'role', 'read', 'Read role information'),
        ('role_update', 'role', 'update', 'Update roles'),
        ('role_delete', 'role', 'delete', 'Delete roles'),
        ('permission_create', 'permission', 'create', 'Create permissions'),
        ('permission_read', 'permission', 'read', 'Read permission information'),
        ('permission_update', 'permission', 'update', 'Update permissions'),
        ('permission_delete', 'permission', 'delete', 'Delete permissions')
        """
    )
    
    # Assign permissions to default roles
    # Admin gets all permissions
    admin_role_id = op.execute("SELECT id FROM roles WHERE name = 'admin'").fetchone()[0]
    permission_ids = op.execute("SELECT id FROM permissions").fetchall()
    for permission_id in permission_ids:
        op.execute(
            f"INSERT INTO role_permission (role_id, permission_id) VALUES ({admin_role_id}, {permission_id[0]})"
        )
    
    # Legal professional gets document and search permissions
    legal_role_id = op.execute("SELECT id FROM roles WHERE name = 'legal_professional'").fetchone()[0]
    legal_permissions = [
        'document_create', 'document_read', 'document_update', 
        'search_read', 'summarization_read', 'summarization_create'
    ]
    for perm in legal_permissions:
        perm_id = op.execute(f"SELECT id FROM permissions WHERE name = '{perm}'").fetchone()[0]
        op.execute(
            f"INSERT INTO role_permission (role_id, permission_id) VALUES ({legal_role_id}, {perm_id})"
        )
    
    # Researcher gets read-only permissions
    researcher_role_id = op.execute("SELECT id FROM roles WHERE name = 'researcher'").fetchone()[0]
    researcher_permissions = ['document_read', 'search_read', 'summarization_read']
    for perm in researcher_permissions:
        perm_id = op.execute(f"SELECT id FROM permissions WHERE name = '{perm}'").fetchone()[0]
        op.execute(
            f"INSERT INTO role_permission (role_id, permission_id) VALUES ({researcher_role_id}, {perm_id})"
        )
    
    # Guest gets minimal read permissions
    guest_role_id = op.execute("SELECT id FROM roles WHERE name = 'guest'").fetchone()[0]
    guest_permissions = ['document_read', 'search_read']
    for perm in guest_permissions:
        perm_id = op.execute(f"SELECT id FROM permissions WHERE name = '{perm}'").fetchone()[0]
        op.execute(
            f"INSERT INTO role_permission (role_id, permission_id) VALUES ({guest_role_id}, {perm_id})"
        )


def downgrade():
    # Drop the tables in reverse order to avoid foreign key constraints
    op.drop_table('user_role')
    op.drop_table('role_permission')
    op.drop_table('roles')
    op.drop_table('permissions')
