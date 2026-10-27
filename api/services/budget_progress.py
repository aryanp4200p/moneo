"""
Budget progress calculation.

Reuses get_category_totals() from monthly_comparison.py so there's a single
source of truth for "how much did the user spend in category X this month" —
the comparison feature and the budget feature both read from the same
SQL aggregation instead of duplicating the query.
"""

from datetime import date

from sqlalchemy.orm import Session

from models.budget import Budget
from services.monthly_comparison import get_category_totals



def get_budget_progress(
    db: Session,
    user_id: int,
    year: int,
    month: int,
) -> list[dict]:
    """Return progress only for budgets belonging to the selected month."""

    selected_budget_month = date(year, month, 1)

    budgets = (
        db.query(Budget)
        .filter(
            Budget.user_id == user_id,
            Budget.budget_month == selected_budget_month,
        )
        .all()
    )

    current_totals = get_category_totals(db, user_id, year, month)

    progress = []

    for budget in budgets:
        spent = float(current_totals.get(budget.category, 0.0))
        monthly_limit = float(budget.monthly_limit)

        percent_used = (
            round((spent / monthly_limit) * 100, 1)
            if monthly_limit > 0
            else 0.0
        )

        progress.append(
            {
                "budget_id": budget.id,
                "category": budget.category,
                "monthly_limit": monthly_limit,
                "spent": round(spent, 2),
                "remaining": round(monthly_limit - spent, 2),
                "percent_used": percent_used,
                "is_over_budget": spent > monthly_limit,
            }
        )

    return sorted(
        progress,
        key=lambda item: item["percent_used"],
        reverse=True,
    )
