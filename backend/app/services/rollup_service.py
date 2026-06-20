"""Rollup service — incremental daily aggregation.

Dashboards ALWAYS read from rollups, never from raw activity logs.
Rollups are updated incrementally on every activity write.
"""

from datetime import date, datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.daily_rollup import DailyRollup
from app.models.emission_factor import EmissionFactor


def update_rollup(db: Session, user_id: int, activity_date: date, category: str, co2e_delta: float) -> None:
    """Incrementally update the daily rollup for a specific user/date/category.

    Called after every activity log. Adds co2e_delta to the existing total,
    or creates a new rollup record if none exists.
    """
    rollup = db.query(DailyRollup).filter(
        DailyRollup.user_id == user_id,
        DailyRollup.date == activity_date,
        DailyRollup.category == category,
    ).first()

    if rollup:
        rollup.total_co2e = round(rollup.total_co2e + co2e_delta, 4)
    else:
        rollup = DailyRollup(
            user_id=user_id,
            date=activity_date,
            category=category,
            total_co2e=round(co2e_delta, 4),
        )
        db.add(rollup)

    db.flush()


def recompute_all(db: Session, user_id: int) -> int:
    """Full recompute of all rollups for a user from raw activity logs.

    This is a maintenance function — should rarely be needed.
    Returns the number of rollup records created.
    """
    # Delete existing rollups
    db.query(DailyRollup).filter(DailyRollup.user_id == user_id).delete()

    # Recompute from activities
    results = (
        db.query(
            func.date(Activity.logged_at).label("activity_date"),
            EmissionFactor.category,
            func.sum(Activity.computed_co2e).label("total"),
        )
        .join(EmissionFactor, Activity.factor_id == EmissionFactor.id)
        .filter(Activity.user_id == user_id)
        .group_by(func.date(Activity.logged_at), EmissionFactor.category)
        .all()
    )

    count = 0
    for row in results:
        rollup = DailyRollup(
            user_id=user_id,
            date=row.activity_date,
            category=row.category,
            total_co2e=round(row.total, 4),
        )
        db.add(rollup)
        count += 1

    db.flush()
    return count


def get_daily_totals(db: Session, user_id: int, start_date: date, end_date: date) -> list[dict]:
    """Get daily emission totals (all categories summed) for a date range."""
    results = (
        db.query(
            DailyRollup.date,
            func.sum(DailyRollup.total_co2e).label("total"),
        )
        .filter(
            DailyRollup.user_id == user_id,
            DailyRollup.date >= start_date,
            DailyRollup.date <= end_date,
        )
        .group_by(DailyRollup.date)
        .order_by(DailyRollup.date)
        .all()
    )
    return [{"date": r.date, "total_co2e": round(r.total, 4)} for r in results]


def get_category_breakdown(db: Session, user_id: int, start_date: date, end_date: date) -> list[dict]:
    """Get emission totals broken down by category for a date range."""
    results = (
        db.query(
            DailyRollup.category,
            func.sum(DailyRollup.total_co2e).label("total"),
        )
        .filter(
            DailyRollup.user_id == user_id,
            DailyRollup.date >= start_date,
            DailyRollup.date <= end_date,
        )
        .group_by(DailyRollup.category)
        .order_by(func.sum(DailyRollup.total_co2e).desc())
        .all()
    )

    grand_total = sum(r.total for r in results) if results else 0.0
    return [
        {
            "category": r.category,
            "total_co2e": round(r.total, 4),
            "percentage": round(r.total / grand_total * 100, 1) if grand_total > 0 else 0.0,
        }
        for r in results
    ]


def get_month_total(db: Session, user_id: int, year: int, month: int) -> float:
    """Get total emissions for a specific month."""
    from calendar import monthrange

    start = date(year, month, 1)
    _, last_day = monthrange(year, month)
    end = date(year, month, last_day)

    result = (
        db.query(func.sum(DailyRollup.total_co2e))
        .filter(
            DailyRollup.user_id == user_id,
            DailyRollup.date >= start,
            DailyRollup.date <= end,
        )
        .scalar()
    )
    return round(result or 0.0, 4)
