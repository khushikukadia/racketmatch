"""
Seed demo data alongside your real Supabase user.

Run from backend/:
    python scripts/seed.py

What it does:
- Creates 8 mock users with deterministic UUIDs (11111111-1111-1111-1111-00000000000N).
- Wipes prior data tied to those mock users only. Your real Supabase profile
  and its data are left untouched.
- If a real user profile already exists in the DB (i.e. you ran the app and
  saved your onboarding profile), some of the mock users will:
    * already swipe-LIKE you, so swiping right on them creates an instant match
    * already be matched with you and have a few seeded messages
    * tag you in their feed posts and follow you
- Re-running the script is idempotent.

Optionally pin which real user gets the demo wiring:
    DEMO_REAL_USER_ID=<uuid> python scripts/seed.py
"""

from __future__ import annotations

import os
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import delete, select, or_
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    Comment,
    Follow,
    Like,
    Match,
    Message,
    Post,
    PostTag,
    SessionProposal,
    SessionProposalStatus,
    SkillLevel,
    Sport,
    SportPreference,
    SportPriority,
    Swipe,
    SwipeDirection,
    UserProfile,
)
from app.services.matching import ordered_pair


SEED_UIDS: list[uuid.UUID] = [
    uuid.UUID(f"11111111-1111-1111-1111-00000000000{i}") for i in range(1, 9)
]
SEED_NAMES = [
    "Alex Rivera",
    "Jordan Kim",
    "Sam Patel",
    "Riley Chen",
    "Casey Lopez",
    "Morgan Blake",
    "Taylor Nguyen",
    "Jamie Ortiz",
]
SEED_BIOS = [
    "Tennis 4x/week, looking for hitting partners with consistent groundstrokes.",
    "Squash addict. Drop shots > everything.",
    "Pickleball convert from tennis. Always down for stack rotations.",
    "Weekend warrior. Bring snacks.",
    "Played D1 in college, now just trying to stay sharp.",
    "Beginner-friendly! Happy to rally and warm up slow.",
    "Doubles only. Comms over court coverage.",
    "Singles grinder. Looking for someone with a heavy topspin forehand.",
]
CITIES = ["San Francisco", "Oakland", "Berkeley", "Palo Alto", "San Jose"]
SPORTS_CYCLE = [Sport.tennis, Sport.squash, Sport.pickleball]
TIMES_OPTS = [
    ["morning", "evening"],
    ["afternoon", "weekends"],
    ["night"],
    ["morning", "afternoon", "weekends"],
]


def clear_seed(session: Session) -> None:
    """Delete only data that involves a seed UUID. Leaves real users alone."""
    seed_set = SEED_UIDS

    session.execute(
        delete(Like).where(Like.user_id.in_(seed_set))
    )
    session.execute(
        delete(Comment).where(Comment.user_id.in_(seed_set))
    )
    session.execute(
        delete(PostTag).where(PostTag.tagged_user_id.in_(seed_set))
    )

    seed_post_ids = list(
        session.scalars(select(Post.id).where(Post.user_id.in_(seed_set))).all()
    )
    if seed_post_ids:
        session.execute(delete(Like).where(Like.post_id.in_(seed_post_ids)))
        session.execute(delete(Comment).where(Comment.post_id.in_(seed_post_ids)))
        session.execute(delete(PostTag).where(PostTag.post_id.in_(seed_post_ids)))
        session.execute(delete(Post).where(Post.id.in_(seed_post_ids)))

    seed_match_ids = list(
        session.scalars(
            select(Match.id).where(
                or_(Match.user_a_id.in_(seed_set), Match.user_b_id.in_(seed_set))
            )
        ).all()
    )
    if seed_match_ids:
        session.execute(delete(Message).where(Message.match_id.in_(seed_match_ids)))
        session.execute(
            delete(SessionProposal).where(SessionProposal.match_id.in_(seed_match_ids))
        )
        session.execute(delete(Match).where(Match.id.in_(seed_match_ids)))

    session.execute(
        delete(Swipe).where(
            or_(Swipe.swiper_id.in_(seed_set), Swipe.swiped_user_id.in_(seed_set))
        )
    )
    session.execute(
        delete(Follow).where(
            or_(Follow.follower_id.in_(seed_set), Follow.following_id.in_(seed_set))
        )
    )
    session.execute(delete(SportPreference).where(SportPreference.user_id.in_(seed_set)))
    session.execute(delete(UserProfile).where(UserProfile.id.in_(seed_set)))

    session.commit()


def find_real_user(session: Session) -> UserProfile | None:
    pinned = os.getenv("DEMO_REAL_USER_ID")
    if pinned:
        return session.get(UserProfile, uuid.UUID(pinned))
    candidates = list(
        session.scalars(
            select(UserProfile)
            .where(~UserProfile.id.in_(SEED_UIDS))
            .order_by(UserProfile.created_at.desc())
        ).all()
    )
    if not candidates:
        return None
    if len(candidates) > 1:
        print(
            f"[seed] Multiple non-seed users found, using newest: {candidates[0].id} "
            f"({candidates[0].name}). Set DEMO_REAL_USER_ID to override."
        )
    return candidates[0]


def main() -> None:
    random.seed(7)
    session = SessionLocal()
    try:
        clear_seed(session)

        real = find_real_user(session)

        profiles: list[UserProfile] = []
        for i, uid in enumerate(SEED_UIDS):
            p = UserProfile(
                id=uid,
                name=SEED_NAMES[i],
                bio=SEED_BIOS[i],
                photo_url=f"https://picsum.photos/seed/{uid}/400/400",
                city=CITIES[i % len(CITIES)],
            )
            session.add(p)
            profiles.append(p)
        session.flush()

        for i, p in enumerate(profiles):
            primary = SPORTS_CYCLE[i % 3]
            session.add(
                SportPreference(
                    user_id=p.id,
                    sport=primary,
                    skill_level=random.choice(list(SkillLevel)),
                    priority=SportPriority.high,
                    preferred_times=TIMES_OPTS[i % len(TIMES_OPTS)],
                    preferred_locations=[f"{p.city} Courts", "Downtown Athletic Club"],
                )
            )
            secondary = SPORTS_CYCLE[(i + 1) % 3]
            if i % 3 != 0:
                session.add(
                    SportPreference(
                        user_id=p.id,
                        sport=secondary,
                        skill_level=SkillLevel.intermediate,
                        priority=SportPriority.medium,
                        preferred_times=["weekends"],
                        preferred_locations=[p.city or "Local"],
                    )
                )
        session.flush()

        for i in range(len(profiles)):
            for j in range(i + 1, len(profiles)):
                if random.random() > 0.55:
                    continue
                a, b = profiles[i].id, profiles[j].id
                if random.random() > 0.5:
                    session.add(Swipe(swiper_id=a, swiped_user_id=b, direction=SwipeDirection.like))
                    if random.random() > 0.4:
                        session.add(
                            Swipe(swiper_id=b, swiped_user_id=a, direction=SwipeDirection.like)
                        )
                else:
                    session.add(
                        Swipe(swiper_id=a, swiped_user_id=b, direction=SwipeDirection.pass_)
                    )
        session.flush()

        pairs_seen: set[tuple[uuid.UUID, uuid.UUID]] = set()
        swipes = list(
            session.scalars(
                select(Swipe).where(
                    Swipe.swiper_id.in_(SEED_UIDS),
                    Swipe.swiped_user_id.in_(SEED_UIDS),
                )
            ).all()
        )
        for s1 in swipes:
            if s1.direction != SwipeDirection.like:
                continue
            reciprocal = session.scalar(
                select(Swipe).where(
                    Swipe.swiper_id == s1.swiped_user_id,
                    Swipe.swiped_user_id == s1.swiper_id,
                    Swipe.direction == SwipeDirection.like,
                )
            )
            if not reciprocal:
                continue
            pair = ordered_pair(s1.swiper_id, s1.swiped_user_id)
            if pair in pairs_seen:
                continue
            pairs_seen.add(pair)
            session.add(Match(user_a_id=pair[0], user_b_id=pair[1]))
        session.flush()

        mock_matches = list(
            session.scalars(
                select(Match).where(
                    Match.user_a_id.in_(SEED_UIDS),
                    Match.user_b_id.in_(SEED_UIDS),
                )
            ).all()
        )
        for m in mock_matches:
            sid = random.choice([m.user_a_id, m.user_b_id])
            other = m.user_b_id if sid == m.user_a_id else m.user_a_id
            session.add(
                Message(
                    match_id=m.id,
                    sender_id=sid,
                    body=random.choice(
                        [
                            "Hey! Want to hit this week?",
                            "Great match last time!",
                            "I'm free Saturday morning.",
                        ]
                    ),
                )
            )
            session.add(
                Message(
                    match_id=m.id,
                    sender_id=other,
                    body=random.choice(
                        ["Let's do it!", "Sounds good.", "I'll check my calendar."]
                    ),
                )
            )

        if mock_matches:
            m = mock_matches[0]
            session.add(
                SessionProposal(
                    match_id=m.id,
                    proposed_by_id=m.user_a_id,
                    sport=Sport.tennis,
                    proposed_time=datetime.now(timezone.utc) + timedelta(days=3),
                    location="City Sports Club",
                    status=SessionProposalStatus.proposed,
                )
            )

        now = datetime.now(timezone.utc)
        for idx, p in enumerate(profiles[:6]):
            po = Post(
                user_id=p.id,
                sport=SPORTS_CYCLE[idx % 3],
                caption=f"Solid session today: {SPORTS_CYCLE[idx % 3].value} with friends.",
                location=p.city,
                image_url=f"https://picsum.photos/seed/post{idx}/600/400",
                played_at=now - timedelta(days=idx),
            )
            session.add(po)
            session.flush()
            tag_pool = [q for q in profiles if q.id != p.id][:2]
            for o in tag_pool:
                session.add(PostTag(post_id=po.id, tagged_user_id=o.id))
            liker = random.choice(profiles)
            session.add(Like(post_id=po.id, user_id=liker.id))
            commenter = random.choice(profiles)
            session.add(
                Comment(
                    post_id=po.id,
                    user_id=commenter.id,
                    body=random.choice(["Nice!", "Let's run it back.", "Great rally!"]),
                )
            )

        for _ in range(4):
            a, b = random.sample(profiles, 2)
            if a.id == b.id:
                continue
            exists = session.scalar(
                select(Follow).where(Follow.follower_id == a.id, Follow.following_id == b.id)
            )
            if not exists:
                session.add(Follow(follower_id=a.id, following_id=b.id))

        if real is not None:
            ready_to_match = profiles[:3]
            for p in ready_to_match:
                session.add(
                    Swipe(
                        swiper_id=p.id,
                        swiped_user_id=real.id,
                        direction=SwipeDirection.like,
                    )
                )

            already = profiles[3]
            session.add(
                Swipe(swiper_id=already.id, swiped_user_id=real.id, direction=SwipeDirection.like)
            )
            session.add(
                Swipe(swiper_id=real.id, swiped_user_id=already.id, direction=SwipeDirection.like)
            )
            pair = ordered_pair(already.id, real.id)
            existing_match = session.scalar(
                select(Match).where(Match.user_a_id == pair[0], Match.user_b_id == pair[1])
            )
            match_with_real = existing_match or Match(user_a_id=pair[0], user_b_id=pair[1])
            if not existing_match:
                session.add(match_with_real)
                session.flush()
            session.add(
                Message(
                    match_id=match_with_real.id,
                    sender_id=already.id,
                    body=f"Hey {real.name.split()[0]}! Up for a hit this weekend?",
                )
            )
            session.add(
                Message(
                    match_id=match_with_real.id,
                    sender_id=already.id,
                    body="I usually play at 9am Saturdays. Does that work?",
                )
            )

            for tagger in profiles[4:6]:
                po = Post(
                    user_id=tagger.id,
                    sport=Sport.tennis,
                    caption=f"Great session with @{real.name.split()[0]}",
                    location=tagger.city,
                    image_url=f"https://picsum.photos/seed/withreal{tagger.id}/600/400",
                    played_at=now - timedelta(hours=6),
                )
                session.add(po)
                session.flush()
                session.add(PostTag(post_id=po.id, tagged_user_id=real.id))

            for follower in profiles[:2]:
                session.add(Follow(follower_id=follower.id, following_id=real.id))

        session.commit()

        print("Seed complete.")
        print(f"  {len(profiles)} mock users")
        if real is not None:
            print(f"  Wired to real user: {real.id} ({real.name})")
            print("  - 3 mocks already liked you (right-swipe them for instant match)")
            print(f"  - 1 mock ({profiles[3].name}) is already matched + has messages waiting")
            print("  - 2 posts tag you, 2 mocks follow you")
        else:
            print("  No real user found yet. Sign in & save onboarding, then re-run this script")
            print("  to wire some mocks to your account.")
        print("Mock user IDs:")
        for uid, name in zip(SEED_UIDS, SEED_NAMES, strict=True):
            print(f"  {uid}  {name}")
    finally:
        session.close()


if __name__ == "__main__":
    main()
