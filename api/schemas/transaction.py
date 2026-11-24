from datetime import date, datetime
from typing import Optional, Literal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, field_validator


# =========================================================
# TIMEZONE CONFIGURATION
# =========================================================

IST = ZoneInfo("Asia/Kolkata")


def get_today() -> date:
    """
    Returns today's date according to Indian Standard Time.
    Prevents UTC server timezone differences from causing
    valid Indian transaction dates to be rejected.
    """
    return datetime.now(IST).date()


# =========================================================
# TYPES
# =========================================================

TransactionType = Literal[
    "income",
    "expense",
]

TransactionSource = Literal[
    "manual",
    "sms",
    "ocr",
    "csv",
    "recurring",
]

TransactionStatus = Literal[
    "pending_category",
    "categorized",
]


# =========================================================
# CREATE TRANSACTION
# =========================================================

class TransactionCreate(BaseModel):

    amount: float = Field(
        gt=0
    )

    type: TransactionType
    date: date
    note: Optional[str] = None
    merchant: Optional[str] = None

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: date) -> date:
        if value > get_today():
            raise ValueError(
                "Transaction date cannot be in the future."
            )

        return value


# =========================================================
# UPDATE TRANSACTION
# =========================================================

class TransactionUpdate(BaseModel):

    amount: Optional[float] = Field(
        default=None,
        gt=0,
    )

    type: Optional[TransactionType] = None
    date: Optional[date] = None
    note: Optional[str] = None
    merchant: Optional[str] = None
    category: Optional[str] = None

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: Optional[date]) -> Optional[date]:
        if value is not None and value > get_today():
            raise ValueError(
                "Transaction date cannot be in the future."
            )

        return value


# =========================================================
# CATEGORIZE TRANSACTION
# =========================================================

class TransactionCategorize(BaseModel):

    category: str = Field(
        min_length=1,
        max_length=50,
    )


# =========================================================
# NORMAL TRANSACTION RESPONSE
# =========================================================

class TransactionOut(BaseModel):

    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    user_id: int
    amount: float
    type: TransactionType
    category: Optional[str]
    status: TransactionStatus
    merchant: Optional[str]
    date: date
    note: Optional[str]
    source: TransactionSource
    created_at: datetime


# =========================================================
# CSV IMPORT ERROR
# =========================================================

class CSVImportError(BaseModel):
    row_number: int
    reason: str


# =========================================================
# EXISTING CSV IMPORT RESULT
# =========================================================

class CSVImportResult(BaseModel):
    imported_count: int
    error_count: int
    imported: list[TransactionOut]
    errors: list[CSVImportError]


# =========================================================
# CSV / PASSBOOK PREVIEW TRANSACTION
# =========================================================

class CSVPreviewTransaction(BaseModel):
    amount: float
    type: TransactionType
    merchant: Optional[str] = None
    date: date
    note: Optional[str] = None
    category: Optional[str] = None

    # Optional passbook columns (for CSV & passbook image previews)
    particulars: Optional[str] = None
    cheque_no: Optional[str] = None
    debit: Optional[float] = None
    credit: Optional[float] = None
    balance: Optional[float] = None
    source: Optional[TransactionSource] = None

    @field_validator("type", mode="before")
    @classmethod
    def normalize_type(cls, value: str) -> str:
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered == "credit":
                return "income"
            if lowered == "debit":
                return "expense"
        return value

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: date) -> date:
        if value > get_today():
            raise ValueError(
                "Transaction date cannot be in the future."
            )

        return value


# =========================================================
# CSV DUPLICATE
# =========================================================

class CSVPreviewDuplicate(BaseModel):
    row_number: int
    reason: str
    existing_transaction_id: int


# =========================================================
# CSV PREVIEW RESULT
# =========================================================

class CSVPreviewResult(BaseModel):
    parsed_count: int
    new_count: int
    duplicate_count: int
    error_count: int
    preview: list[CSVPreviewTransaction]
    duplicates: list[CSVPreviewDuplicate]
    errors: list[CSVImportError]


# =========================================================
# CSV IMPORT REQUEST
# =========================================================

class CSVImportRequest(BaseModel):
    transactions: list[CSVPreviewTransaction]