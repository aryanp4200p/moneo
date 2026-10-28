import hashlib
import hmac
import html
import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError
from sqlalchemy.orm import Session

from core.config import settings
from services.email_service import send_email
from core.database import get_db
from core.security import (
    clear_expired_login_lock,
    create_access_token,
    create_password_reset_expiry,
    decode_access_token,
    generate_password_reset_token,
    get_current_user,
    get_lockout_remaining_minutes,
    hash_password,
    hash_reset_token,
    is_account_locked,
    is_reset_token_expired,
    oauth2_scheme,
    register_failed_login,
    reset_failed_login_attempts,
    verify_password,
)
from models.session import UserSession
from models.user import User
from schemas.session import SessionOut
from schemas.user import (
    AccountDeleteRequest,
    ForgotPasswordRequest,
    PasswordUpdate,
    ResendVerificationRequest,
    ResetPasswordRequest,
    Token,
    UserLogin,
    UserOut,
    UserRegister,
    VerifyEmailRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


# ==========================================================
# Email Verification Helpers
# ==========================================================

OTP_EXPIRY_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_COOLDOWN_SECONDS = 60

def hash_email_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode("utf-8")).hexdigest()

def send_verification_otp(
    user: User,
    db: Session,
    enforce_cooldown: bool = True,
) -> None:
    now = datetime.now(timezone.utc)

    last_sent = user.email_otp_last_sent_at

    # Handle timestamps returned without timezone information.
    if last_sent is not None and last_sent.tzinfo is None:
        last_sent = last_sent.replace(tzinfo=timezone.utc)

    if (
        enforce_cooldown
        and last_sent is not None
        and now - last_sent
        < timedelta(seconds=OTP_RESEND_COOLDOWN_SECONDS)
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait 60 seconds before requesting another code.",
        )

    if not os.getenv("BREVO_API_KEY"):
        logger.error("Brevo API key is not configured")
        raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Email verification is temporarily unavailable.",
    )

    otp = f"{secrets.randbelow(1_000_000):06d}"
    safe_name = html.escape(user.name or "there")
    safe_otp = html.escape(otp)

    email_html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#222">
      <h2>Verify your Moneo account</h2>
      <p>Hello {safe_name},</p>
      <p>Use this code to verify your email address:</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;
                  padding:16px;background:#f4f0ff;text-align:center">
        {safe_otp}
      </div>
      <p>This code expires in {OTP_EXPIRY_MINUTES} minutes.</p>
      <p>If you did not request this code, you can ignore this email.</p>
    </div>
    """

    # Never return the OTP in the API response.
    try:
        send_email(
            to_email=user.email,
            subject="Verify your Moneo email",
            html_body=email_html,
        )
    except Exception:
        logger.exception("Failed to send email verification OTP")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to send the verification email. Please try again later.",
        )

    # Store only the hash and expiration.
    user.email_otp_hash = hash_email_otp(otp)
    user.email_otp_expires_at = (
        now + timedelta(minutes=OTP_EXPIRY_MINUTES)
    )
    user.email_otp_attempts = 0
    user.email_otp_last_sent_at = now

    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        logger.exception("Failed to save email verification OTP state")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to complete the verification request.",
        )

# ==========================================================

# Helper: Create Server-Side Session

# ==========================================================

def create_user_session(

    user: User,

    db: Session,

    request: Request,

):

    session_id = uuid.uuid4().hex

    user_agent = request.headers.get(

        "user-agent",

        "Unknown device",

    )

    forwarded_for = request.headers.get(

        "x-forwarded-for"

    )

    if forwarded_for:

        ip_address = forwarded_for.split(",")[0].strip()

    else:

        ip_address = (

            request.client.host

            if request.client

            else "Unknown"

        )

    session = UserSession(

        session_id=session_id,

        user_id=user.id,

        device_name=user_agent[:255],

        ip_address=ip_address,

        is_active=True,

    )

    db.add(session)

    db.commit()

    db.refresh(session)

    return session

# ==========================================================

# Helper: Create Session-Aware JWT

# ==========================================================

def create_session_token(

    user: User,

    session: UserSession,

):

    return create_access_token(

        {

            "sub": str(user.id),

            "session_id": session.session_id,

        }

    )

# ==========================================================

# Helper: Handle Failed Login

# ==========================================================

def handle_failed_login(

    user: User | None,

    db: Session,

):

    """

    Register a failed login attempt.

    If the user exists:

        - increment failed attempts

        - lock after 5 failures

        - lock for 15 minutes

    If the user doesn't exist:

        - return the same generic error

        - don't reveal whether the account exists

    """

    if user is None:

        raise HTTPException(

            status_code=status.HTTP_401_UNAUTHORIZED,

            detail="Incorrect email or password",

        )

    locked = register_failed_login(user)

    db.commit()

    if locked:

        raise HTTPException(

            status_code=status.HTTP_429_TOO_MANY_REQUESTS,

            detail=(

                "Too many failed login attempts. "

                "Your account has been locked for 15 minutes."

            ),

        )

    raise HTTPException(

        status_code=status.HTTP_401_UNAUTHORIZED,

        detail="Incorrect email or password",

    )

# ==========================================================

# Register
# ==========================================================

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    payload: UserRegister,
    db: Session = Depends(get_db),
):
    
    email = str(payload.email).strip().lower()
    existing = db.query(User).filter(User.email == email).first()

    if existing:
        if existing.email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered.",
            )

        send_verification_otp(existing, db)
        return {
            "success": True,
            "email": existing.email,
            "message": "Verification code sent to your email.",
        }

    user = User(
        name=payload.name.strip(),
        email=email,
        hashed_password=hash_password(payload.password),
        email_verified=False,
        email_otp_hash=None,
        email_otp_expires_at=None,
        email_otp_attempts=0,
        email_otp_last_sent_at=None,
        failed_login_attempts=0,
        locked_until=None,
    )

    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        logger.exception("Failed to create user")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create your account. Please try again.",
        )

    send_verification_otp(user, db)
    return {
        "success": True,
        "email": user.email,
        "message": "Verification code sent to your email.",
    }

@router.post("/verify-email", response_model=Token)
def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    email = str(payload.email).strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code.",
        )

    if user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified. Please log in.",
        )

    if not user.email_otp_hash or not user.email_otp_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active verification code. Request a new code.",
        )

    now = datetime.now(timezone.utc)
    expires_at = user.email_otp_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if now >= expires_at:
        user.email_otp_hash = None
        user.email_otp_expires_at = None
        user.email_otp_attempts = 0
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code expired. Request a new code.",
        )

    if user.email_otp_attempts >= OTP_MAX_ATTEMPTS:
        user.email_otp_hash = None
        user.email_otp_expires_at = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Request a new verification code.",
        )

    supplied_hash = hash_email_otp(payload.otp)
    if not hmac.compare_digest(supplied_hash, user.email_otp_hash):
        user.email_otp_attempts += 1
        attempts_remaining = OTP_MAX_ATTEMPTS - user.email_otp_attempts

        if user.email_otp_attempts >= OTP_MAX_ATTEMPTS:
            user.email_otp_hash = None
            user.email_otp_expires_at = None

        db.commit()

        if attempts_remaining <= 0:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many attempts. Request a new verification code.",
            )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect verification code. {attempts_remaining} attempt(s) remaining.",
        )

    user.email_verified = True
    user.email_otp_hash = None
    user.email_otp_expires_at = None
    user.email_otp_attempts = 0
    db.commit()
    db.refresh(user)

    # Welcome email is best-effort: a mail-provider issue must not undo verification.
    try:
        safe_name = html.escape(user.name or "there")
        send_email(
            to_email=user.email,
            subject="Welcome to Moneo",
            html_body=f"""
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#222">
              <h2>Welcome to Moneo, {safe_name}!</h2>
              <p>Your email is verified and your account is ready.</p>
              <p>You can now start managing your finances with Moneo.</p>
            </div>
            """,
        )
    except Exception:
        logger.exception("Welcome email failed for user id %s", user.id)

    session = create_user_session(user, db, request)
    token = create_session_token(user, session)

    return Token(
        access_token=token,
        user=UserOut.model_validate(user),
    )

@router.post("/resend-verification")
def resend_verification(
    payload: ResendVerificationRequest,
    db: Session = Depends(get_db),
):
    email = str(payload.email).strip().lower()
    user = db.query(User).filter(User.email == email).first()

    generic_response = {
        "success": True,
        "message": "If the account exists and needs verification, a verification code will be sent.",
    }

    if user is None or user.email_verified:
        return generic_response

    send_verification_otp(user, db)
    return generic_response

# Normal Application Login

# ==========================================================

@router.post(

    "/login",

    response_model=Token,

)

def login(

    payload: UserLogin,

    request: Request,

    db: Session = Depends(get_db),

):

    user = (

        db.query(User)

        .filter(User.email == payload.email.lower())

        .first()

    )

    # ------------------------------------------------------

    # User doesn't exist

    # ------------------------------------------------------

    if user is None:

        handle_failed_login(

            None,

            db,

        )

    # ------------------------------------------------------

    # Check account lock

    # ------------------------------------------------------

    if is_account_locked(user):

        remaining = get_lockout_remaining_minutes(user)

        raise HTTPException(

            status_code=status.HTTP_429_TOO_MANY_REQUESTS,

            detail=(

                f"Too many failed login attempts. "

                f"Try again in {remaining} minute"

                f"{'s' if remaining != 1 else ''}."

            ),

        )

    # ------------------------------------------------------

    # If previous lock expired, clear it

    # ------------------------------------------------------

    if user.locked_until is not None:

        clear_expired_login_lock(user)

        db.commit()

    # ------------------------------------------------------

    # Verify password

    # ------------------------------------------------------

    if not verify_password(

        payload.password,

        user.hashed_password,

    ):

        handle_failed_login(

            user,

            db,

        )

    # ------------------------------------------------------

    # Successful login

    # ------------------------------------------------------

    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in. Request a verification code if needed.",
        )

    reset_failed_login_attempts(user)

    db.commit()

    session = create_user_session(

        user,

        db,

        request,

    )

    token = create_session_token(

        user,

        session,

    )

    return Token(

        access_token=token,

        user=UserOut.model_validate(user),

    )

# ==========================================================

# Swagger Login

# ==========================================================

@router.post(

    "/token",

    response_model=Token,

)

def login_for_swagger(

    request: Request,

    form_data: OAuth2PasswordRequestForm = Depends(),

    db: Session = Depends(get_db),

):

    user = (

        db.query(User)

        .filter(User.email == form_data.username.lower())

        .first()

    )

    # ------------------------------------------------------

    # User doesn't exist

    # ------------------------------------------------------

    if user is None:

        handle_failed_login(

            None,

            db,

        )

    # ------------------------------------------------------

    # Check account lock

    # ------------------------------------------------------

    if is_account_locked(user):

        remaining = get_lockout_remaining_minutes(user)

        raise HTTPException(

            status_code=status.HTTP_429_TOO_MANY_REQUESTS,

            detail=(

                f"Too many failed login attempts. "

                f"Try again in {remaining} minute"

                f"{'s' if remaining != 1 else ''}."

            ),

        )

    # ------------------------------------------------------

    # Clear expired lock

    # ------------------------------------------------------

    if user.locked_until is not None:

        clear_expired_login_lock(user)

        db.commit()

    # ------------------------------------------------------

    # Verify password

    # ------------------------------------------------------

    if not verify_password(

        form_data.password,

        user.hashed_password,

    ):

        handle_failed_login(

            user,

            db,

        )

    # ------------------------------------------------------

    # Successful login

    # ------------------------------------------------------

    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in. Request a verification code if needed.",
        )

    reset_failed_login_attempts(user)

    db.commit()

    session = create_user_session(

        user,

        db,

        request,

    )

    token = create_session_token(

        user,

        session,

    )

    return Token(

        access_token=token,

        user=UserOut.model_validate(user),

    )

# ==========================================================

# Forgot Password


@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """Send a password-reset link without revealing whether an account exists."""
    generic_response = {
        "success": True,
        "message": (
            "If an account exists for this email, "
            "a password reset link will be sent."
        ),
    }

    email = str(payload.email).strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if user is None:
        logger.info("Password reset requested for an unregistered email")
        return generic_response

    raw_token = generate_password_reset_token()
    user.password_reset_token_hash = hash_reset_token(raw_token)
    user.password_reset_expires_at = create_password_reset_expiry()

    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to save password reset token")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to process the password reset request.",
        )

    reset_url = (
        f"{settings.FRONTEND_URL.rstrip('/')}"
        f"/reset-password?token={raw_token}"
    )

    safe_name = html.escape(user.name or "there")
    safe_url = html.escape(reset_url, quote=True)

    email_html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#222">
        <h2>Reset your Moneo password</h2>
        <p>Hello {safe_name},</p>
        <p>Click the button below to choose a new password.</p>
        <p>
            <a href="{safe_url}"
               style="display:inline-block;padding:12px 20px;
                      background:#6d4aff;color:white;
                      text-decoration:none;border-radius:6px">
                Reset Password
            </a>
        </p>
        <p>If the button doesn't work, open the link below:</p>
        <p><a href="{safe_url}">Reset your password</a></p>
        <p>If you did not request this, you can ignore this email.</p>
    </div>
    """

    try:
        send_email(
            to_email=user.email,
            subject="Reset your Moneo password",
            html_body=email_html,
        )
    except Exception:
        user.password_reset_token_hash = None
        user.password_reset_expires_at = None
        db.commit()
        logger.exception("Password reset email delivery failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to send the password reset email. Please try again.",
        )

    logger.info("Password reset email accepted for delivery")
    return generic_response

# ==========================================================


@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Reset password using a valid, unexpired reset token."""

    token_hash = hash_reset_token(payload.token)

    user = (
        db.query(User)
        .filter(User.password_reset_token_hash == token_hash)
        .first()
    )

    # Diagnostic: never log the actual token or its hash.
    if user is None:
        logger.warning(
            "Password reset rejected: token hash did not match any user"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token.",
        )

    logger.info("Password reset token matched a user")

    if is_reset_token_expired(user):
        logger.warning("Password reset rejected: token expired")

        user.password_reset_token_hash = None
        user.password_reset_expires_at = None
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token.",
        )

    # Update password.
    user.hashed_password = hash_password(payload.new_password)

    # Reset login security state.
    user.failed_login_attempts = 0
    user.locked_until = None

    # Invalidate the token so it cannot be reused.
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None

    # Revoke all active sessions after a password reset.
    db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.is_active.is_(True),
    ).update(
        {UserSession.is_active: False},
        synchronize_session=False,
    )

    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to save password reset for user")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to reset your password. Please try again.",
        )

    logger.info("Password reset completed successfully")

    return {
        "success": True,
        "message": (
            "Password reset successfully. "
            "Please log in with your new password."
        ),
    }


# ==========================================================

# Get Current Profile

# ==========================================================

@router.get(

    "/me",

    response_model=UserOut,

)

def get_profile(

    current_user: User = Depends(get_current_user),

):

    return current_user

# ==========================================================

# Update Profile Information

# ==========================================================

@router.put(

    "/profile",

    response_model=UserOut,

)

def update_profile(

    name: str | None = None,

    email: str | None = None,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user),

):

    if name is not None:

        name = name.strip()

        if not name:

            raise HTTPException(

                status_code=400,

                detail="Name cannot be empty.",

            )

        current_user.name = name

    if email is not None:

        email = email.strip().lower()

        existing = (

            db.query(User)

            .filter(

                User.email == email,

                User.id != current_user.id,

            )

            .first()

        )

        if existing:

            raise HTTPException(

                status_code=400,

                detail="Email is already registered.",

            )

        current_user.email = email

    db.commit()

    db.refresh(current_user)

    return current_user

# ==========================================================

# Upload Profile Image

# ==========================================================

@router.post(

    "/profile-image",

    response_model=UserOut,

)

async def upload_profile_image(

    file: UploadFile = File(...),

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user),

):

    allowed_types = {

        "image/jpeg": ".jpg",

        "image/png": ".png",

        "image/webp": ".webp",

    }

    if file.content_type not in allowed_types:

        raise HTTPException(

            status_code=400,

            detail="Only JPG, PNG, and WEBP images are allowed.",

        )

    contents = await file.read()

    max_size = 5 * 1024 * 1024

    if len(contents) > max_size:

        raise HTTPException(

            status_code=400,

            detail="Profile image must be smaller than 5 MB.",

        )

    upload_dir = os.path.join(

        os.path.dirname(os.path.dirname(__file__)),

        "uploads",

        "profile",

    )

    os.makedirs(

        upload_dir,

        exist_ok=True,

    )

    extension = allowed_types[

        file.content_type

    ]

    filename = (

        f"{current_user.id}_"

        f"{uuid.uuid4().hex}"

        f"{extension}"

    )

    file_path = os.path.join(

        upload_dir,

        filename,

    )

    with open(file_path, "wb") as image_file:

        image_file.write(contents)

    current_user.profile_image_url = (

        f"/uploads/profile/{filename}"

    )

    db.commit()

    db.refresh(current_user)

    return current_user

# ==========================================================

# Delete Profile Image

# ==========================================================

@router.delete(

    "/profile-image",

    response_model=UserOut,

)

def delete_profile_image(

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user),

):

    if current_user.profile_image_url:

        file_path = os.path.join(

            os.path.dirname(os.path.dirname(__file__)),

            current_user.profile_image_url.lstrip("/"),

        )

        if os.path.exists(file_path):

            os.remove(file_path)

        current_user.profile_image_url = None

        db.commit()

        db.refresh(current_user)

    return current_user

# ==========================================================

# Change Password

# ==========================================================

@router.put("/change-password")

def change_password(

    payload: PasswordUpdate,

    token: str = Depends(oauth2_scheme),

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user),

):

    # ------------------------------------------------------

    # Verify current password

    # ------------------------------------------------------

    if not verify_password(

        payload.current_password,

        current_user.hashed_password,

    ):

        raise HTTPException(

            status_code=400,

            detail="Current password is incorrect",

        )

    # ------------------------------------------------------

    # Prevent same password

    # ------------------------------------------------------

    if verify_password(

        payload.new_password,

        current_user.hashed_password,

    ):

        raise HTTPException(

            status_code=400,

            detail=(

                "New password cannot be the same "

                "as the current password."

            ),

        )

    # ------------------------------------------------------

    # Update password

    # ------------------------------------------------------

    current_user.hashed_password = hash_password(

        payload.new_password

    )

    # Reset failed login state.

    current_user.failed_login_attempts = 0

    current_user.locked_until = None

    # ------------------------------------------------------

    # Identify current session

    # ------------------------------------------------------

    try:

        payload_data = decode_access_token(token)

        current_session_id = payload_data.get(

            "session_id"

        )

    except JWTError:

        raise HTTPException(

            status_code=401,

            detail="Invalid session.",

        )

    if not current_session_id:

        raise HTTPException(

            status_code=401,

            detail="Invalid session.",

        )

    # ------------------------------------------------------

    # Revoke OTHER sessions

    #

    # Current device remains logged in.

    # ------------------------------------------------------

    db.query(UserSession).filter(

        UserSession.user_id == current_user.id,

        UserSession.session_id != current_session_id,

        UserSession.is_active.is_(True),

    ).update(

        {

            UserSession.is_active: False,

        },

        synchronize_session=False,

    )

    db.commit()

    return {

        "success": True,

        "message": (

            "Password updated successfully. "

            "Other active sessions have been logged out."

        ),

    }

# ==========================================================

# Account Deletion

# ==========================================================

@router.delete("/account")

def delete_account(

    payload: AccountDeleteRequest,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user),

):

    if not verify_password(

        payload.password,

        current_user.hashed_password,

    ):

        raise HTTPException(

            status_code=400,

            detail="Incorrect password.",

        )

    if current_user.profile_image_url:

        file_path = os.path.join(

            os.path.dirname(os.path.dirname(__file__)),

            current_user.profile_image_url.lstrip("/"),

        )

        if os.path.exists(file_path):

            os.remove(file_path)

    db.delete(current_user)

    db.commit()

    return {

        "success": True,

        "message": "Account deleted successfully.",

    }

# ==========================================================

# Get Active Sessions

# ==========================================================

@router.get(

    "/sessions",

    response_model=list[SessionOut],

)

def get_sessions(

    token: str = Depends(oauth2_scheme),

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user),

):

    try:

        payload = decode_access_token(token)

        current_session_id = payload.get(

            "session_id"

        )

        if not current_session_id:

            raise HTTPException(

                status_code=401,

                detail="Invalid session.",

            )

    except JWTError:

        raise HTTPException(

            status_code=401,

            detail="Invalid session.",

        )

    sessions = (

        db.query(UserSession)

        .filter(

            UserSession.user_id == current_user.id,

            UserSession.is_active.is_(True),

        )

        .order_by(

            UserSession.last_active_at.desc()

        )

        .all()

    )

    result = []

    for session in sessions:

        session_data = SessionOut(

            session_id=session.session_id,

            device_name=session.device_name,

            ip_address=session.ip_address,

            created_at=session.created_at,

            last_active_at=session.last_active_at,

            is_active=session.is_active,

            is_current=(

                session.session_id

                == current_session_id

            ),

        )

        result.append(session_data)

    return result

# ==========================================================

# Logout Current Session

# ==========================================================

@router.post("/logout")

def logout(

    token: str = Depends(oauth2_scheme),

    db: Session = Depends(get_db),

):

    try:

        payload = decode_access_token(token)

        session_id = payload.get(

            "session_id"

        )

        if not session_id:

            raise HTTPException(

                status_code=401,

                detail="Invalid session.",

            )

    except JWTError:

        raise HTTPException(

            status_code=401,

            detail="Invalid session.",

        )

    session = (

        db.query(UserSession)

        .filter(

            UserSession.session_id == session_id,

        )

        .first()

    )

    if session:

        session.is_active = False

        db.commit()

    return {

        "success": True,

        "message": "Logged out successfully.",

    }

# ==========================================================

# Revoke Selected Session

# ==========================================================

@router.delete(

    "/sessions/{session_id}"

)

def revoke_session(

    session_id: str,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user),

):

    session = (

        db.query(UserSession)

        .filter(

            UserSession.session_id == session_id,

            UserSession.user_id == current_user.id,

            UserSession.is_active.is_(True),

        )

        .first()

    )

    if not session:

        raise HTTPException(

            status_code=404,

            detail="Session not found.",

        )

    session.is_active = False

    db.commit()

    return {

        "success": True,

        "message": "Session revoked successfully.",

    }

# ==========================================================

# Logout All Other Sessions

# ==========================================================

@router.post(

    "/sessions/logout-others"

)

def logout_other_sessions(

    token: str = Depends(oauth2_scheme),

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user),

):

    try:

        payload = decode_access_token(token)

        current_session_id = payload.get(

            "session_id"

        )

        if not current_session_id:

            raise HTTPException(

                status_code=401,

                detail="Invalid session.",

            )

    except JWTError:

        raise HTTPException(

            status_code=401,

            detail="Invalid session.",

        )

    updated = (

        db.query(UserSession)

        .filter(

            UserSession.user_id == current_user.id,

            UserSession.session_id != current_session_id,

            UserSession.is_active.is_(True),

        )

        .update(

            {

                UserSession.is_active: False,

            },

            synchronize_session=False,

        )

    )

    db.commit()

    return {

        "success": True,

        "message": "All other sessions have been logged out.",

        "sessions_revoked": updated,

    }
