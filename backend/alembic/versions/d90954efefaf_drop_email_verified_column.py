# alembic/versions/xxxx_drop_email_verified_column.py
"""drop_email_verified_column

Revision ID: xxxx
Revises: 8ea8bc430854
Create Date: 2024-xx-xx xx:xx:xx.xxxxxx

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'xxxx'
down_revision = '8ea8bc430854'  # Your previous migration
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Drop the email_verified column
    op.drop_column('users', 'email_verified')


def downgrade() -> None:
    # Add it back if needed (optional)
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), server_default='true', nullable=False))