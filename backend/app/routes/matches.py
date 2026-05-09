import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_user_id
from app.database import get_db
from app.models import Match, Message
from app.schemas.matches import MatchRead, MatchWithPreviewRead, MessageCreate, MessageRead
from app.services.matching import get_match_for_user, get_other_user_id
from app.services.profiles import load_profile, profile_read

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("", response_model=list[MatchWithPreviewRead])
def list_matches(
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
    stmt = (
        select(Match)
        .where(or_(Match.user_a_id == user_id, Match.user_b_id == user_id))
        .options(selectinload(Match.messages))
        .order_by(Match.created_at.desc())
    )
    matches = list(db.scalars(stmt).unique().all())
    out: list[MatchWithPreviewRead] = []
    for m in matches:
        other_id = get_other_user_id(m, user_id)
        other = load_profile(db, other_id)
        if not other:
            continue
        last = None
        if m.messages:
            last = max(m.messages, key=lambda x: x.created_at)
        out.append(
            MatchWithPreviewRead(
                match=MatchRead.model_validate(m),
                other_user=profile_read(db, other),
                last_message_preview=last.body[:120] if last else None,
                last_message_at=last.created_at if last else None,
            )
        )
    return out


@router.get("/{match_id}", response_model=MatchRead)
def get_match(
    match_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
    return MatchRead.model_validate(get_match_for_user(db, match_id, user_id))


@router.get("/{match_id}/messages", response_model=list[MessageRead])
def list_messages(
    match_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
    get_match_for_user(db, match_id, user_id)
    stmt = (
        select(Message)
        .where(Message.match_id == match_id)
        .order_by(Message.created_at.asc())
    )
    rows = list(db.scalars(stmt).all())
    return [MessageRead.model_validate(x) for x in rows]


@router.post("/{match_id}/messages", response_model=MessageRead)
def send_message(
    match_id: uuid.UUID,
    body: MessageCreate,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
    get_match_for_user(db, match_id, user_id)
    msg = Message(match_id=match_id, sender_id=user_id, body=body.body)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return MessageRead.model_validate(msg)
