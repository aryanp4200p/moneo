from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BudgetCreate(BaseModel):
    category: str = Field(min_length=1, max_length=50)
    monthly_limit: float = Field(gt=0)


class BudgetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    category: str
    monthly_limit: float
    created_at: datetime
