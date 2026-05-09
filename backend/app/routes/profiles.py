import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_user_id
from app.database import get_db
from app.models import Follow, Post, Sport, SportPreference, UserProfile
from app.models.enums import SkillLevel, SportPriority
from app.schemas.common import (
    DiscoverProfileRead,
    ProfileRead,
    ProfileUpdate,
    SportPreferenceRead,
    SportPreferenceWrite,
)
from app.schemas.feed import PostRead
from app.services.discover import list_discover_profiles
from app.services.feed_items import post_to_read
from app.services.profiles import follow_counts, load_profile, profile_read, sport_pref_read_list

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/me", response_model=ProfileRead)
def get_me(
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
    user = load_profile(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile_read(db, user)


@router.put("/me", response_model=ProfileRead)
def update_me(
    body: ProfileUpdate,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
    user = db.get(UserProfile, user_id)
    if not user:
        if not body.name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="name is required to create your profile",
            )
        user = UserProfile(
            id=user_id,
            name=body.name,
            bio=body.bio,
            photo_url=body.photo_url,
            city=body.city,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return profile_read(db, user)
    if body.name is not None:
        user.name = body.name
    if body.bio is not None:
        user.bio = body.bio
    if body.photo_url is not None:
        user.photo_url = body.photo_url
    if body.city is not None:
        user.city = body.city
    db.commit()
    db.refresh(user)
    return profile_read(db, user)


@router.get("/discover", response_model=list[DiscoverProfileRead])
def discover(
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
    limit: int = 30,
):
    rows = list_discover_profiles(db, user_id, limit=limit)
    out: list[DiscoverProfileRead] = []
    for other, score, reasons in rows:
        fc, fg = follow_counts(db, other.id)
        base = ProfileRead(
            id=other.id,
            name=other.name,
            bio=other.bio,
            photo_url=other.photo_url,
            city=other.city,
            created_at=other.created_at,
            updated_at=other.updated_at,
            follower_count=fc,
            following_count=fg,
        )
        out.append(
            DiscoverProfileRead(
                **base.model_dump(),
                compatibility_score=score,
                match_reasons=reasons,
                sports=sport_pref_read_list(other.sport_preferences),
            )
        )
    return out


@router.put("/me/sports", response_model=list[SportPreferenceRead])
def update_my_sports(
    sports: list[SportPreferenceWrite],
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
    user = db.get(UserProfile, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    db.execute(delete(SportPreference).where(SportPreference.user_id == user_id))
    for s in sports:
        db.add(
            SportPreference(
                user_id=user_id,
                sport=Sport(s.sport.value),
                skill_level=SkillLevel(s.skill_level.value),
                priority=SportPriority(s.priority.value),
                preferred_times=s.preferred_times,
                preferred_locations=s.preferred_locations,
            )
        )
    db.commit()
    user = load_profile(db, user_id)
    assert user
    return sport_pref_read_list(user.sport_preferences)


@router.get("/{user_id}", response_model=ProfileRead)
def get_profile(
    user_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
):
    user = load_profile(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile_read(db, user)


@router.get("/{user_id}/sports", response_model=list[SportPreferenceRead])
def get_user_sports(
    user_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
):
    user = load_profile(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return sport_pref_read_list(user.sport_preferences)


@router.get("/{user_id}/posts", response_model=list[PostRead])
def get_user_posts(
    user_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    viewer_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
    limit: int = 50,
):
    if not load_profile(db, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    stmt = (
        select(Post)
        .where(Post.user_id == user_id)
        .options(selectinload(Post.tags))
        .order_by(Post.created_at.desc())
        .limit(limit)
    )
    posts = list(db.scalars(stmt).unique().all())
    return [post_to_read(db, p, viewer_id) for p in posts]


@router.post("/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT)
def follow_user(
    user_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
    if user_id == current_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    target = db.get(UserProfile, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    existing = db.scalar(
        select(Follow).where(Follow.follower_id == current_id, Follow.following_id == user_id)
    )
    if not existing:
        db.add(Follow(follower_id=current_id, following_id=user_id))
        db.commit()
    return None


@router.delete("/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT)
def unfollow_user(
    user_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
    row = db.scalar(
        select(Follow).where(Follow.follower_id == current_id, Follow.following_id == user_id)
    )
    if row:
        db.delete(row)
        db.commit()
    return None


@router.get("/{user_id}/followers", response_model=list[ProfileRead])
def list_followers(
    user_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
):
    if not db.get(UserProfile, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    stmt = (
        select(UserProfile)
        .join(Follow, Follow.follower_id == UserProfile.id)
        .where(Follow.following_id == user_id)
    )
    users = list(db.scalars(stmt).unique().all())
    return [profile_read(db, u) for u in users]


@router.get("/{user_id}/following", response_model=list[ProfileRead])
def list_following(
    user_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
):
    if not db.get(UserProfile, user_id):
        raise HTTPException(status_code=404, detail="User not found")
    stmt = (
        select(UserProfile)
        .join(Follow, Follow.following_id == UserProfile.id)
        .where(Follow.follower_id == user_id)
    )
    users = list(db.scalars(stmt).unique().all())
    return [profile_read(db, u) for u in users]
