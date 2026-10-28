from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.budget import Budget
from schemas.budget import BudgetCreate, BudgetOut
from services.budget_progress import get_budget_progress
from services.ai_budget_generator import generate_budget_recommendations
from services.overspending_prediction import predict_overspending


router = APIRouter(prefix="/budgets", tags=["budgets"])


# ============================================================
# LIST ALL BUDGETS
# ============================================================

@router.get("", response_model=list[BudgetOut])
def list_budgets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Budget)
        .filter(Budget.user_id == current_user.id)
        .all()
    )


# ============================================================
# CREATE / UPDATE BUDGET
# ============================================================

@router.post(
    "",
    response_model=BudgetOut,
    status_code=status.HTTP_201_CREATED,
)
def create_budget(
    payload: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if budget already exists for this category
    # to avoid duplicate budgets.
    existing = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.category == payload.category.strip(),
        )
        .first()
    )

    if existing:
        existing.monthly_limit = payload.monthly_limit
        existing.budget_month = payload.budget_month

        db.commit()
        db.refresh(existing)

        return existing

    budget = Budget(
        user_id=current_user.id,
        category=payload.category.strip(),
        monthly_limit=payload.monthly_limit,
        budget_month=payload.budget_month,
    )

    db.add(budget)
    db.commit()
    db.refresh(budget)

    return budget


# ============================================================
# AI BUDGET RECOMMENDATION
# ============================================================

@router.get("/ai-recommendation")
def ai_budget_recommendation(
    months: int = Query(
        default=3,
        ge=1,
        le=12,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate recommended monthly budgets using the user's
    historical categorized expense transactions.
    """

    recommendations = generate_budget_recommendations(
        db=db,
        user_id=current_user.id,
        months=months,
    )

    return {
        "months_analyzed": months,
        "recommendations": recommendations,
    }


# ============================================================
# OVERSPENDING PREDICTION
# ============================================================

@router.get("/overspending-prediction")
def overspending_prediction(
    year: int = Query(default=None),
    month: int = Query(
        default=None,
        ge=1,
        le=12,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Predict month-end spending based on the user's
    current spending rate.
    """

    today = date.today()

    year = year or today.year
    month = month or today.month

    predictions = predict_overspending(
        db=db,
        user_id=current_user.id,
        year=year,
        month=month,
    )

    return {
        "year": year,
        "month": month,
        "predictions": predictions,
    }


# ============================================================
# BUDGET PROGRESS
# ============================================================

@router.get("/progress")
def budget_progress(
    year: int = Query(default=None),
    month: int = Query(
        default=None,
        ge=1,
        le=12,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Spend-vs-limit for every budget the user has set,
    for the given month.

    Defaults to the current month.
    """

    today = date.today()

    year = year or today.year
    month = month or today.month

    return {
        "year": year,
        "month": month,
        "budgets": get_budget_progress(
            db,
            current_user.id,
            year,
            month,
        ),
    }


# ============================================================
# DELETE BUDGET
# ============================================================

@router.delete(
    "/{budget_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a specific budget by its ID."""

    budget = (
        db.query(Budget)
        .filter(
            Budget.id == budget_id,
            Budget.user_id == current_user.id,
        )
        .first()
    )

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )

    db.delete(budget)
    db.commit()

    return None