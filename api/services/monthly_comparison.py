"""
Month-over-month category comparison.

This is deliberately plain SQL aggregation + Python arithmetic — NOT machine
learning. It is explainable and testable: given the same two months of
transactions, it always produces the same result, and every number in the
output can be traced back to a SQL query.
"""

from calendar import month_name
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.transaction import Transaction

CHANGE_THRESHOLD_PCT = 15  # ignore small swings so insights aren't noisy


def get_category_totals(db: Session, user_id: int, year: int, month: int) -> dict[str, float]:
    """SUM(amount) GROUP BY category for a given user/month, expenses only,
    categorized transactions only (pending ones have no category to group by)."""
    rows = (
        db.query(Transaction.category, func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.status == "categorized",
            func.extract("year", Transaction.date) == year,
            func.extract("month", Transaction.date) == month,
        )
        .group_by(Transaction.category)
        .all()
    )
    return {category: float(total) for category, total in rows}


def _prev_month(year: int, month: int) -> tuple[int, int]:
    if month == 1:
        return year - 1, 12
    return year, month - 1


def compare_month_over_month(db: Session, user_id: int, year: int, month: int) -> list[dict]:
    """Compare each category's spend this month vs last month.
    Only returns categories that changed by more than CHANGE_THRESHOLD_PCT."""
    current = get_category_totals(db, user_id, year, month)
    prev_year, prev_month = _prev_month(year, month)
    previous = get_category_totals(db, user_id, prev_year, prev_month)

    insights = []
    for category, current_amount in current.items():
        previous_amount = previous.get(category)
        if previous_amount is None or previous_amount == 0:
            continue  # no baseline to compare against yet

        change_pct = (current_amount - previous_amount) / previous_amount * 100
        if abs(change_pct) > CHANGE_THRESHOLD_PCT:
            insights.append(
                {
                    "category": category,
                    "current": round(current_amount, 2),
                    "previous": round(previous_amount, 2),
                    "change_pct": round(change_pct, 1),
                    "month_label": month_name[month],
                    "prev_month_label": month_name[prev_month],
                }
            )

    # biggest swings first
    insights.sort(key=lambda i: abs(i["change_pct"]), reverse=True)
    return insights
