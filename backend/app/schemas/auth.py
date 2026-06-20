"""Pydantic schemas for authentication endpoints."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    """Registration request body."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    region: str = Field(default="india", max_length=50)
    household_size: int = Field(default=1, ge=1, le=20)


class UserLogin(BaseModel):
    """Login request body."""
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class UserResponse(BaseModel):
    """User profile response."""
    id: int
    email: str
    region: str
    household_size: int
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserUpdate(BaseModel):
    """Request body for updating user profile."""
    region: str | None = Field(None, max_length=50)
    household_size: int | None = Field(None, ge=1, le=20)


class PasswordChange(BaseModel):
    """Request body for changing password."""
    old_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)
