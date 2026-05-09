import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.message import Message
    from app.models.session_proposal import SessionProposal
    from app.models.user_profile import UserProfile


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (UniqueConstraint("user_a_id", "user_b_id", name="uq_match_pair"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_a_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False
    )
    user_b_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user_a: Mapped["UserProfile"] = relationship(
        "UserProfile", foreign_keys=[user_a_id], back_populates="matches_as_a"
    )
    user_b: Mapped["UserProfile"] = relationship(
        "UserProfile", foreign_keys=[user_b_id], back_populates="matches_as_b"
    )
    messages: Mapped[list["Message"]] = relationship("Message", back_populates="match", cascade="all, delete-orphan")
    proposals: Mapped[list["SessionProposal"]] = relationship(
        "SessionProposal", back_populates="match", cascade="all, delete-orphan"
    )
