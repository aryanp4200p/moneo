"""add profile image to users

Revision ID: c05d9009e8f6
Revises:
Create Date: 2026-09-19 22:15:31.005772

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c05d9009e8f6"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "profile_image_url",
            sa.String(length=500),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column(
        "users",
        "profile_image_url",
    )