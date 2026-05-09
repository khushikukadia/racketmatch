import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user_id
from app.database import get_db
from app.models import Match, SessionProposal, Sport
from app.models.enums import SessionProposalStatus
from app.schemas.proposals import ProposalCreate, ProposalRead, ProposalUpdate
from app.services.matching import get_match_for_user

router = APIRouter(tags=["proposals"])


@router.get("/matches/{match_id}/proposals", response_model=list[ProposalRead])
def list_proposals(
    match_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
    get_match_for_user(db, match_id, user_id)
    stmt = (
        select(SessionProposal)
        .where(SessionProposal.match_id == match_id)
        .order_by(SessionProposal.created_at.desc())
    )
    rows = list(db.scalars(stmt).all())
    return [ProposalRead.model_validate(p) for p in rows]


@router.post("/matches/{match_id}/proposals", response_model=ProposalRead)
def create_proposal(
    match_id: uuid.UUID,
    body: ProposalCreate,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
    get_match_for_user(db, match_id, user_id)
    prop = SessionProposal(
        match_id=match_id,
        proposed_by_id=user_id,
        sport=Sport(body.sport.value),
        proposed_time=body.proposed_time,
        location=body.location,
        status=SessionProposalStatus.proposed,
    )
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return ProposalRead.model_validate(prop)


@router.patch("/proposals/{proposal_id}", response_model=ProposalRead)
def update_proposal(
    proposal_id: uuid.UUID,
    body: ProposalUpdate,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
    prop = db.get(SessionProposal, proposal_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Proposal not found")
    get_match_for_user(db, prop.match_id, user_id)
    prop.status = SessionProposalStatus(body.status.value)
    db.commit()
    db.refresh(prop)
    return ProposalRead.model_validate(prop)
