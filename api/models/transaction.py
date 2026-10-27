from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from core.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    amount = Column(Float, nullable=False)
    type = Column(String(10), nullable=False)  # "income" | "expense"

    category = Column(String(50), nullable=True)  # NULL until categorized
    status = Column(String(20), nullable=False, default="pending_category")  # pending_category | categorized

    merchant = Column(String(120), nullable=True)
    date = Column(Date, nullable=False)
    note = Column(String(255), nullable=True)

    # tracks where the transaction came from; only "manual" is actually used in the MVP,
    # but the field exists so sms/ocr/csv sources can plug into the same table later
    source = Column(String(10), nullable=False, default="manual")  # manual | sms | ocr | csv

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="transactions")
