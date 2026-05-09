import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Follow, UserProfile
from app.schemas.common import (
    PriorityEnum,
    ProfileRead,
    SkillLevelEnum,
    SportEnum,
    SportPreferenceRead,
)


def follow_counts(db: Session, user_id: uuid.UUID) -> tuple[int, int]:
    fc = db.scalar(select(func.count()).select_from(Follow).where(Follow.following_id == user_id)) or 0
    fg = db.scalar(select(func.count()).select_from(Follow).where(Follow.follower_id == user_id)) or 0
    return int(fc), int(fg)


def profile_read(db: Session, user: UserProfile) -> ProfileRead:
    fc, fg = follow_counts(db, user.id)
    return ProfileRead(
        id=user.id,
        name=user.name,
        bio=user.bio,
        photo_url=user.photo_url,
        city=user.city,
        created_at=user.created_at,
        updated_at=user.updated_at,
        follower_count=fc,
        following_count=fg,
    )


def sport_pref_read_list(prefs) -> list[SportPreferenceRead]:
    out: list[SportPreferenceRead] = []
    for p in prefs or []:
        out.append(
            SportPreferenceRead(
                id=p.id,
                sport=SportEnum(p.sport.value),
                skill_level=SkillLevelEnum(p.skill_level.value),
                priority=PriorityEnum(p.priority.value),
                preferred_times=list(p.preferred_times or []),
                preferred_locations=list(p.preferred_locations or []),
            )
        )
    return out


def load_profile(db: Session, user_id: uuid.UUID) -> UserProfile | None:
    return db.scalar(
        select(UserProfile)
        .where(UserProfile.id == user_id)
        .options(selectinload(UserProfile.sport_preferences))
    )
