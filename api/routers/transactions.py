from datetime import date
import math
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.transaction import Transaction
from models.user import User
from schemas.transaction import (
    CSVImportRequest,
    CSVImportResult,
    CSVPreviewResult,
    CSVPreviewTransaction,
    PaginatedTransactions,
    TransactionCategorize,
    TransactionCreate,
    TransactionOut,
    TransactionUpdate,
)
from services.auto_categorizer import auto_categorize
from services.statement_parser import parse_csv, parse_image

router = APIRouter(
    prefix="/transactions",
    tags=["transactions"],
)

ALLOWED_IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")


def _build_transaction_query(
    db: Session,
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category: Optional[str] = None,
    type: Optional[str] = None,
):
    query = db.query(Transaction).filter(Transaction.user_id == user_id)

    if start_date:
        query = query.filter(Transaction.date >= start_date)

    if end_date:
        query = query.filter(Transaction.date <= end_date)

    if category:
        query = query.filter(Transaction.category == category)

    if type:
        query = query.filter(Transaction.type == type)

    return query


# =========================================================
# CREATE MANUAL TRANSACTION
# =========================================================

@router.post(
    "",
    response_model=TransactionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a manual transaction starting as pending_category."""

    txn = Transaction(
        user_id=current_user.id,
        amount=payload.amount,
        type=payload.type,
        date=payload.date,
        note=payload.note,
        merchant=payload.merchant,
        status="pending_category",
        source="manual",
    )

    db.add(txn)
    db.commit()
    db.refresh(txn)

    return txn


# =========================================================
# LIST TRANSACTIONS (PAGINATED WITH METADATA)
# =========================================================

@router.get(
    "/paginated",
    response_model=PaginatedTransactions,
)
def list_transactions_paginated(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(25, ge=1, le=200, description="Items per page"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category: Optional[str] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return paginated transactions with total count and page metadata."""

    query = _build_transaction_query(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        category=category,
        type=type,
    )

    total = query.count()
    pages = max(1, math.ceil(total / limit)) if total > 0 else 1
    offset = (page - 1) * limit

    items = (
        query.order_by(Transaction.date.desc(), Transaction.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return PaginatedTransactions(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


# =========================================================
# LIST TRANSACTIONS (BACKWARD-COMPATIBLE + LIMIT/OFFSET)
# =========================================================

@router.get(
    "",
    response_model=list[TransactionOut],
)
def list_transactions(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category: Optional[str] = None,
    type: Optional[str] = None,
    limit: int = Query(500, ge=1, le=2000, description="Max rows returned"),
    offset: int = Query(0, ge=0, description="Rows to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the current user's transactions with optional filters and limit/offset."""

    query = _build_transaction_query(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        category=category,
        type=type,
    )

    return (
        query.order_by(Transaction.date.desc(), Transaction.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


# =========================================================
# LIST PENDING TRANSACTIONS
# =========================================================

@router.get(
    "/pending",
    response_model=list[TransactionOut],
)
def list_pending_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return transactions that still need a category."""

    return (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.status == "pending_category",
        )
        .order_by(Transaction.date.desc())
        .all()
    )


# =========================================================
# PREVIEW STATEMENT (CSV OR PASSBOOK IMAGE)
# =========================================================

@router.post(
    "/preview-csv",
    response_model=CSVPreviewResult,
)
async def preview_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Preview a bank statement (.csv) or passbook image (.jpg, .png, .webp).
    Nothing is saved to the database until /import-csv is called.
    """

    filename = (file.filename or "").lower()
    is_csv = filename.endswith(".csv")
    is_image = filename.endswith(ALLOWED_IMAGE_EXTENSIONS)

    if not is_csv and not is_image:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file. Upload a .csv statement or passbook image (.jpg, .png, .webp).",
        )

    raw_bytes = await file.read()

    if not raw_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    if is_csv:
        parsed_rows, errors = parse_csv(raw_bytes)
    else:
        parsed_rows, errors = await parse_image(raw_bytes, mime_type=file.content_type)

    preview_transactions = []
    duplicates = []

    for index, row in enumerate(parsed_rows, start=2):
        particulars = getattr(row, "particulars", None) or row.merchant or row.note
        cheque_no = getattr(row, "cheque_no", None)
        debit = getattr(row, "debit", None) or (row.amount if row.type == "expense" else 0.0)
        credit = getattr(row, "credit", None) or (row.amount if row.type == "income" else 0.0)
        balance = getattr(row, "balance", None)

        query = db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.date == row.date,
            Transaction.amount == row.amount,
            Transaction.type == row.type,
        )

        if row.merchant:
            query = query.filter(Transaction.merchant == row.merchant)
        elif particulars:
            query = query.filter(Transaction.note == particulars)

        existing = query.first()

        if existing:
            duplicates.append(
                {
                    "row_number": index,
                    "reason": "A transaction with the same date, amount, type and description already exists.",
                    "existing_transaction_id": existing.id,
                }
            )
            continue

        category = auto_categorize(
            merchant=row.merchant,
            note=row.note,
            transaction_type=row.type,
            particulars=particulars,
        )

        preview_transactions.append(
            CSVPreviewTransaction(
                amount=row.amount,
                type=row.type,
                date=row.date,
                note=row.note or particulars,
                merchant=row.merchant or particulars,
                particulars=particulars,
                cheque_no=cheque_no,
                debit=debit,
                credit=credit,
                balance=balance,
                category=category,
            )
        )

    return CSVPreviewResult(
        parsed_count=len(parsed_rows),
        new_count=len(preview_transactions),
        duplicate_count=len(duplicates),
        error_count=len(errors),
        preview=preview_transactions,
        duplicates=duplicates,
        errors=errors,
    )


# =========================================================
# IMPORT REVIEWED TRANSACTIONS (CSV OR IMAGE)
# =========================================================

@router.post(
    "/import-csv",
    response_model=CSVImportResult,
    status_code=status.HTTP_201_CREATED,
)
def import_csv(
    payload: CSVImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Import transactions selected by the user from CSV or passbook image preview.
    """

    created: list[Transaction] = []
    errors: list[dict] = []

    if not payload.transactions:
        raise HTTPException(
            status_code=400,
            detail="No transactions selected for import",
        )

    for index, row in enumerate(payload.transactions, start=1):
        particulars = getattr(row, "particulars", None) or row.merchant or row.note
        cheque_no = getattr(row, "cheque_no", None)

        final_note = row.note or particulars
        if cheque_no and cheque_no != "-" and final_note and cheque_no not in final_note:
            final_note = f"{final_note} (Chq/Ref: {cheque_no})"

        query = db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.date == row.date,
            Transaction.amount == row.amount,
            Transaction.type == row.type,
        )

        if row.merchant:
            query = query.filter(Transaction.merchant == row.merchant)
        elif final_note:
            query = query.filter(Transaction.note == final_note)

        existing = query.first()

        if existing:
            errors.append(
                {
                    "row_number": index,
                    "reason": (
                        "Duplicate transaction skipped. "
                        f"Existing transaction ID: {existing.id}"
                    ),
                }
            )
            continue

        category = auto_categorize(
            merchant=row.merchant,
            note=final_note,
            transaction_type=row.type,
            particulars=particulars,
        )

        status_value = "categorized" if category else "pending_category"

        txn = Transaction(
            user_id=current_user.id,
            amount=row.amount,
            type=row.type,
            date=row.date,
            note=final_note,
            merchant=row.merchant or particulars,
            category=category,
            status=status_value,
            source=getattr(row, "source", None) or "csv",
        )

        db.add(txn)
        created.append(txn)

    db.commit()

    for txn in created:
        db.refresh(txn)

    return CSVImportResult(
        imported_count=len(created),
        error_count=len(errors),
        imported=created,
        errors=errors,
    )


# =========================================================
# DIRECT CSV IMPORT
# =========================================================

@router.post(
    "/upload-csv",
    response_model=CSVImportResult,
    status_code=status.HTTP_201_CREATED,
)
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Direct CSV import.
    Kept for compatibility with the existing API.
    """

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="File must be a .csv",
        )

    raw_bytes = await file.read()

    if not raw_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded CSV file is empty",
        )

    parsed_rows, errors = parse_csv(raw_bytes)
    created: list[Transaction] = []

    for row in parsed_rows:
        particulars = getattr(row, "particulars", None) or row.merchant or row.note

        category = auto_categorize(
            merchant=row.merchant,
            note=row.note,
            transaction_type=row.type,
            particulars=particulars,
        )

        status_value = "categorized" if category else "pending_category"

        txn = Transaction(
            user_id=current_user.id,
            amount=row.amount,
            type=row.type,
            date=row.date,
            note=row.note or particulars,
            merchant=row.merchant or particulars,
            category=category,
            status=status_value,
            source="csv",
        )

        db.add(txn)
        created.append(txn)

    db.commit()

    for txn in created:
        db.refresh(txn)

    return CSVImportResult(
        imported_count=len(created),
        error_count=len(errors),
        imported=created,
        errors=errors,
    )


# =========================================================
# CATEGORIZE TRANSACTION
# =========================================================

@router.patch(
    "/{transaction_id}/categorize",
    response_model=TransactionOut,
)
def categorize_transaction(
    transaction_id: int,
    payload: TransactionCategorize,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually assign a category to a transaction."""

    txn = _get_owned_transaction(db, transaction_id, current_user.id)

    txn.category = payload.category
    txn.status = "categorized"

    db.commit()
    db.refresh(txn)

    return txn


# =========================================================
# UPDATE TRANSACTION
# =========================================================

@router.put(
    "/{transaction_id}",
    response_model=TransactionOut,
)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing transaction."""

    txn = _get_owned_transaction(db, transaction_id, current_user.id)

    update_data = payload.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(txn, field, value)

    if update_data.get("category"):
        txn.status = "categorized"

    db.commit()
    db.refresh(txn)

    return txn


# =========================================================
# DELETE TRANSACTION
# =========================================================

@router.delete(
    "/{transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a transaction belonging to the current user."""

    txn = _get_owned_transaction(db, transaction_id, current_user.id)

    db.delete(txn)
    db.commit()

    return None


# =========================================================
# HELPER
# =========================================================

def _get_owned_transaction(
    db: Session,
    transaction_id: int,
    user_id: int,
) -> Transaction:
    """Get a transaction only if it belongs to the current user."""

    txn = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == user_id,
        )
        .first()
    )

    if not txn:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found",
        )

    return txn