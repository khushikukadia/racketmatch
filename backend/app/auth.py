import uuid
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import UserProfile

security = HTTPBearer(auto_error=False)

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient | None:
    global _jwks_client
    if _jwks_client is not None:
        return _jwks_client
    url = settings.supabase_jwks_url
    if not url:
        return None
    _jwks_client = PyJWKClient(url, cache_keys=True, lifespan=3600)
    return _jwks_client


def _try_decode_hs256(token: str) -> dict | None:
    """Verify legacy Supabase JWTs (HS256 with shared secret)."""
    if not settings.supabase_jwt_secret:
        return None
    try:
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_exp": True},
        )
    except InvalidTokenError:
        try:
            return jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False, "verify_exp": True},
            )
        except InvalidTokenError:
            return None


def _try_decode_asymmetric(token: str) -> dict | None:
    """Verify modern Supabase JWTs (ES256/RS256/EdDSA via JWKS)."""
    client = _get_jwks_client()
    if client is None:
        return None
    try:
        signing_key = client.get_signing_key_from_jwt(token).key
    except Exception:
        return None
    for algs in (["ES256"], ["RS256"], ["EdDSA"], ["ES256", "RS256", "EdDSA"]):
        try:
            return jwt.decode(
                token,
                signing_key,
                algorithms=algs,
                audience="authenticated",
                options={"verify_exp": True},
            )
        except InvalidTokenError:
            continue
    try:
        return jwt.decode(
            token,
            signing_key,
            algorithms=["ES256", "RS256", "EdDSA"],
            options={"verify_aud": False, "verify_exp": True},
        )
    except InvalidTokenError:
        return None


def _decode_supabase_user_id(token: str) -> uuid.UUID:
    if not settings.supabase_jwt_secret and not settings.supabase_jwks_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No Supabase auth configured. Set SUPABASE_URL and/or SUPABASE_JWT_SECRET.",
        )

    try:
        header = jwt.get_unverified_header(token)
    except InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token header",
        ) from e

    alg = (header.get("alg") or "").upper()

    if alg == "HS256":
        payload = _try_decode_hs256(token) or _try_decode_asymmetric(token)
    else:
        payload = _try_decode_asymmetric(token) or _try_decode_hs256(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing sub")
    return uuid.UUID(sub)


def get_current_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> uuid.UUID:
    if settings.mock_auth_user_id:
        return uuid.UUID(settings.mock_auth_user_id)
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return _decode_supabase_user_id(credentials.credentials)


def get_current_profile(
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[uuid.UUID, Depends(get_current_user_id)],
) -> UserProfile:
    profile = db.get(UserProfile, user_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile
