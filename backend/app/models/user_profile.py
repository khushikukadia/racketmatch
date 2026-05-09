import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.follow import Follow
    from app.models.match import Match
    from app.models.message import Message
    from app.models.post import Comment, Like, Post, PostTag
    from app.models.session_proposal import SessionProposal
    from app.models.sport_preference import SportPreference
    from app.models.swipe import Swipe


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    sport_preferences: Mapped[list["SportPreference"]] = relationship(
        "SportPreference", back_populates="user", cascade="all, delete-orphan"
    )
    swipes_made: Mapped[list["Swipe"]] = relationship(
        "Swipe", foreign_keys="Swipe.swiper_id", back_populates="swiper"
    )
    swipes_received: Mapped[list["Swipe"]] = relationship(
        "Swipe", foreign_keys="Swipe.swiped_user_id", back_populates="swiped_user"
    )
    matches_as_a: Mapped[list["Match"]] = relationship(
        "Match", foreign_keys="Match.user_a_id", back_populates="user_a"
    )
    matches_as_b: Mapped[list["Match"]] = relationship(
        "Match", foreign_keys="Match.user_b_id", back_populates="user_b"
    )
    messages: Mapped[list["Message"]] = relationship("Message", back_populates="sender")
    proposals: Mapped[list["SessionProposal"]] = relationship(
        "SessionProposal", back_populates="proposer"
    )
    posts: Mapped[list["Post"]] = relationship("Post", back_populates="author")
    post_tags: Mapped[list["PostTag"]] = relationship("PostTag", back_populates="tagged_user")
    likes: Mapped[list["Like"]] = relationship("Like", back_populates="user")
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="user")

    following: Mapped[list["Follow"]] = relationship(
        "Follow", foreign_keys="Follow.follower_id", back_populates="follower"
    )
    followers: Mapped[list["Follow"]] = relationship(
        "Follow", foreign_keys="Follow.following_id", back_populates="following_user"
    )
