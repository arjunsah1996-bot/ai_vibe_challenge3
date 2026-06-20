"""Daily rollup model — pre-aggregated daily totals by category.

Dashboards read from rollups, NEVER scan raw activity logs.
Updated incrementally on every activity write.
"""

from datetime import date

from sqlalchemy import Column, Date, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class DailyRollup(Base):
    __tablename__ = "daily_rollups"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    category = Column(String(50), nullable=False)
    total_co2e = Column(Float, nullable=False, default=0.0)

    # Relationships
    user = relationship("User", back_populates="daily_rollups")

    __table_args__ = (
        UniqueConstraint("user_id", "date", "category", name="uq_user_date_category"),
    )
