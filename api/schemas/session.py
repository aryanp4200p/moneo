from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: str
    device_name: str | None = None
    ip_address: str | None = None
    created_at: datetime
    last_active_at: datetime
    is_active: bool
    is_current: bool = False