from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import ProfileRead


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    match_id: UUID
    sender_id: UUID
    body: str
    created_at: datetime


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class MatchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_a_id: UUID
    user_b_id: UUID
    created_at: datetime


class MatchWithPreviewRead(BaseModel):
    match: MatchRead
    other_user: ProfileRead
    last_message_preview: str | None
    last_message_at: datetime | None
