from datetime import datetime, timedelta, timezone
import hashlib
import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from models.user import User
from models.session import UserSession


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/token"
)


# =========================================================
# LOGIN SECURITY SETTINGS
# =========================================================

MAX_LOGIN_ATTEMPTS = 5
LOGIN_LOCKOUT_MINUTES = 15

PASSWORD_RESET_EXPIRE_MINUTES = 30


# =========================================================
# PASSWORD HASHING
# =========================================================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    return pwd_context.verify(
        plain_password,
        hashed_password,
    )


# =========================================================
# LOGIN SECURITY
# =========================================================

def is_account_locked(user: User) -> bool:
    """Return True if the user's account is currently locked."""
    if user.locked_until is None:
        return False

    now = datetime.now(timezone.utc)
    locked_until = user.locked_until

    if locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)

    return locked_until > now


def register_failed_login(user: User) -> bool:
    """Register a failed login attempt and lock after 5 failures."""
    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1

    if user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS:
        user.failed_login_attempts = 0
        user.locked_until = (
            datetime.now(timezone.utc)
            + timedelta(minutes=LOGIN_LOCKOUT_MINUTES)
        )
        return True

    return False


def reset_failed_login_attempts(user: User) -> None:
    """Reset failed-login tracking after successful login."""
    user.failed_login_attempts = 0
    user.locked_until = None


def clear_expired_login_lock(user: User) -> None:
    """Clear an expired login lock and its failed-attempt counter."""
    if user.locked_until is None:
        return

    now = datetime.now(timezone.utc)
    locked_until = user.locked_until

    if locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)

    if locked_until <= now:
        user.locked_until = None
        user.failed_login_attempts = 0


def get_lockout_remaining_minutes(user: User) -> int:
    """Return approximately how many minutes remain in the lockout."""
    if user.locked_until is None:
        return 0

    now = datetime.now(timezone.utc)
    locked_until = user.locked_until

    if locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)

    remaining_seconds = (locked_until - now).total_seconds()

    if remaining_seconds <= 0:
        return 0

    return max(1, int((remaining_seconds + 59) // 60))


# =========================================================
# PASSWORD RESET TOKEN
# =========================================================

def generate_password_reset_token() -> str:
    """Generate a cryptographically secure random token."""
    return secrets.token_urlsafe(32)


def hash_reset_token(token: str) -> str:
    """Hash a password-reset token before storing it."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def is_reset_token_expired(user: User) -> bool:
    """Check whether the stored reset token has expired."""
    if user.password_reset_expires_at is None:
        return True

    now = datetime.now(timezone.utc)
    expires_at = user.password_reset_expires_at

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    return expires_at <= now


def create_password_reset_expiry() -> datetime:
    """Create the expiry timestamp for a new reset token."""
    return (
        datetime.now(timezone.utc)
        + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES)
    )


# =========================================================
# ACCESS & REFRESH JWT TOKENS
# =========================================================

def create_access_token(data: dict) -> str:
    to_encode = data.copy()

    expire = (
        datetime.now(timezone.utc)
        + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({
        "exp": expire,
        "type": "access",
    })

    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()

    expire = (
        datetime.now(timezone.utc)
        + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )

    to_encode.update({
        "exp": expire,
        "type": "refresh",
        "jti": secrets.token_hex(16),
    })

    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def create_refresh_token_expiry() -> datetime:
    return (
        datetime.now(timezone.utc)
        + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def decode_access_token(token: str) -> dict:
    payload = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
    )
    if payload.get("type") != "access":
        raise JWTError("Invalid token type")
    return payload


def decode_refresh_token(token: str) -> dict:
    payload = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
    )
    if payload.get("type") != "refresh":
        raise JWTError("Invalid token type")
    return payload


# =========================================================
# GET CURRENT USER
# =========================================================
IDLE_TIMEOUT_MINUTES = 30
MAX_SESSION_DAYS = 7


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session expired or invalid. Please login again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)

        user_id = payload.get("sub")
        session_id = payload.get("session_id")

        if user_id is None or session_id is None:
            raise credentials_exception

        user_id_int = int(user_id)

    except (JWTError, TypeError, ValueError):
        raise credentials_exception

    user_session = (
        db.query(UserSession)
        .filter(
            UserSession.session_id == session_id,
            UserSession.user_id == user_id_int,
            UserSession.is_active.is_(True),
        )
        .first()
    )

    if user_session is None:
        raise credentials_exception

    now = datetime.now(timezone.utc)

    created_at = user_session.created_at
    last_active_at = user_session.last_active_at

    # Handle timezone-naive database timestamps safely.
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    if last_active_at.tzinfo is None:
        last_active_at = last_active_at.replace(tzinfo=timezone.utc)

    absolute_expiry = created_at + timedelta(
        days=settings.MAX_SESSION_DAYS
    )
    idle_expiry = last_active_at + timedelta(
        minutes=settings.IDLE_TIMEOUT_MINUTES
    )

    # Check absolute session lifetime.
    if now >= absolute_expiry:
        user_session.is_active = False
        user_session.refresh_token_hash = None
        db.commit()
        raise credentials_exception

    # Check inactivity.
    if now >= idle_expiry:
        user_session.is_active = False
        user_session.refresh_token_hash = None
        db.commit()
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id_int).first()

    if user is None:
        user_session.is_active = False
        user_session.refresh_token_hash = None
        db.commit()
        raise credentials_exception

    return user