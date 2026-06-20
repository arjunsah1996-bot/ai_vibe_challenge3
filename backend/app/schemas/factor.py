"""Pydantic schemas for emission factors."""

from datetime import date

from pydantic import BaseModel


class FactorResponse(BaseModel):
    """Single emission factor."""
    id: int
    category: str
    activity_type: str
    region: str
    unit: str
    kg_co2e_per_unit: float
    source: str
    version: str
    effective_from: date
    default_quantity: float | None = None

    model_config = {"from_attributes": True}


class CategoryInfo(BaseModel):
    """Category with its activity types."""
    category: str
    activities: list[FactorResponse]


class FactorCreate(BaseModel):
    """Request body for creating a new emission factor."""
    category: str
    activity_type: str
    region: str = "india"
    unit: str
    kg_co2e_per_unit: float
    source: str


class FactorUpdate(BaseModel):
    """Request body for updating an emission factor."""
    category: str | None = None
    activity_type: str | None = None
    region: str | None = None
    unit: str | None = None
    kg_co2e_per_unit: float | None = None
    source: str | None = None
