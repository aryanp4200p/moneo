from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Boolean,
    func,
)
from sqlalchemy.orm import relationship

from core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String(120),
        nullable=False,
    )

    email = Column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    

    hashed_password = Column(
        String(255),
        nullable=False,
    )

    profile_image_url = Column(
        String(500),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
        # ==========================================================
    # Email Verification
    # ==========================================================

    email_verified = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    email_otp_hash = Column(
        String(64),
        nullable=True,
    )

    email_otp_expires_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    email_otp_attempts = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    email_otp_last_sent_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ==========================================================
    # Login Security
    # ==========================================================

    failed_login_attempts = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    locked_until = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ==========================================================
    # Password Reset
    # ==========================================================

    password_reset_token_hash = Column(
        String(128),
        nullable=True,
        index=True,
    )

    password_reset_expires_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ==========================================================
    # User Relationships
    # ==========================================================

    transactions = relationship(
        "Transaction",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    budgets = relationship(
        "Budget",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    financial_health_logs = relationship(
        "FinancialHealthLog",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    sessions = relationship(
        "UserSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    recurring_transactions = relationship(
    "RecurringTransaction",
    back_populates="user",
    cascade="all, delete-orphan",
)
    wealth_items = relationship(
    "WealthItem",
    back_populates="user",
    cascade="all, delete-orphan",
)