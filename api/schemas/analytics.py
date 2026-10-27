from typing import Optional

from pydantic import BaseModel, Field


class PredictivePoint(BaseModel):
    month: str
    amount: float
    is_forecast: bool = False


class PredictiveResponse(BaseModel):
    historical: list[PredictivePoint]

    forecast: PredictivePoint

    method: str

    confidence_label: str

    note: str


class InsightItem(BaseModel):
    title: str

    message: str

    severity: str = Field(
        pattern="^(info|positive|warning|critical)$"
    )

    category: Optional[str] = None

    value: Optional[float] = None

    change_percent: Optional[float] = None


class InsightsResponse(BaseModel):
    total_income: float

    total_expense: float

    savings: float

    savings_rate: float

    insights: list[InsightItem]

    category_breakdown: list[dict]


class WealthPlanRequest(BaseModel):
    starting_amount: float = Field(
        default=100000,
        ge=0,
    )

    monthly_contribution: float = Field(
        default=10000,
        ge=0,
    )

    years: int = Field(
        default=15,
        ge=1,
        le=60,
    )

    annual_return_percent: float = Field(
        default=8,
        ge=0,
        le=30,
    )

    inflation_percent: float = Field(
        default=6,
        ge=0,
        le=20,
    )


class WealthPlanResponse(BaseModel):
    starting_amount: float

    monthly_contribution: float

    years: int

    annual_return_percent: float

    inflation_percent: float

    total_contributions: float

    future_value: float

    inflation_adjusted_value: float

    estimated_growth: float