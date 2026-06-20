"""Pydantic schemas for goals and streaks."""

from datetime import datetime

from pydantic import BaseModel, Field


class GoalCreate(BaseModel):
    """Request body for setting a monthly goal."""
    target_kg_per_month: float = Field(..., gt=0, le=50000)


class GoalUpdate(BaseModel):
    """Request body for updating a goal."""
    target_kg_per_month: float | None = Field(None, gt=0, le=50000)
    streak_count: int | None = Field(None, ge=0)


class GoalResponse(BaseModel):
    """Goal response with progress data."""
    id: int
    target_kg_per_month: float
    baseline_kg: float | None
    streak_count: int
    created_at: datetime
    # Computed fields added by the service layer
    current_month_co2e: float | None = None
    progress_pct: float | None = None  # 0-100, percentage of target used
    daily_budget: float | None = None

    model_config = {"from_attributes": True}
