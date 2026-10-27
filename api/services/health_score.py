"""
Financial health score — a single 0-100 number summarizing how the user's
month went, built the same way as the rest of this project's "advice"
features: fixed, explainable rules over SQL aggregates, NOT a trained model.

Score = savings_rate_score (0-40) + budget_adherence_score (0-30)
      + consistency_score (0-30)

Each sub-score has a fixed, statable threshold — this is intentional so it
can be explained and defended in a demo/interview without hand-waving.
"""

from calendar import month_name
from statistics import mean, pstdev

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.transaction import Transaction
from models.budget import Budget
from models.financial_health import FinancialHealthLog
from services.monthly_comparison import get_category_totals
from services.budget_progress import get_budget_progress


def _month_totals_by_type(db: Session, user_id: int, year: int, month: int) -> dict[str, float]:
    """Total income and total expense for one month (not broken down by category)."""
    rows = (
        db.query(Transaction.type, func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == user_id,
            Transaction.status == "categorized",
            func.extract("year", Transaction.date) == year,
            func.extract("month", Transaction.date) == month,
        )
        .group_by(Transaction.type)
        .all()
    )
    totals = {"income": 0.0, "expense": 0.0}
    for type_, total in rows:
        totals[type_] = float(total)
    return totals


def _savings_rate_score(income: float, expense: float) -> tuple[int, float | None, str]:
    if income <= 0:
        return 0, None, "No income recorded this month — can't calculate a savings rate."

    savings_rate_pct = round(((income - expense) / income) * 100, 1)

    if savings_rate_pct >= 20:
        score = 40
    elif savings_rate_pct >= 10:
        score = 30
    elif savings_rate_pct >= 0:
        score = 20
    else:
        score = 0

    note = f"Saved {savings_rate_pct}% of income this month."
    return score, savings_rate_pct, note


def _budget_adherence_score(db: Session, user_id: int, year: int, month: int) -> tuple[int, str]:
    has_budgets = db.query(Budget).filter(Budget.user_id == user_id).count() > 0
    if not has_budgets:
        return 15, "No budgets set yet — using a neutral score. Set budgets to sharpen this."

    progress = get_budget_progress(db, user_id, year, month)
    if not progress:
        return 15, "No budgets set yet — using a neutral score."

    within_budget = sum(1 for p in progress if not p["is_over_budget"])
    score = round((within_budget / len(progress)) * 30)
    note = f"{within_budget}/{len(progress)} budgeted categories stayed within limit."
    return score, note


def _consistency_score(db: Session, user_id: int, year: int, month: int) -> tuple[int, str]:
    """Looks at total expense for this month and the 2 months before it.
    Lower month-to-month swings = a higher score."""
    months_to_check = []
    y, m = year, month
    for _ in range(3):
        months_to_check.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1

    totals = []
    for yy, mm in months_to_check:
        t = _month_totals_by_type(db, user_id, yy, mm)
        if t["expense"] > 0:
            totals.append(t["expense"])

    if len(totals) < 2:
        return 15, "Not enough months of history yet — using a neutral score."

    avg = mean(totals)
    spread = pstdev(totals)
    coefficient_of_variation = spread / avg if avg > 0 else 1.0

    if coefficient_of_variation <= 0.1:
        score = 30
    elif coefficient_of_variation <= 0.25:
        score = 20
    elif coefficient_of_variation <= 0.5:
        score = 10
    else:
        score = 0

    note = f"Spending varied by ~{round(coefficient_of_variation * 100)}% across the last {len(totals)} months."
    return score, note


def compute_financial_health_score(db: Session, user_id: int, year: int, month: int) -> dict:
    totals = _month_totals_by_type(db, user_id, year, month)

    savings_score, savings_rate_pct, savings_note = _savings_rate_score(totals["income"], totals["expense"])
    budget_score, budget_note = _budget_adherence_score(db, user_id, year, month)
    consistency_score, consistency_note = _consistency_score(db, user_id, year, month)

    total_score = savings_score + budget_score + consistency_score

    result = {
        "year": year,
        "month": month,
        "month_label": month_name[month],
        "score": total_score,
        "breakdown": {
            "savings_rate": {"score": savings_score, "max": 40, "note": savings_note},
            "budget_adherence": {"score": budget_score, "max": 30, "note": budget_note},
            "consistency": {"score": consistency_score, "max": 30, "note": consistency_note},
        },
        "savings_rate_pct": savings_rate_pct,
    }

    _log_score(db, user_id, year, month, total_score, savings_score, budget_score, consistency_score, savings_rate_pct)
    return result


def _log_score(db, user_id, year, month, score, savings_score, budget_score, consistency_score, savings_rate_pct):
    """Upsert into financial_health_logs so the frontend can show a trend line."""
    existing = (
        db.query(FinancialHealthLog)
        .filter(
            FinancialHealthLog.user_id == user_id,
            FinancialHealthLog.year == year,
            FinancialHealthLog.month == month,
        )
        .first()
    )
    if existing:
        existing.score = score
        existing.savings_rate_score = savings_score
        existing.budget_adherence_score = budget_score
        existing.consistency_score = consistency_score
        existing.savings_rate_pct = savings_rate_pct
    else:
        db.add(
            FinancialHealthLog(
                user_id=user_id,
                year=year,
                month=month,
                score=score,
                savings_rate_score=savings_score,
                budget_adherence_score=budget_score,
                consistency_score=consistency_score,
                savings_rate_pct=savings_rate_pct,
            )
        )
    db.commit()


def get_score_history(db: Session, user_id: int, limit: int = 6) -> list[dict]:
    logs = (
        db.query(FinancialHealthLog)
        .filter(FinancialHealthLog.user_id == user_id)
        .order_by(FinancialHealthLog.year.desc(), FinancialHealthLog.month.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "year": log.year,
            "month": log.month,
            "month_label": month_name[log.month],
            "score": log.score,
        }
        for log in reversed(logs)
    ]
