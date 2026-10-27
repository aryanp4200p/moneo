import calendar
from datetime import date

from sqlalchemy.orm import Session

from models.budget import Budget
from models.transaction import Transaction


def predict_overspending(
    db: Session,
    user_id: int,
    year: int,
    month: int,
) -> list[dict]:

    today = date.today()

    # Number of days in requested month
    days_in_month = calendar.monthrange(year, month)[1]

    # If current month, use today's day.
    # For previous months, use the full month.
    if year == today.year and month == today.month:
        days_elapsed = today.day
    else:
        days_elapsed = days_in_month

    # Avoid division by zero
    days_elapsed = max(days_elapsed, 1)

    budgets = (
        db.query(Budget)
        .filter(Budget.user_id == user_id)
        .all()
    )

    predictions = []

    for budget in budgets:

        transactions = (
            db.query(Transaction)
            .filter(
                Transaction.user_id == user_id,
                Transaction.type == "expense",
                Transaction.status == "categorized",
                Transaction.category == budget.category,
                Transaction.date >= date(year, month, 1),
                Transaction.date <= date(year, month, days_in_month),
            )
            .all()
        )

        spent = sum(txn.amount for txn in transactions)

        daily_average = spent / days_elapsed

        projected_spending = daily_average * days_in_month

        predicted_excess = max(
            projected_spending - budget.monthly_limit,
            0,
        )

        percent_projected = (
            (projected_spending / budget.monthly_limit) * 100
            if budget.monthly_limit > 0
            else 0
        )

        if predicted_excess > 0:
            risk = "high"
        elif percent_projected >= 80:
            risk = "medium"
        else:
            risk = "low"

        predictions.append(
            {
                "budget_id": budget.id,
                "category": budget.category,
                "monthly_limit": round(budget.monthly_limit, 2),
                "spent": round(spent, 2),
                "daily_average": round(daily_average, 2),
                "projected_spending": round(projected_spending, 2),
                "predicted_excess": round(predicted_excess, 2),
                "projected_percent": round(percent_projected, 1),
                "risk": risk,
                "days_elapsed": days_elapsed,
                "days_in_month": days_in_month,
            }
        )

    return sorted(
        predictions,
        key=lambda x: x["predicted_excess"],
        reverse=True,
    )