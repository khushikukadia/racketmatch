import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_user_id
from app.database import get_db
from app.models import Comment, Like, Post, PostTag, Sport, UserProfile
from app.schemas.feed import CommentCreate, CommentRead, PostCreate, PostRead
from app.services.feed_items import load_post_with_tags, post_to_read
from app.services.profiles import load_profile, profile_read

router = APIRouter(tags=["feed"])


@router.get("/feed", response_model=list[PostRead])
def get_feed(
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
    limit: int = 50,
):
    stmt = (
        select(Post)
        .options(selectinload(Post.tags))
        .order_by(Post.created_at.desc())
        .limit(limit)
    )
    posts = list(db.scalars(stmt).unique().all())
    return [post_to_read(db, p, user_id) for p in posts]


@router.post("/posts", response_model=PostRead)
def create_post(
    body: PostCreate,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
    post = Post(
        user_id=user_id,
        sport=Sport(body.sport.value),
        caption=body.caption,
        location=body.location,
        image_url=body.image_url,
        played_at=body.played_at,
    )
    db.add(post)
    db.flush()
    for tid in body.tagged_user_ids:
        if tid == user_id:
            continue
        if db.get(UserProfile, tid):
            db.add(PostTag(post_id=post.id, tagged_user_id=tid))
    db.commit()
    db.refresh(post)
    post = load_post_with_tags(db, post.id)
    assert post
    return post_to_read(db, post, user_id)


@router.get("/posts/{post_id}", response_model=PostRead)
def get_post(
    post_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
    post = load_post_with_tags(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post_to_read(db, post, user_id)


@router.post("/posts/{post_id}/like", status_code=204)
def like_post(
    post_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
    if not db.get(Post, post_id):
        raise HTTPException(status_code=404, detail="Post not found")
    exists = db.scalar(select(Like).where(Like.post_id == post_id, Like.user_id == user_id))
    if not exists:
        db.add(Like(post_id=post_id, user_id=user_id))
        db.commit()
    return None


@router.delete("/posts/{post_id}/like", status_code=204)
def unlike_post(
    post_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
    row = db.scalar(select(Like).where(Like.post_id == post_id, Like.user_id == user_id))
    if row:
        db.delete(row)
        db.commit()
    return None


@router.post("/posts/{post_id}/comments", response_model=CommentRead)
def add_comment(
    post_id: uuid.UUID,
    body: CommentCreate,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
    if not db.get(Post, post_id):
        raise HTTPException(status_code=404, detail="Post not found")
    c = Comment(post_id=post_id, user_id=user_id, body=body.body)
    db.add(c)
    db.commit()
    db.refresh(c)
    author = load_profile(db, user_id)
    return CommentRead(
        id=c.id,
        post_id=c.post_id,
        user_id=c.user_id,
        author=profile_read(db, author) if author else None,
        body=c.body,
        created_at=c.created_at,
    )


@router.get("/posts/{post_id}/comments", response_model=list[CommentRead])
def list_comments(
    post_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
):
    if not db.get(Post, post_id):
        raise HTTPException(status_code=404, detail="Post not found")
    stmt = select(Comment).where(Comment.post_id == post_id).order_by(Comment.created_at.asc())
    rows = list(db.scalars(stmt).all())
    out: list[CommentRead] = []
    for c in rows:
        author = load_profile(db, c.user_id)
        out.append(
            CommentRead(
                id=c.id,
                post_id=c.post_id,
                user_id=c.user_id,
                author=profile_read(db, author) if author else None,
                body=c.body,
                created_at=c.created_at,
            )
        )
    return out

