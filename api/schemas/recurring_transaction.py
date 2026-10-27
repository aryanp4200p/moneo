from datetime import date, datetime
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict, Field


RecurringFrequency = Literal[
    "daily",
    "weekly",
    "monthly",
    "yearly",
]

RecurringType = Literal[
    "income",
    "expense",
]


class RecurringTransactionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)

    amount: float = Field(gt=0)

    type: RecurringType

    category: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    merchant: Optional[str] = Field(
        default=None,
        max_length=120,
    )

    note: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    frequency: RecurringFrequency

    start_date: date

    next_due_date: date

    end_date: Optional[date] = None


class RecurringTransactionUpdate(BaseModel):
    title: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=120,
    )

    amount: Optional[float] = Field(
        default=None,
        gt=0,
    )

    type: Optional[RecurringType] = None

    category: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    merchant: Optional[str] = Field(
        default=None,
        max_length=120,
    )

    note: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    frequency: Optional[RecurringFrequency] = None

    start_date: Optional[date] = None

    next_due_date: Optional[date] = None

    end_date: Optional[date] = None


class RecurringTransactionOut(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    user_id: int
    title: str
    amount: float
    type: RecurringType
    category: Optional[str]
    merchant: Optional[str]
    note: Optional[str]
    frequency: RecurringFrequency
    start_date: date
    next_due_date: date
    end_date: Optional[date]
    is_active: bool
    created_at: datetime