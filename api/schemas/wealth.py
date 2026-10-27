from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict, Field


WealthKind = Literal["asset", "liability"]


class WealthItemCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=120,
    )

    kind: WealthKind

    category: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    value: float = Field(
        gt=0,
    )

    note: Optional[str] = Field(
        default=None,
        max_length=255,
    )


class WealthItemUpdate(BaseModel):
    name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=120,
    )

    kind: Optional[WealthKind] = None

    category: Optional[str] = Field(
        default=None,
        max_length=50,
    )

    value: Optional[float] = Field(
        default=None,
        gt=0,
    )

    note: Optional[str] = Field(
        default=None,
        max_length=255,
    )


class WealthItemOut(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    user_id: int

    name: str
    kind: WealthKind

    category: Optional[str]

    value: float

    note: Optional[str]

    created_at: datetime
    updated_at: Optional[datetime]


class WealthSummary(BaseModel):
    total_assets: float
    total_liabilities: float
    net_worth: float

    assets: list[WealthItemOut]
    liabilities: list[WealthItemOut]