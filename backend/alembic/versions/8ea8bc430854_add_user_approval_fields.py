"""add_user_approval_fields

Revision ID: 8ea8bc430854
Revises: 
Create Date: 2024-xx-xx xx:xx:xx.xxxxxx

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '8ea8bc430854'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Check if enum exists before creating
    op.execute("""
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userstatus') THEN
                CREATE TYPE userstatus AS ENUM ('pending', 'approved', 'rejected', 'suspended');
            END IF;
        END $$;
    """)
    
    # Add columns with IF NOT EXISTS checks
    op.execute("""
        ALTER TABLE users ADD COLUMN IF NOT EXISTS status userstatus DEFAULT 'approved' NOT NULL
    """)
    op.execute("""
        ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by_id INTEGER
    """)
    op.execute("""
        ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP
    """)
    op.execute("""
        ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR
    """)
    
    # Add foreign key (with IF NOT EXISTS check)
    op.execute("""
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_approved_by_id'
            ) THEN
                ALTER TABLE users ADD CONSTRAINT fk_users_approved_by_id 
                    FOREIGN KEY (approved_by_id) REFERENCES users(id);
            END IF;
        END $$;
    """)
    
    # Make phone unique
    op.execute("""
        ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS uq_users_phone UNIQUE (phone)
    """)
    
    # Create notifications table (with IF NOT EXISTS)
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message VARCHAR(1000) NOT NULL,
            data JSONB,
            is_read BOOLEAN DEFAULT FALSE NOT NULL,
            read_at TIMESTAMP,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        )
    """)
    
    # Create indexes (with IF NOT EXISTS)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id 
        ON user_notifications(user_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read 
        ON user_notifications(is_read)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at 
        ON user_notifications(created_at DESC)
    """)

def downgrade() -> None:
    # Drop indexes
    op.execute("DROP INDEX IF EXISTS idx_user_notifications_created_at")
    op.execute("DROP INDEX IF EXISTS idx_user_notifications_is_read")
    op.execute("DROP INDEX IF EXISTS idx_user_notifications_user_id")
    
    # Drop table
    op.execute("DROP TABLE IF EXISTS user_notifications")
    
    # Drop unique constraint
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_phone")
    
    # Drop foreign key
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_approved_by_id")
    
    # Drop columns
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS rejection_reason")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS approved_at")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS approved_by_id")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS status")
    
    # Drop enum type
    op.execute("DROP TYPE IF EXISTS userstatus")