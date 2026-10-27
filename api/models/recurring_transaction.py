from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    DateTime,
    Boolean,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship

from core.database import Base


class RecurringTransaction(Base):
    __tablename__ = "recurring_transactions"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(String(120), nullable=False)

    amount = Column(Float, nullable=False)

    type = Column(String(10), nullable=False)
    # income | expense

    category = Column(String(50), nullable=True)

    merchant = Column(String(120), nullable=True)

    note = Column(String(255), nullable=True)

    frequency = Column(String(10), nullable=False)
    # daily | weekly | monthly | yearly

    start_date = Column(Date, nullable=False)

    next_due_date = Column(
        Date,
        nullable=False,
        index=True,
    )

    end_date = Column(Date, nullable=True)

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user = relationship(
        "User",
        back_populates="recurring_transactions",
    )