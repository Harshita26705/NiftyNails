"""Authentication / authorisation dependencies.

Sessions are JWTs in an httpOnly cookie (same-origin via the Next.js proxy). A Bearer header
is also accepted so the API is usable from tools and future native apps.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User
from app.models.enums import RoleName

DbSession = Annotated[Session, Depends(get_db)]


def _extract_token(request: Request) -> str | None:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return request.cookies.get(get_settings().session_cookie_name)


def get_optional_user(request: Request, db: DbSession) -> User | None:
    token = _extract_token(request)
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    try:
        user_id = int(payload["sub"])
    except (KeyError, ValueError):
        return None
    user = db.get(User, user_id)
    # token_version check means logout / password change revokes old tokens.
    if not user or not user.is_active or user.token_version != payload.get("tv"):
        return None
    return user


OptionalUser = Annotated[User | None, Depends(get_optional_user)]


def get_current_user(user: OptionalUser) -> User:
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please sign in to continue.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: RoleName):
    allowed = {r.value for r in roles}

    def checker(user: CurrentUser) -> User:
        if user.role_name not in allowed:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You don't have access to this area.")
        return user

    return checker


# Staff can run day-to-day operations; only admins change pricing, settings and roles.
require_admin = require_roles(RoleName.ADMIN, RoleName.STAFF)
require_owner = require_roles(RoleName.ADMIN)
AdminUser = Annotated[User, Depends(require_admin)]
OwnerUser = Annotated[User, Depends(require_owner)]
