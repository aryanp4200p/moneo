from __future__ import annotations

from collections import defaultdict
from datetime import date

from fastapi import (
    APIRouter,
    Depends,
    Query,
)

from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user

from models.transaction import Transaction

from schemas.analytics import (
    InsightItem,
    InsightsResponse,
    PredictivePoint,
    PredictiveResponse,
    WealthPlanRequest,
    WealthPlanResponse,
)

from services.finance_analytics import (
    calculate_wealth_plan,
    forecast_next_month,
    get_monthly_expenses,
)


router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


@router.get(
    "/predictive",
    response_model=PredictiveResponse,
)
def predictive_finance(
    months: int = Query(
        default=6,
        ge=3,
        le=12,
    ),

    db: Session = Depends(get_db),

    current_user=Depends(
        get_current_user
    ),
):

    monthly = get_monthly_expenses(
        db,
        current_user.id,
        months,
    )

    values = [
        item["amount"]
        for item in monthly
    ]

    prediction = forecast_next_month(
        values
    )

    non_zero = [
        value
        for value in values
        if value > 0
    ]

    if len(non_zero) < 2:

        confidence = "Limited data"

        note = (
            "Add more expense history "
            "for a more useful forecast."
        )

    elif len(non_zero) < 4:

        confidence = "Early estimate"

        note = (
            "The forecast uses recent "
            "spending history and is "
            "sensitive to new data."
        )

    else:

        confidence = "Historical trend"

        note = (
            "The forecast is an "
            "explainable estimate based "
            "on recent monthly spending."
        )

    today = date.today()

    next_month = today.month + 1

    next_year = today.year

    if next_month == 13:

        next_month = 1
        next_year += 1

    return PredictiveResponse(

        historical=[
            PredictivePoint(
                month=item["label"],
                amount=item["amount"],
            )
            for item in monthly
        ],

        forecast=PredictivePoint(

            month=date(
                next_year,
                next_month,
                1,
            ).strftime("%b %Y"),

            amount=prediction,

            is_forecast=True,
        ),

        method=(
            "Weighted recent average "
            "+ linear trend"
        ),

        confidence_label=confidence,

        note=note,
    )


@router.get(
    "/insights",
    response_model=InsightsResponse,
)
def spending_insights(
    db: Session = Depends(get_db),

    current_user=Depends(
        get_current_user
    ),
):

    today = date.today()

    month_start = date(
        today.year,
        today.month,
        1,
    )

    rows = (
        db.query(Transaction)
        .filter(
            Transaction.user_id
            == current_user.id,

            Transaction.date
            >= month_start,

            Transaction.date
            <= today,
        )
        .all()
    )

    income = sum(
        float(t.amount or 0)
        for t in rows
        if t.type == "income"
    )

    expense = sum(
        float(t.amount or 0)
        for t in rows
        if t.type == "expense"
    )

    savings = income - expense

    savings_rate = (
        savings / income * 100
        if income > 0
        else 0
    )

    category_totals = defaultdict(
        float
    )

    for txn in rows:

        if txn.type == "expense":

            category_totals[
                txn.category or "Other"
            ] += float(
                txn.amount or 0
            )

    breakdown = [

        {
            "category": category,
            "amount": round(
                amount,
                2,
            ),
        }

        for category, amount
        in sorted(
            category_totals.items(),
            key=lambda x: x[1],
            reverse=True,
        )
    ]

    insights = []

    if income > 0 and savings_rate >= 30:

        insights.append(
            InsightItem(

                title="Strong savings rate",

                message=(
                    f"You are retaining "
                    f"about {savings_rate:.1f}% "
                    "of this month's income."
                ),

                severity="positive",

                value=round(
                    savings_rate,
                    2,
                ),
            )
        )

    elif income > 0:

        insights.append(
            InsightItem(

                title="Savings opportunity",

                message=(
                    f"Your current savings "
                    f"rate is {savings_rate:.1f}%. "
                    "Review discretionary "
                    "spending to create more room."
                ),

                severity="warning",

                value=round(
                    savings_rate,
                    2,
                ),
            )
        )

    if breakdown:

        top = breakdown[0]

        share = (
            top["amount"]
            / expense
            * 100
            if expense
            else 0
        )

        insights.append(
            InsightItem(

                title=(
                    f"Largest category: "
                    f"{top['category']}"
                ),

                message=(
                    f"{top['category']} accounts "
                    f"for about {share:.1f}% "
                    "of your current-month spending."
                ),

                severity="info",

                category=top["category"],

                value=top["amount"],
            )
        )

    monthly = get_monthly_expenses(
        db,
        current_user.id,
        2,
    )

    if (
        len(monthly) == 2
        and monthly[0]["amount"] > 0
    ):

        previous = monthly[0]["amount"]

        current = monthly[1]["amount"]

        change = (
            (current - previous)
            / previous
            * 100
        )

        severity = (
            "warning"
            if change >= 20
            else "positive"
            if change <= -10
            else "info"
        )

        insights.append(
            InsightItem(

                title="Monthly spending change",

                message=(
                    f"Spending changed by "
                    f"{change:+.1f}% compared "
                    "with the previous month."
                ),

                severity=severity,

                value=current,

                change_percent=round(
                    change,
                    2,
                ),
            )
        )

    if not insights:

        insights.append(
            InsightItem(

                title=(
                    "Build your financial history"
                ),

                message=(
                    "Add a few income and "
                    "expense transactions to "
                    "unlock personalized insights."
                ),

                severity="info",
            )
        )

    return InsightsResponse(

        total_income=round(
            income,
            2,
        ),

        total_expense=round(
            expense,
            2,
        ),

        savings=round(
            savings,
            2,
        ),

        savings_rate=round(
            savings_rate,
            2,
        ),

        insights=insights,

        category_breakdown=breakdown,
    )


@router.post(
    "/wealth-plan",
    response_model=WealthPlanResponse,
)
def wealth_plan(
    payload: WealthPlanRequest,

    current_user=Depends(
        get_current_user
    ),
):

    # Authentication is intentionally
    # required for this endpoint.

    return calculate_wealth_plan(
        **payload.model_dump()
    )