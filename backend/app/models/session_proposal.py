import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import SessionProposalStatus, Sport

if TYPE_CHECKING:
    from app.models.match import Match
    from app.models.user_profile import UserProfile


class SessionProposal(Base):
    __tablename__ = "session_proposals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False
    )
    proposed_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False
    )
    sport: Mapped[Sport] = mapped_column(Enum(Sport, name="sport_enum", native_enum=False), nullable=False)
    proposed_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[SessionProposalStatus] = mapped_column(
        Enum(SessionProposalStatus, name="session_proposal_status_enum", native_enum=False),
        nullable=False,
        default=SessionProposalStatus.proposed,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    match: Mapped["Match"] = relationship("Match", back_populates="proposals")
    proposer: Mapped["UserProfile"] = relationship("UserProfile", back_populates="proposals")
