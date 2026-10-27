
from pydantic import BaseModel, Field


class AdvisorChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    conversation_id: int | None = None


class AdvisorChatResponse(BaseModel):
    answer: str
    conversation_id: int


class AdvisorConversationItem(BaseModel):
    id: int
    title: str
    created_at: str | None = None
    updated_at: str | None = None


class AdvisorMessageItem(BaseModel):
    id: int
    role: str
    content: str
    created_at: str | None = None
