"""Activity model — immutable log of user actions with computed CO₂e."""

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.core.database import Base


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    factor_id = Column(Integer, ForeignKey("emission_factors.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    # Computed at log time — IMMUTABLE. Never rewritten by factor updates.
    computed_co2e = Column(Float, nullable=False)
    logged_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    user = relationship("User", back_populates="activities")
    factor = relationship("EmissionFactor", back_populates="activities")
