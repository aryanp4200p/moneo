"""add login security and password reset

Revision ID: 5a0e5cbf41fd
Revises: ADD_SESSION_TABLE
Create Date: 2026-09-20 02:01:21.015630

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "5a0e5cbf41fd"
down_revision = "ADD_SESSION_TABLE"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Login security
    op.add_column(
        "users",
        sa.Column(
            "failed_login_attempts",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "locked_until",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    # Password reset
    op.add_column(
        "users",
        sa.Column(
            "password_reset_token_hash",
            sa.String(length=128),
            nullable=True,
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "password_reset_expires_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    # Index for fast reset-token lookup
    op.create_index(
        "ix_users_password_reset_token_hash",
        "users",
        ["password_reset_token_hash"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_users_password_reset_token_hash",
        table_name="users",
    )

    op.drop_column(
        "users",
        "password_reset_expires_at",
    )

    op.drop_column(
        "users",
        "password_reset_token_hash",
    )

    op.drop_column(
        "users",
        "locked_until",
    )

    op.drop_column(
        "users",
        "failed_login_attempts",
    )