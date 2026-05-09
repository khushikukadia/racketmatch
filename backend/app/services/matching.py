import uuid

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import Match, Swipe, SwipeDirection


def ordered_pair(a: uuid.UUID, b: uuid.UUID) -> tuple[uuid.UUID, uuid.UUID]:
    if a < b:
        return a, b
    return b, a


def create_match_if_mutual(
    db: Session,
    swiper_id: uuid.UUID,
    swiped_user_id: uuid.UUID,
) -> Match | None:
    reciprocal = db.scalar(
        select(Swipe).where(
            Swipe.swiper_id == swiped_user_id,
            Swipe.swiped_user_id == swiper_id,
            Swipe.direction == SwipeDirection.like,
        )
    )
    if not reciprocal:
        return None
    a, b = ordered_pair(swiper_id, swiped_user_id)
    existing = db.scalar(select(Match).where(Match.user_a_id == a, Match.user_b_id == b))
    if existing:
        return existing
    match = Match(user_a_id=a, user_b_id=b)
    db.add(match)
    db.flush()
    return match


def get_other_user_id(match: Match, current_user_id: uuid.UUID) -> uuid.UUID:
    if match.user_a_id == current_user_id:
        return match.user_b_id
    if match.user_b_id == current_user_id:
        return match.user_a_id
    raise ValueError("User is not part of this match")


def get_match_for_user(db: Session, match_id: uuid.UUID, user_id: uuid.UUID) -> Match:
    m = db.scalar(
        select(Match)
        .where(Match.id == match_id)
        .where(or_(Match.user_a_id == user_id, Match.user_b_id == user_id))
    )
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    return m
