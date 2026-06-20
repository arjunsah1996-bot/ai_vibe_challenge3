"""Emission factor model — versioned, cited, region-aware."""

from datetime import date

from sqlalchemy import Column, Date, Float, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class EmissionFactor(Base):
    __tablename__ = "emission_factors"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), nullable=False, index=True)
    activity_type = Column(String(100), nullable=False, index=True)
    region = Column(String(50), nullable=False, default="india")
    unit = Column(String(30), nullable=False)  # e.g., "kWh", "km", "kg", "meal"
    kg_co2e_per_unit = Column(Float, nullable=False)
    source = Column(String(255), nullable=False)  # Citation string
    version = Column(String(20), nullable=False, default="v1")
    effective_from = Column(Date, default=date.today)

    # Relationships
    activities = relationship("Activity", back_populates="factor")
