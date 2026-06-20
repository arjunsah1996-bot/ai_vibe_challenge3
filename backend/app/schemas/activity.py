"""Pydantic schemas for activity logging and retrieval."""

from datetime import datetime

from pydantic import BaseModel, Field


class ActivityCreate(BaseModel):
    """Request body for logging a new activity."""
    factor_id: int
    quantity: float = Field(..., gt=0, le=100000)
    logged_at: datetime | None = None  # Optional override; defaults to now


class ActivityResponse(BaseModel):
    """Single activity response."""
    id: int
    factor_id: int
    quantity: float
    computed_co2e: float
    logged_at: datetime
    category: str | None = None
    activity_type: str | None = None
    unit: str | None = None

    model_config = {"from_attributes": True}


class ActivityListResponse(BaseModel):
    """Paginated activity list."""
    items: list[ActivityResponse]
    total: int
    page: int
    page_size: int


class QuickLogItem(BaseModel):
    """Single item in a quick-log template."""
    factor_id: int
    quantity: float = Field(..., gt=0, le=100000)


class TemplateCreate(BaseModel):
    """Request to save a quick-log template."""
    name: str = Field(..., min_length=1, max_length=100)
    items: list[QuickLogItem] = Field(..., min_length=1, max_length=20)


class TemplateResponse(BaseModel):
    """Saved template response."""
    id: int
    name: str
    items: list[QuickLogItem]

    model_config = {"from_attributes": True}
