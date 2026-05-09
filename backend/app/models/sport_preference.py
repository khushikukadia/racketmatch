import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import SkillLevel, Sport, SportPriority

if TYPE_CHECKING:
    from app.models.user_profile import UserProfile


class SportPreference(Base):
    __tablename__ = "sport_preferences"
    __table_args__ = (UniqueConstraint("user_id", "sport", name="uq_user_sport"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False
    )
    sport: Mapped[Sport] = mapped_column(Enum(Sport, name="sport_enum", native_enum=False), nullable=False)
    skill_level: Mapped[SkillLevel] = mapped_column(
        Enum(SkillLevel, name="skill_level_enum", native_enum=False), nullable=False
    )
    priority: Mapped[SportPriority] = mapped_column(
        Enum(SportPriority, name="sport_priority_enum", native_enum=False), nullable=False
    )
    preferred_times: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    preferred_locations: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)

    user: Mapped["UserProfile"] = relationship("UserProfile", back_populates="sport_preferences")
