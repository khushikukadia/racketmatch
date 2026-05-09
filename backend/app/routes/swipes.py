import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user_id
from app.database import get_db
from app.models import Swipe, SwipeDirection, UserProfile
from app.schemas.swipes import SwipeCreate, SwipeResult
from app.services.matching import create_match_if_mutual

router = APIRouter(prefix="/swipes", tags=["swipes"])


@router.post("", response_model=SwipeResult)
def record_swipe(
    body: SwipeCreate,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
    if body.swiped_user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot swipe yourself")
    if not db.get(UserProfile, body.swiped_user_id):
        raise HTTPException(status_code=404, detail="User not found")

    direction = SwipeDirection.like if body.direction == "like" else SwipeDirection.pass_

    existing = db.scalar(
        select(Swipe).where(Swipe.swiper_id == user_id, Swipe.swiped_user_id == body.swiped_user_id)
    )
    if existing:
        existing.direction = direction
    else:
        db.add(Swipe(swiper_id=user_id, swiped_user_id=body.swiped_user_id, direction=direction))
    db.flush()

    match_row = None
    if direction == SwipeDirection.like:
        match_row = create_match_if_mutual(db, user_id, body.swiped_user_id)
    db.commit()

    return SwipeResult(
        recorded=True,
        matched=match_row is not None,
        match_id=match_row.id if match_row else None,
    )
