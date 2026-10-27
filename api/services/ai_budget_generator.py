from datetime import date, timedelta
from collections import defaultdict

from sqlalchemy.orm import Session

from models.transaction import Transaction


def generate_budget_recommendations(
    db: Session,
    user_id: int,
    months: int = 3,
) -> list[dict]:
    """
    Generate recommended monthly budgets using:

    1. Current month's income
    2. Current month's expenses
    3. Amount remaining after expenses
    4. Historical categorized spending

    The historical spending is used as the baseline.
    A 10% safety buffer is added to historical spending.

    The final recommendations are always constrained
    by the amount currently available to budget.

    If the available amount is greater than the historical
    spending requirement, the remaining amount is assigned
    to Savings.
    """

    today = date.today()

    # ============================================================
    # VALIDATE MONTHS
    # ============================================================

    months = max(int(months), 1)

    # ============================================================
    # CURRENT MONTH DATE RANGE
    # ============================================================

    current_month_start = today.replace(day=1)

    if current_month_start.month == 12:
        next_month_start = date(
            current_month_start.year + 1,
            1,
            1,
        )
    else:
        next_month_start = date(
            current_month_start.year,
            current_month_start.month + 1,
            1,
        )

    # ============================================================
    # CURRENT MONTH TRANSACTIONS
    # ============================================================

    current_month_transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.date >= current_month_start,
            Transaction.date < next_month_start,
        )
        .all()
    )

    monthly_income = 0.0
    monthly_expenses = 0.0

    for txn in current_month_transactions:
        amount = float(txn.amount or 0)

        if txn.type == "income":
            monthly_income += amount

        elif txn.type == "expense":
            monthly_expenses += amount

    # ============================================================
    # AMOUNT REMAINING
    # ============================================================

    available_to_budget = max(
        monthly_income - monthly_expenses,
        0.0,
    )

    # No money available for a budget.
    if available_to_budget <= 0:
        return []

    # ============================================================
    # HISTORICAL DATE RANGE
    # ============================================================

    start_date = today - timedelta(days=months * 30)

    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.status == "categorized",
            Transaction.category.isnot(None),
            Transaction.date >= start_date,
            Transaction.date <= today,
        )
        .all()
    )

    # ============================================================
    # NO HISTORICAL DATA
    # ============================================================

    if not transactions:
        return [
            {
                "category": "Savings",
                "average_monthly_spending": 0,
                "recommended_budget": round(
                    available_to_budget,
                    2,
                ),
                "buffer_percent": 0,
                "months_analyzed": 0,
                "available_to_budget": round(
                    available_to_budget,
                    2,
                ),
                "allocation_percent": 100,
                "reason": (
                    "There is not enough historical spending data "
                    "yet, so the available amount is reserved "
                    "for savings."
                ),
            }
        ]

    # ============================================================
    # CATEGORY -> MONTH -> SPENDING
    # ============================================================

    category_monthly_spending = defaultdict(
        lambda: defaultdict(float)
    )

    for txn in transactions:
        month_key = txn.date.strftime("%Y-%m")

        category_monthly_spending[
            txn.category
        ][month_key] += float(txn.amount or 0)

    # ============================================================
    # CREATE HISTORICAL BASELINES
    # ============================================================

    baseline_recommendations = []

    for category, monthly_data in category_monthly_spending.items():

        monthly_values = list(monthly_data.values())

        if not monthly_values:
            continue

        average_spending = (
            sum(monthly_values)
            / len(monthly_values)
        )

        # 10% safety buffer
        recommended_budget = average_spending * 1.10

        baseline_recommendations.append(
            {
                "category": category,
                "average_monthly_spending": round(
                    average_spending,
                    2,
                ),
                "baseline_budget": recommended_budget,
                "buffer_percent": 10,
                "months_analyzed": len(monthly_values),
            }
        )

    # ============================================================
    # NO VALID BASELINES
    # ============================================================

    if not baseline_recommendations:
        return [
            {
                "category": "Savings",
                "average_monthly_spending": 0,
                "recommended_budget": round(
                    available_to_budget,
                    2,
                ),
                "buffer_percent": 0,
                "months_analyzed": 0,
                "available_to_budget": round(
                    available_to_budget,
                    2,
                ),
                "allocation_percent": 100,
                "reason": (
                    "No meaningful historical spending data "
                    "was found. The available amount is reserved "
                    "for savings."
                ),
            }
        ]

    # ============================================================
    # TOTAL HISTORICAL BASELINE
    # ============================================================

    total_baseline = sum(
        item["baseline_budget"]
        for item in baseline_recommendations
    )

    # ============================================================
    # RECOMMENDATIONS
    # ============================================================

    recommendations = []

    # ------------------------------------------------------------
    # CASE 1:
    # AVAILABLE MONEY IS LESS THAN HISTORICAL REQUIREMENT
    # ------------------------------------------------------------

    if available_to_budget < total_baseline:

        scaling_factor = (
            available_to_budget
            / total_baseline
        )

        for item in baseline_recommendations:

            recommended_budget = (
                item["baseline_budget"]
                * scaling_factor
            )

            recommendations.append(
                {
                    "category": item["category"],
                    "average_monthly_spending": round(
                        item["average_monthly_spending"],
                        2,
                    ),
                    "recommended_budget": round(
                        recommended_budget,
                        2,
                    ),
                    "buffer_percent": item[
                        "buffer_percent"
                    ],
                    "months_analyzed": item[
                        "months_analyzed"
                    ],
                    "available_to_budget": round(
                        available_to_budget,
                        2,
                    ),
                    "allocation_percent": round(
                        (
                            recommended_budget
                            / available_to_budget
                        )
                        * 100,
                        2,
                    ),
                    "reason": (
                        "This budget was adjusted to fit "
                        "the amount remaining after your "
                        "current-month expenses."
                    ),
                }
            )

    # ------------------------------------------------------------
    # CASE 2:
    # AVAILABLE MONEY IS GREATER THAN HISTORICAL REQUIREMENT
    # ------------------------------------------------------------

    else:

        for item in baseline_recommendations:

            recommended_budget = item[
                "baseline_budget"
            ]

            recommendations.append(
                {
                    "category": item["category"],
                    "average_monthly_spending": round(
                        item["average_monthly_spending"],
                        2,
                    ),
                    "recommended_budget": round(
                        recommended_budget,
                        2,
                    ),
                    "buffer_percent": item[
                        "buffer_percent"
                    ],
                    "months_analyzed": item[
                        "months_analyzed"
                    ],
                    "available_to_budget": round(
                        available_to_budget,
                        2,
                    ),
                    "allocation_percent": round(
                        (
                            recommended_budget
                            / available_to_budget
                        )
                        * 100,
                        2,
                    ),
                    "reason": (
                        "Based on your historical spending "
                        "with a 10% safety buffer."
                    ),
                }
            )

        # --------------------------------------------------------
        # Remaining money goes to Savings
        # --------------------------------------------------------

        allocated = sum(
            item["recommended_budget"]
            for item in recommendations
        )

        savings_amount = max(
            available_to_budget - allocated,
            0.0,
        )

        if savings_amount > 0:

            recommendations.append(
                {
                    "category": "Savings",
                    "average_monthly_spending": 0,
                    "recommended_budget": round(
                        savings_amount,
                        2,
                    ),
                    "buffer_percent": 0,
                    "months_analyzed": 0,
                    "available_to_budget": round(
                        available_to_budget,
                        2,
                    ),
                    "allocation_percent": round(
                        (
                            savings_amount
                            / available_to_budget
                        )
                        * 100,
                        2,
                    ),
                    "reason": (
                        "The remaining amount is allocated "
                        "to savings instead of increasing "
                        "normal spending limits."
                    ),
                }
            )

    # ============================================================
    # ROUNDING CORRECTION
    # ============================================================

    total_recommended = round(
        sum(
            item["recommended_budget"]
            for item in recommendations
        ),
        2,
    )

    difference = round(
        available_to_budget
        - total_recommended,
        2,
    )

    if recommendations and difference != 0:

        largest = max(
            recommendations,
            key=lambda item: item[
                "recommended_budget"
            ],
        )

        largest["recommended_budget"] = round(
            largest["recommended_budget"]
            + difference,
            2,
        )

    # ============================================================
    # FINAL SORT
    # ============================================================

    return sorted(
        recommendations,
        key=lambda item: item["recommended_budget"],
        reverse=True,
    )