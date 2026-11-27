from datetime import datetime

from pydantic import (
    BaseModel,
    EmailStr,
    ConfigDict,
    Field,
    field_validator,
)


# ==========================================================
# Password Validation
# ==========================================================

def validate_password_strength(password: str) -> str:
    password = password.strip()

    if len(password) < 8:
        raise ValueError(
            "Password must be at least 8 characters long."
        )

    if len(password) > 128:
        raise ValueError(
            "Password must not exceed 128 characters."
        )

    if not any(char.isupper() for char in password):
        raise ValueError(
            "Password must contain at least one uppercase letter."
        )

    if not any(char.islower() for char in password):
        raise ValueError(
            "Password must contain at least one lowercase letter."
        )

    if not any(char.isdigit() for char in password):
        raise ValueError(
            "Password must contain at least one number."
        )

    if not any(
        char in "!@#$%^&*()-_=+[]{};:,.?/\\|`~"
        for char in password
    ):
        raise ValueError(
            "Password must contain at least one special character."
        )

    return password


# ==========================================================
# Registration
# ==========================================================

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)


# ==========================================================
# Login
# ==========================================================

class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ==========================================================
# User Response
# ==========================================================

class UserOut(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    name: str
    email: EmailStr
    profile_image_url: str | None = None
    created_at: datetime


# ==========================================================
# Token Response & Refresh Request
# ==========================================================

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


# ==========================================================
# Password Update
# ==========================================================

class PasswordUpdate(BaseModel):
    current_password: str = Field(
        ...,
        min_length=1,
    )

    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )

    @field_validator("new_password")
    @classmethod
    def validate_new_password(
        cls,
        value: str,
    ) -> str:
        return validate_password_strength(value)


# ==========================================================
# Account Deletion
# ==========================================================

class AccountDeleteRequest(BaseModel):
    password: str = Field(
        ...,
        min_length=1,
    )


# ==========================================================
# Forgot Password
# ==========================================================

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


# ==========================================================
# Reset Password
# ==========================================================

class ResetPasswordRequest(BaseModel):
    token: str = Field(
        ...,
        min_length=1,
    )

    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )

    @field_validator("new_password")
    @classmethod
    def validate_reset_password(
        cls,
        value: str,
    ) -> str:
        return validate_password_strength(value)


# ==========================================================
# Email Verification
# ==========================================================

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str = Field(
        ...,
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
    )


class ResendVerificationRequest(BaseModel):
    email: EmailStr