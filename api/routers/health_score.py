from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.user import User
from services.health_score import (
    compute_financial_health_score,
    get_score_history,
)


router = APIRouter(
    prefix="/health-score",
    tags=["financial-health"],
)


# ============================================================
# CURRENT FINANCIAL HEALTH SCORE
# ============================================================

@router.get("")
def get_financial_health_score(
    year: int | None = Query(
        default=None,
        ge=2000,
        le=2100,
    ),
    month: int | None = Query(
        default=None,
        ge=1,
        le=12,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Calculate the user's financial health score
    for the requested month.

    If year/month are not provided,
    the current month is used.
    """

    today = date.today()

    selected_year = year or today.year
    selected_month = month or today.month

    return compute_financial_health_score(
        db=db,
        user_id=current_user.id,
        year=selected_year,
        month=selected_month,
    )


# ============================================================
# FINANCIAL HEALTH SCORE HISTORY
# ============================================================

@router.get("/history")
def financial_health_history(
    limit: int = Query(
        default=6,
        ge=1,
        le=24,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return the user's historical financial health scores.

    Defaults to the latest 6 months.
    """

    history = get_score_history(
        db=db,
        user_id=current_user.id,
        limit=limit,
    )

    return {
        "limit": limit,
        "history": history,
    }