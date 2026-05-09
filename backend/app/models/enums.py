import enum


class Sport(str, enum.Enum):
    squash = "squash"
    tennis = "tennis"
    pickleball = "pickleball"


class SkillLevel(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class SportPriority(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"


class SwipeDirection(str, enum.Enum):
    like = "like"
    pass_ = "pass"


class SessionProposalStatus(str, enum.Enum):
    proposed = "proposed"
    accepted = "accepted"
    declined = "declined"
    completed = "completed"
