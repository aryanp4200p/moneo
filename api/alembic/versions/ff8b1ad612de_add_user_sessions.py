"""add user sessions

Revision ID: ff8b1ad612de
Revises: c05d9009e8f6
Create Date: 2026-09-20 00:57:27.295966

"""

from alembic import op
import sqlalchemy as sa


revision = "ADD_SESSION_TABLE"
down_revision = "c05d9009e8f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_sessions",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
        ),

        sa.Column(
            "session_id",
            sa.String(length=64),
            nullable=False,
        ),

        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "device_name",
            sa.String(length=255),
            nullable=True,
        ),

        sa.Column(
            "ip_address",
            sa.String(length=100),
            nullable=True,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),

        sa.Column(
            "last_active_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),

        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),

        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),

        sa.UniqueConstraint(
            "session_id"
        ),
    )

    op.create_index(
        "ix_user_sessions_id",
        "user_sessions",
        ["id"],
    )

    op.create_index(
        "ix_user_sessions_session_id",
        "user_sessions",
        ["session_id"],
    )

    op.create_index(
        "ix_user_sessions_user_id",
        "user_sessions",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_user_sessions_user_id",
        table_name="user_sessions",
    )

    op.drop_index(
        "ix_user_sessions_session_id",
        table_name="user_sessions",
    )

    op.drop_index(
        "ix_user_sessions_id",
        table_name="user_sessions",
    )

    op.drop_table("user_sessions")