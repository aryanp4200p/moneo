import calendar
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core.database import get_db
from models.recurring_transaction import RecurringTransaction
from models.transaction import Transaction
from schemas.recurring_transaction import (
    RecurringTransactionCreate,
    RecurringTransactionOut,
    RecurringTransactionUpdate,
)
from schemas.transaction import TransactionOut
from services.auto_categorizer import auto_categorize
from routers.auth import get_current_user


router = APIRouter(
    prefix="/recurring-transactions",
    tags=["Recurring Transactions"],
)


# ---------------------------------------------------------
# Helper functions
# ---------------------------------------------------------

def add_month(date_value: date) -> date:
    """
    Add one calendar month while handling month-end dates.

    Example:
    Jan 31 -> Feb 28
    Mar 31 -> Apr 30
    """

    month_index = date_value.month - 1

    new_year = date_value.year + (
        month_index + 1
    ) // 12

    new_month = (
        month_index + 1
    ) % 12 + 1

    last_day = calendar.monthrange(
        new_year,
        new_month,
    )[1]

    new_day = min(
        date_value.day,
        last_day,
    )

    return date(
        new_year,
        new_month,
        new_day,
    )


def add_year(date_value: date) -> date:
    """
    Add one year while handling February 29.
    """

    try:
        return date_value.replace(
            year=date_value.year + 1
        )
    except ValueError:
        # Feb 29 -> Feb 28
        return date(
            date_value.year + 1,
            2,
            28,
        )


def advance_date(
    current_date: date,
    frequency: str,
) -> date:

    if frequency == "daily":
        return current_date + timedelta(days=1)

    if frequency == "weekly":
        return current_date + timedelta(days=7)

    if frequency == "monthly":
        return add_month(current_date)

    if frequency == "yearly":
        return add_year(current_date)

    raise ValueError(
        f"Unsupported frequency: {frequency}"
    )


def validate_dates(
    start_date: date,
    next_due_date: date,
    end_date: Optional[date],
):
    if next_due_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Next due date cannot be before start date.",
        )

    if (
        end_date is not None
        and end_date < next_due_date
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="End date cannot be before next due date.",
        )


def get_owned_recurring(
    recurring_id: int,
    user_id: int,
    db: Session,
) -> RecurringTransaction:

    recurring = (
        db.query(RecurringTransaction)
        .filter(
            RecurringTransaction.id == recurring_id,
            RecurringTransaction.user_id == user_id,
        )
        .first()
    )

    if not recurring:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring transaction not found.",
        )

    return recurring


# ---------------------------------------------------------
# Create recurring transaction
# ---------------------------------------------------------

@router.post(
    "",
    response_model=RecurringTransactionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_recurring_transaction(
    payload: RecurringTransactionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    validate_dates(
        payload.start_date,
        payload.next_due_date,
        payload.end_date,
    )

    recurring = RecurringTransaction(
        user_id=current_user.id,
        title=payload.title.strip(),
        amount=payload.amount,
        type=payload.type,
        category=(
            payload.category.strip()
            if payload.category
            else None
        ),
        merchant=(
            payload.merchant.strip()
            if payload.merchant
            else None
        ),
        note=(
            payload.note.strip()
            if payload.note
            else None
        ),
        frequency=payload.frequency,
        start_date=payload.start_date,
        next_due_date=advance_date(
            payload.start_date,
            payload.frequency,
        ), 
        end_date=payload.end_date,
        is_active=True,
    )

    db.add(recurring)
    db.commit()
    db.refresh(recurring)

    return recurring


# ---------------------------------------------------------
# Get recurring transactions
# ---------------------------------------------------------

@router.get(
    "",
    response_model=list[RecurringTransactionOut],
)
def get_recurring_transactions(
    include_inactive: bool = Query(
        False
    ),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    query = (
        db.query(RecurringTransaction)
        .filter(
            RecurringTransaction.user_id
            == current_user.id
        )
    )

    if not include_inactive:
        query = query.filter(
            RecurringTransaction.is_active == True
        )

    return (
        query
        .order_by(
            RecurringTransaction.next_due_date.asc()
        )
        .all()
    )


# ---------------------------------------------------------
# Process due recurring transactions
# ---------------------------------------------------------

@router.post(
    "/process-due",
    response_model=list[TransactionOut],
)
def process_due_recurring_transactions(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    today = date.today()

    recurring_items = (
        db.query(RecurringTransaction)
        .filter(
            RecurringTransaction.user_id
            == current_user.id,
            RecurringTransaction.is_active == True,
            RecurringTransaction.next_due_date <= today,
        )
        .with_for_update()
        .all()
    )

    created_transactions = []

    for recurring in recurring_items:

        occurrence_count = 0

        while (
            recurring.next_due_date <= today
            and recurring.is_active
        ):

            occurrence_count += 1

            # Safety protection against an invalid
            # frequency/date configuration.
            if occurrence_count > 120:
                break

            due_date = recurring.next_due_date

            # If the recurring transaction has ended,
            # deactivate it without generating another one.
            if (
                recurring.end_date is not None
                and due_date > recurring.end_date
            ):
                recurring.is_active = False
                break

            category = recurring.category

            # Use existing auto-categorizer if no
            # category was manually assigned.
            if not category:
                category = auto_categorize(
                    merchant=(
                        recurring.merchant
                        or recurring.title
                    ),
                    note=(
                        recurring.note
                        or recurring.title
                    ),
                    transaction_type=recurring.type,
                )

            transaction = Transaction(
                user_id=current_user.id,
                amount=recurring.amount,
                type=recurring.type,
                category=category,
                status=(
                    "categorized"
                    if category
                    else "pending_category"
                ),
                merchant=(
                    recurring.merchant
                    or recurring.title
                ),
                date=due_date,
                note=(
                    recurring.note
                    or recurring.title
                ),
                source="recurring",
            )

            db.add(transaction)
            db.flush()

            created_transactions.append(
                transaction
            )

            # Move to next occurrence.
            recurring.next_due_date = advance_date(
                due_date,
                recurring.frequency,
            )

            # If the next occurrence is beyond
            # the end date, deactivate it.
            if (
                recurring.end_date is not None
                and recurring.next_due_date
                > recurring.end_date
            ):
                recurring.is_active = False

    db.commit()

    for transaction in created_transactions:
        db.refresh(transaction)

    return created_transactions


# ---------------------------------------------------------
# Update recurring transaction
# ---------------------------------------------------------

@router.put(
    "/{recurring_id}",
    response_model=RecurringTransactionOut,
)
def update_recurring_transaction(
    recurring_id: int,
    payload: RecurringTransactionUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    recurring = get_owned_recurring(
        recurring_id,
        current_user.id,
        db,
    )

    updates = payload.model_dump(
        exclude_unset=True
    )
    schedule_changed = (
        "start_date" in updates
        or "frequency" in updates
    )

    next_due_date_provided = (
        "next_due_date" in updates
    )

    for key, value in updates.items():

        if isinstance(value, str):
            value = value.strip()

        setattr(
            recurring,
            key,
            value,
        )
    
# Automatically recalculate when the schedule changes.
    if schedule_changed:
        recurring.next_due_date = advance_date(
            recurring.start_date,
            recurring.frequency,
    )


    validate_dates(
        recurring.start_date,
        recurring.next_due_date,
        recurring.end_date,
    )

    db.commit()
    db.refresh(recurring)

    return recurring


# ---------------------------------------------------------
# Pause / Resume recurring transaction
# ---------------------------------------------------------

@router.patch(
    "/{recurring_id}/toggle",
    response_model=RecurringTransactionOut,
)
def toggle_recurring_transaction(
    recurring_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    recurring = get_owned_recurring(
        recurring_id,
        current_user.id,
        db,
    )

    recurring.is_active = (
        not recurring.is_active
    )

    db.commit()
    db.refresh(recurring)

    return recurring


# ---------------------------------------------------------
# Delete recurring transaction
# ---------------------------------------------------------

@router.delete(
    "/{recurring_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_recurring_transaction(
    recurring_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    recurring = get_owned_recurring(
        recurring_id,
        current_user.id,
        db,
    )

    db.delete(recurring)
    db.commit()

    return None