from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import SessionStatusEnum, SportEnum


class ProposalCreate(BaseModel):
    sport: SportEnum
    proposed_time: datetime
    location: str = Field(min_length=1, max_length=255)


class ProposalUpdate(BaseModel):
    status: SessionStatusEnum


class ProposalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    match_id: UUID
    proposed_by_id: UUID
    sport: SportEnum
    proposed_time: datetime
    location: str
    status: SessionStatusEnum
    created_at: datetime
