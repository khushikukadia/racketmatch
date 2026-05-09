from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SportEnum(str, Enum):
    squash = "squash"
    tennis = "tennis"
    pickleball = "pickleball"


class SkillLevelEnum(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class PriorityEnum(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class SessionStatusEnum(str, Enum):
    proposed = "proposed"
    accepted = "accepted"
    declined = "declined"
    completed = "completed"


class SportPreferenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sport: SportEnum
    skill_level: SkillLevelEnum
    priority: PriorityEnum
    preferred_times: list[str] = Field(default_factory=list)
    preferred_locations: list[str] = Field(default_factory=list)


class SportPreferenceWrite(BaseModel):
    sport: SportEnum
    skill_level: SkillLevelEnum
    priority: PriorityEnum
    preferred_times: list[str] = Field(default_factory=list)
    preferred_locations: list[str] = Field(default_factory=list)


class ProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    bio: str | None
    photo_url: str | None
    city: str | None
    created_at: datetime
    updated_at: datetime
    follower_count: int = 0
    following_count: int = 0


class ProfileUpdate(BaseModel):
    name: str | None = None
    bio: str | None = None
    photo_url: str | None = None
    city: str | None = None


class DiscoverProfileRead(ProfileRead):
    compatibility_score: int
    match_reasons: list[str] = Field(default_factory=list)
    sports: list[SportPreferenceRead] = Field(default_factory=list)
