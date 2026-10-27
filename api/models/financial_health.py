from sqlalchemy import (
    Column,
    Integer,
    Float,
    ForeignKey,
    DateTime,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from core.database import Base


class FinancialHealthLog(Base):
    """One row per user per month — stores the computed score so the
    dashboard can show a trend over time instead of only 'this month'."""

    __tablename__ = "financial_health_logs"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "year",
            "month",
            name="uq_user_year_month",
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    year = Column(
        Integer,
        nullable=False,
    )

    month = Column(
        Integer,
        nullable=False,
    )

    score = Column(
        Integer,
        nullable=False,
    )

    savings_rate_score = Column(
        Integer,
        nullable=False,
    )

    budget_adherence_score = Column(
        Integer,
        nullable=False,
    )

    consistency_score = Column(
        Integer,
        nullable=False,
    )

    savings_rate_pct = Column(
        Float,
        nullable=True,
    )

    computed_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship(
        "User",
        back_populates="financial_health_logs",
    )