"""Add RBAC tables for roles and permissions

Revision ID: 20250402_add_rbac
Revises: 
Create Date: 2025-04-02 11:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250402_add_rbac'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
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
        sa.Column('is_default', sa.Integer(), nullable=True, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Create role_permission association table
    op.create_table(
        'role_permission',
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('permission_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.PrimaryKeyConstraint('role_id', 'permission_id')
    )
    
    # Create user_role association table
    op.create_table(
        'user_role',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('user_id', 'role_id')
    )
    
    # Insert default roles and permissions
    op.execute(
        """
        INSERT INTO roles (name, description, is_default, created_at, updated_at) 
        VALUES 
        ('admin', 'Administrator with full access', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('legal_professional', 'Legal professional with document management access', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('researcher', 'Researcher with read-only access', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('read_only', 'Read-only user', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        """
    )
    
    # Insert core permissions
    permissions = [
        # Document permissions
        ('document_read', 'View documents', 'document', 'read'),
        ('document_create', 'Create documents', 'document', 'create'),
        ('document_update', 'Edit documents', 'document', 'update'),
        ('document_delete', 'Delete documents', 'document', 'delete'),
        
        # Search permissions
        ('search_read', 'Perform searches', 'search', 'read'),
        
        # Summarization permissions
        ('summarization_read', 'View summaries', 'summarization', 'read'),
        ('summarization_create', 'Create summaries', 'summarization', 'create'),
        
        # User permissions
        ('user_read', 'View users', 'user', 'read'),
        ('user_create', 'Create users', 'user', 'create'),
        ('user_update', 'Edit users', 'user', 'update'),
        ('user_delete', 'Delete users', 'user', 'delete'),
        
        # Role permissions
        ('role_read', 'View roles', 'role', 'read'),
        ('role_create', 'Create roles', 'role', 'create'),
        ('role_update', 'Edit roles', 'role', 'update'),
        ('role_delete', 'Delete roles', 'role', 'delete'),
        
        # Permission permissions
        ('permission_read', 'View permissions', 'permission', 'read'),
        ('permission_create', 'Create permissions', 'permission', 'create'),
        ('permission_update', 'Edit permissions', 'permission', 'update'),
        ('permission_delete', 'Delete permissions', 'permission', 'delete')
    ]
    
    for name, description, resource, action in permissions:
        op.execute(
            f"""
            INSERT INTO permissions (name, description, resource, action)
            VALUES ('{name}', '{description}', '{resource}', '{action}');
            """
        )
    
    # Assign all permissions to admin role
    op.execute(
        """
        INSERT INTO role_permission (role_id, permission_id)
        SELECT 1, id FROM permissions;
        """
    )
    
    # Assign document and search permissions to legal_professional role
    op.execute(
        """
        INSERT INTO role_permission (role_id, permission_id)
        SELECT 2, id FROM permissions 
        WHERE resource IN ('document', 'search', 'summarization');
        """
    )
    
    # Assign read permissions to researcher role
    op.execute(
        """
        INSERT INTO role_permission (role_id, permission_id)
        SELECT 3, id FROM permissions 
        WHERE action = 'read';
        """
    )
    
    # Assign document read and search read to read_only role
    op.execute(
        """
        INSERT INTO role_permission (role_id, permission_id)
        SELECT 4, id FROM permissions 
        WHERE name IN ('document_read', 'search_read');
        """
    )


def downgrade() -> None:
    # Drop association tables first to avoid foreign key constraint errors
    op.drop_table('user_role')
    op.drop_table('role_permission')
    
    # Then drop the main tables
    op.drop_table('roles')
    op.drop_table('permissions')
