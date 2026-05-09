import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Comment, Like, Post
from app.schemas.common import SportEnum
from app.schemas.feed import PostRead, TaggedUserBrief
from app.services.profiles import load_profile, profile_read


def post_to_read(db: Session, post: Post, viewer_id: uuid.UUID) -> PostRead:
    author = load_profile(db, post.user_id)
    like_count = db.scalar(select(func.count()).select_from(Like).where(Like.post_id == post.id)) or 0
    comment_count = (
        db.scalar(select(func.count()).select_from(Comment).where(Comment.post_id == post.id)) or 0
    )
    liked = db.scalar(
        select(Like).where(Like.post_id == post.id, Like.user_id == viewer_id)
    ) is not None
    tagged: list[TaggedUserBrief] = []
    for t in post.tags or []:
        u = load_profile(db, t.tagged_user_id)
        if u:
            tagged.append(TaggedUserBrief(id=u.id, name=u.name, photo_url=u.photo_url))
    return PostRead(
        id=post.id,
        user_id=post.user_id,
        author=profile_read(db, author) if author else None,
        sport=SportEnum(post.sport.value),
        caption=post.caption,
        location=post.location,
        image_url=post.image_url,
        played_at=post.played_at,
        created_at=post.created_at,
        like_count=int(like_count),
        comment_count=int(comment_count),
        liked_by_me=liked,
        tagged_users=tagged,
    )


def load_post_with_tags(db: Session, post_id: uuid.UUID) -> Post | None:
    return db.scalar(select(Post).where(Post.id == post_id).options(selectinload(Post.tags)))
