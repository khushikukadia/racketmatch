from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class SwipeCreate(BaseModel):
    swiped_user_id: UUID
    direction: Literal["like", "pass"]


class SwipeResult(BaseModel):
    recorded: bool
    matched: bool
    match_id: UUID | None = None
