"""Pydantic schemas for dashboard, insights, tips, and world state."""

from datetime import date

from pydantic import BaseModel, Field


class DailyTotal(BaseModel):
    """One day's total emissions."""
    date: date
    total_co2e: float


class CategoryBreakdown(BaseModel):
    """Emissions per category for a time range."""
    category: str
    total_co2e: float
    percentage: float


class WorldState(BaseModel):
    """Pure function output: user metrics → 3D scene parameters.

    All values normalized 0.0–1.0 unless noted.
    """
    haze_density: float = Field(ge=0.0, le=1.0)
    foliage_density: float = Field(ge=0.0, le=1.0)
    light_warmth: float = Field(ge=0.0, le=1.0)
    river_clarity: float = Field(ge=0.0, le=1.0)
    grove_size: int = Field(ge=0)         # Tree count along the river bank
    wildlife_count: int = Field(ge=0)     # Birds, fireflies, etc.
    overall_score: float = Field(ge=0.0, le=1.0)  # Composite health score


class DashboardResponse(BaseModel):
    """Full dashboard data — all from rollups, never raw logs."""
    daily_totals: list[DailyTotal]
    category_breakdown: list[CategoryBreakdown]
    current_month_total: float
    previous_month_total: float | None
    baseline_daily_avg: float | None
    trend_direction: str  # "improving", "worsening", "stable"
    world_state: WorldState


class Tip(BaseModel):
    """A personalized, impact-ranked recommendation."""
    id: str
    category: str
    title: str
    description: str
    potential_saving_kg: float  # Computed from THIS user's data
    confidence: float = Field(ge=0.0, le=1.0)
    is_anomaly: bool = False


class TipFeedback(BaseModel):
    """User response to a tip."""
    action: str = Field(..., pattern="^(accept|dismiss)$")


class InsightsResponse(BaseModel):
    """Full insights payload."""
    tips: list[Tip]
    anomalies: list[str]  # Human-readable anomaly descriptions
    top_category: str
    top_category_pct: float
