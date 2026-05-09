import uuid

from sqlalchemy import and_, not_, select
from sqlalchemy.orm import Session, selectinload

from app.models import SportPreference, Swipe, UserProfile
from app.models.enums import SkillLevel, SportPriority


SKILL_RANK = {
    SkillLevel.beginner: 0,
    SkillLevel.intermediate: 1,
    SkillLevel.advanced: 2,
}

PRIORITY_RANK = {
    SportPriority.high: 2,
    SportPriority.medium: 1,
    SportPriority.low: 0,
}


def _skill_similarity(a: SkillLevel, b: SkillLevel) -> int:
    return max(0, 3 - abs(SKILL_RANK[a] - SKILL_RANK[b]))


def _priority_bonus(a: SportPriority, b: SportPriority) -> int:
    if a == b:
        return PRIORITY_RANK[a] + 1
    return 0


def _time_overlap(times_a: list | None, times_b: list | None) -> int:
    if not times_a or not times_b:
        return 0
    sa, sb = set(times_a), set(times_b)
    return len(sa & sb) * 2


def _location_overlap(locs_a: list | None, locs_b: list | None, city_a: str | None, city_b: str | None) -> int:
    score = 0
    if city_a and city_b and city_a.strip().lower() == city_b.strip().lower():
        score += 15
    if locs_a and locs_b:
        la = {str(x).lower() for x in locs_a}
        lb = {str(x).lower() for x in locs_b}
        score += len(la & lb) * 5
    return score


def compute_compatibility(
    me: UserProfile,
    other: UserProfile,
) -> tuple[int, list[str]]:
    my_sports: dict = {p.sport: p for p in (me.sport_preferences or [])}
    their_sports: dict = {p.sport: p for p in (other.sport_preferences or [])}
    shared = set(my_sports.keys()) & set(their_sports.keys())
    reasons: list[str] = []

    if not shared:
        base = 20
        return base, ["new player nearby"]

    score = 25
    for sport in shared:
        mp, tp = my_sports[sport], their_sports[sport]
        score += 20
        reasons.append(f"both play {sport.value}")
        score += _skill_similarity(mp.skill_level, tp.skill_level) * 5
        score += _priority_bonus(mp.priority, tp.priority) * 4
        score += _time_overlap(mp.preferred_times, tp.preferred_times)
        score += _location_overlap(mp.preferred_locations, tp.preferred_locations, me.city, other.city)

    return min(100, score), reasons[:4]


def list_discover_profiles(
    db: Session,
    current_user_id: uuid.UUID,
    limit: int = 30,
) -> list[tuple[UserProfile, int, list[str]]]:
    me = db.scalar(
        select(UserProfile)
        .where(UserProfile.id == current_user_id)
        .options(selectinload(UserProfile.sport_preferences))
    )
    if not me:
        return []

    swiped_subq = select(Swipe.swiped_user_id).where(Swipe.swiper_id == current_user_id)
    stmt = (
        select(UserProfile)
        .where(and_(UserProfile.id != current_user_id, not_(UserProfile.id.in_(swiped_subq))))
        .options(selectinload(UserProfile.sport_preferences))
        .limit(limit * 2)
    )
    candidates = list(db.scalars(stmt).unique().all())

    scored: list[tuple[UserProfile, int, list[str]]] = []
    for other in candidates:
        s, reasons = compute_compatibility(me, other)
        scored.append((other, s, reasons))

    scored.sort(key=lambda x: -x[1])
    return scored[:limit]
