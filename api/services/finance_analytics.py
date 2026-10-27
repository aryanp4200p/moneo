from __future__ import annotations

from collections import defaultdict
from datetime import date
from math import pow

from sqlalchemy.orm import Session

from models.transaction import Transaction


def _month_key(year: int, month: int) -> str:
    return f"{year:04d}-{month:02d}"


def _month_label(key: str) -> str:
    year, month = map(int, key.split("-"))

    return date(
        year,
        month,
        1,
    ).strftime("%b %Y")


def get_monthly_expenses(
    db: Session,
    user_id: int,
    months: int = 6,
):
    today = date.today()

    rows = (
        db.query(
            Transaction.date,
            Transaction.amount,
        )
        .filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.date <= today,
        )
        .all()
    )

    totals = defaultdict(float)

    for txn_date, amount in rows:
        key = _month_key(
            txn_date.year,
            txn_date.month,
        )

        totals[key] += float(
            amount or 0
        )

    keys = []

    year = today.year
    month = today.month

    for _ in range(months):
        keys.append(
            _month_key(
                year,
                month,
            )
        )

        month -= 1

        if month == 0:
            month = 12
            year -= 1

    keys.reverse()

    return [
        {
            "month": key,
            "label": _month_label(key),
            "amount": round(
                totals[key],
                2,
            ),
        }
        for key in keys
    ]


def forecast_next_month(
    values: list[float],
) -> float:

    if not values:
        return 0.0

    if len(values) == 1:
        return values[-1]

    # Recent months receive larger weights.
    weights = list(
        range(
            1,
            len(values) + 1,
        )
    )

    weighted_average = (
        sum(
            value * weight
            for value, weight in zip(
                values,
                weights,
            )
        )
        / sum(weights)
    )

    # Linear trend calculation.

    n = len(values)

    x_mean = (
        n - 1
    ) / 2

    y_mean = (
        sum(values) / n
    )

    denominator = sum(
        (
            i - x_mean
        ) ** 2
        for i in range(n)
    ) or 1

    slope = sum(
        (
            i - x_mean
        )
        * (
            value - y_mean
        )
        for i, value in enumerate(values)
    ) / denominator

    trend_prediction = (
        values[-1] + slope
    )

    prediction = (
        0.7 * weighted_average
        + 0.3 * trend_prediction
    )

    return max(
        0.0,
        round(
            prediction,
            2,
        ),
    )


def calculate_wealth_plan(
    starting_amount: float,
    monthly_contribution: float,
    years: int,
    annual_return_percent: float,
    inflation_percent: float,
):

    months = years * 12

    monthly_rate = (
        annual_return_percent
        / 100
        / 12
    )

    if monthly_rate == 0:

        future_value = (
            starting_amount
            + monthly_contribution
            * months
        )

    else:

        future_value = (
            starting_amount
            * pow(
                1 + monthly_rate,
                months,
            )
            +
            monthly_contribution
            *
            (
                (
                    pow(
                        1 + monthly_rate,
                        months,
                    )
                    - 1
                )
                / monthly_rate
            )
        )

    inflation_factor = pow(
        1 + inflation_percent / 100,
        years,
    )

    if inflation_factor:

        inflation_adjusted = (
            future_value
            / inflation_factor
        )

    else:

        inflation_adjusted = future_value

    contributions = (
        starting_amount
        + monthly_contribution * months
    )

    return {
        "starting_amount": round(
            starting_amount,
            2,
        ),

        "monthly_contribution": round(
            monthly_contribution,
            2,
        ),

        "years": years,

        "annual_return_percent":
            annual_return_percent,

        "inflation_percent":
            inflation_percent,

        "total_contributions": round(
            contributions,
            2,
        ),

        "future_value": round(
            future_value,
            2,
        ),

        "inflation_adjusted_value": round(
            inflation_adjusted,
            2,
        ),

        "estimated_growth": round(
            max(
                0,
                future_value - contributions,
            ),
            2,
        ),
    }