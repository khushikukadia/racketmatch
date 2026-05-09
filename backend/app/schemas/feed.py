from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import ProfileRead, SportEnum


class TaggedUserBrief(BaseModel):
    id: UUID
    name: str
    photo_url: str | None = None


class PostRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    author: ProfileRead | None = None
    sport: SportEnum
    caption: str | None
    location: str | None
    image_url: str | None
    played_at: datetime
    created_at: datetime
    like_count: int = 0
    comment_count: int = 0
    liked_by_me: bool = False
    tagged_users: list[TaggedUserBrief] = Field(default_factory=list)


class PostCreate(BaseModel):
    sport: SportEnum
    caption: str | None = None
    location: str | None = None
    image_url: str | None = None
    played_at: datetime
    tagged_user_ids: list[UUID] = Field(default_factory=list)


class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    post_id: UUID
    user_id: UUID
    author: ProfileRead | None = None
    body: str
    created_at: datetime


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)
