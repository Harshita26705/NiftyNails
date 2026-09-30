from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession, OptionalUser
from app.core.config import get_settings
from app.core.rate_limit import auth_limiter
from app.core.security import create_access_token, hash_password, verify_password
from app.models import Role, User
from app.models.enums import RoleName
from app.schemas.auth import AuthOut, LoginIn, PasswordChangeIn, ProfileUpdateIn, RegisterIn, UserOut
from app.schemas.common import Message

router = APIRouter(prefix="/auth", tags=["auth"])

# Equalise timing between "unknown email" and "wrong password".
_DUMMY_HASH = hash_password("timing-equaliser-password-1")


def _issue_session(response: Response, user: User) -> AuthOut:
    settings = get_settings()
    token = create_access_token(user.id, user.role_name, user.token_version)
    response.set_cookie(
        settings.session_cookie_name,
        token,
        max_age=settings.access_token_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    return AuthOut(user=UserOut.model_validate(user), access_token=token)


@router.post("/register", response_model=AuthOut, status_code=201, dependencies=[Depends(auth_limiter)])
def register(data: RegisterIn, response: Response, db: DbSession) -> AuthOut:
    email = data.email.lower()
    if db.scalar(select(User).where(func.lower(User.email) == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists — try signing in.")
    role = db.scalar(select(Role).where(Role.name == RoleName.CUSTOMER))
    if role is None:
        role = Role(name=RoleName.CUSTOMER, description="Shopper")
        db.add(role)
        db.flush()
    user = User(email=email, password_hash=hash_password(data.password), full_name=data.full_name,
                phone=data.phone, role_id=role.id, last_login_at=datetime.now(UTC))
    db.add(user)
    db.commit()
    db.refresh(user)
    return _issue_session(response, user)


@router.post("/login", response_model=AuthOut, dependencies=[Depends(auth_limiter)])
def login(data: LoginIn, response: Response, db: DbSession) -> AuthOut:
    user = db.scalar(select(User).where(func.lower(User.email) == data.email.lower()))
    valid = verify_password(data.password, user.password_hash if user else _DUMMY_HASH)
    if not user or not valid or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "That email and password don't match.")
    user.last_login_at = datetime.now(UTC)
    db.commit()
    return _issue_session(response, user)


@router.post("/logout", response_model=Message)
def logout(response: Response) -> Message:
    response.delete_cookie(get_settings().session_cookie_name, path="/")
    return Message(message="Signed out")


@router.post("/logout-all", response_model=Message)
def logout_everywhere(user: CurrentUser, response: Response, db: DbSession) -> Message:
    user.token_version += 1
    db.commit()
    response.delete_cookie(get_settings().session_cookie_name, path="/")
    return Message(message="Signed out on all devices")


@router.get("/session")
def session(user: OptionalUser) -> dict:
    """Like /me but never 401s — lets the storefront check sign-in state quietly."""
    return {"user": UserOut.model_validate(user).model_dump(mode="json") if user else None}


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> User:
    return user


@router.patch("/me", response_model=UserOut)
def update_profile(data: ProfileUpdateIn, user: CurrentUser, db: DbSession) -> User:
    if data.full_name is not None:
        user.full_name = data.full_name.strip()
    if data.phone is not None:
        user.phone = data.phone.strip() or None
    db.commit()
    return user


@router.post("/change-password", response_model=AuthOut, dependencies=[Depends(auth_limiter)])
def change_password(data: PasswordChangeIn, user: CurrentUser, response: Response, db: DbSession) -> AuthOut:
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Your current password is incorrect.")
    RegisterIn.model_validate({"email": user.email, "password": data.new_password, "full_name": user.full_name})
    user.password_hash = hash_password(data.new_password)
    user.token_version += 1  # revoke other sessions
    db.commit()
    return _issue_session(response, user)
