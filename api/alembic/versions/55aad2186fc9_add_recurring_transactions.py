"""add recurring transactions

Revision ID: 55aad2186fc9
Revises: 5a0e5cbf41fd
Create Date: 2026-09-21 01:02:20.159644

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "55aad2186fc9"
down_revision = "5a0e5cbf41fd"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "recurring_transactions",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
        ),

        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey(
                "users.id",
                ondelete="CASCADE",
            ),
            nullable=False,
        ),

        sa.Column(
            "title",
            sa.String(length=120),
            nullable=False,
        ),

        sa.Column(
            "amount",
            sa.Float(),
            nullable=False,
        ),

        sa.Column(
            "type",
            sa.String(length=10),
            nullable=False,
        ),

        sa.Column(
            "category",
            sa.String(length=50),
            nullable=True,
        ),

        sa.Column(
            "merchant",
            sa.String(length=120),
            nullable=True,
        ),

        sa.Column(
            "note",
            sa.String(length=255),
            nullable=True,
        ),

        sa.Column(
            "frequency",
            sa.String(length=10),
            nullable=False,
        ),

        sa.Column(
            "start_date",
            sa.Date(),
            nullable=False,
        ),

        sa.Column(
            "next_due_date",
            sa.Date(),
            nullable=False,
        ),

        sa.Column(
            "end_date",
            sa.Date(),
            nullable=True,
        ),

        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_index(
        "ix_recurring_transactions_user_id",
        "recurring_transactions",
        ["user_id"],
    )

    op.create_index(
        "ix_recurring_transactions_next_due_date",
        "recurring_transactions",
        ["next_due_date"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_recurring_transactions_next_due_date",
        table_name="recurring_transactions",
    )

    op.drop_index(
        "ix_recurring_transactions_user_id",
        table_name="recurring_transactions",
    )

    op.drop_table(
        "recurring_transactions",
    )