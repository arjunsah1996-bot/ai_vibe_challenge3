"""Insight service — deterministic, explainable intelligence.

Every insight is computed from THIS user's actual data.
No generic tips. No fake AI. All logic is testable.
"""

import hashlib
from datetime import date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.engine.calculator import compute_world_state
from app.models.daily_rollup import DailyRollup
from app.models.goal import Goal


# ─── Tip definitions ──────────────────────────────────────────────────────────
# Each tip has a condition and a savings computation based on user data.

TIP_TEMPLATES = [
    {
        "id": "switch_to_metro",
        "category": "transport",
        "title": "Switch short car trips to metro",
        "description": "Your transport footprint is high. Taking the metro instead of driving for trips under 15 km could significantly reduce your emissions.",
        "applicable_categories": ["transport"],
        "saving_factor": 0.35,  # Fraction of transport emissions saveable
    },
    {
        "id": "carpool_commute",
        "category": "transport",
        "title": "Carpool 3 days a week",
        "description": "Sharing your car commute with one other person would halve your driving emissions on those days.",
        "applicable_categories": ["transport"],
        "saving_factor": 0.25,
    },
    {
        "id": "cycle_short_trips",
        "category": "transport",
        "title": "Cycle for trips under 3 km",
        "description": "Short trips add up. Cycling instead of using a two-wheeler for nearby errands cuts emissions to zero for those trips.",
        "applicable_categories": ["transport"],
        "saving_factor": 0.15,
    },
    {
        "id": "reduce_ac_hours",
        "category": "household_energy",
        "title": "Reduce AC usage by 2 hours daily",
        "description": "Your AC usage is a significant portion of your household energy. Setting a timer or raising the thermostat by 2°C can help.",
        "applicable_categories": ["household_energy"],
        "saving_factor": 0.30,
    },
    {
        "id": "switch_to_led",
        "category": "household_energy",
        "title": "Switch remaining lights to LED",
        "description": "LED bulbs use 75% less energy than traditional bulbs. If you haven't fully switched, this is an easy win.",
        "applicable_categories": ["household_energy"],
        "saving_factor": 0.10,
    },
    {
        "id": "reduce_geyser_usage",
        "category": "household_energy",
        "title": "Use a bucket instead of geyser for bathing",
        "description": "Heating water is energy-intensive. Using a bucket or reducing shower time can cut geyser energy use significantly.",
        "applicable_categories": ["household_energy"],
        "saving_factor": 0.20,
    },
    {
        "id": "veg_meals_2_days",
        "category": "food_diet",
        "title": "Go vegetarian 2 extra days per week",
        "description": "Plant-based meals have a fraction of the carbon footprint of meat-based ones. Even 2 extra veg days make a measurable difference.",
        "applicable_categories": ["food_diet"],
        "saving_factor": 0.25,
    },
    {
        "id": "reduce_food_delivery",
        "category": "food_diet",
        "title": "Cook at home instead of ordering delivery",
        "description": "Food delivery adds packaging and transport emissions on top of the meal itself. Cooking at home saves both money and carbon.",
        "applicable_categories": ["food_diet"],
        "saving_factor": 0.30,
    },
    {
        "id": "compost_waste",
        "category": "waste",
        "title": "Compost your kitchen waste",
        "description": "Composting organic waste instead of sending it to landfill reduces methane emissions significantly.",
        "applicable_categories": ["waste"],
        "saving_factor": 0.50,
    },
    {
        "id": "reduce_electricity",
        "category": "household_energy",
        "title": "Unplug devices on standby",
        "description": "Standby power can account for 5-10% of household electricity use. Unplugging unused devices or using power strips helps.",
        "applicable_categories": ["household_energy"],
        "saving_factor": 0.08,
    },
]


def compute_baseline(db: Session, user_id: int) -> dict[str, float] | None:
    """Compute the user's per-category daily baseline from their first 14 days of data.

    Returns None if the user has fewer than 7 days of data.
    Returns dict of category → daily average kg CO₂e.
    """
    # Find the user's earliest rollup date
    earliest = (
        db.query(func.min(DailyRollup.date))
        .filter(DailyRollup.user_id == user_id)
        .scalar()
    )
    if not earliest:
        return None

    cutoff = earliest + timedelta(days=14)
    today = date.today()
    actual_cutoff = min(cutoff, today)
    days_available = (actual_cutoff - earliest).days + 1

    if days_available < 7:
        return None

    # Get per-category totals in the baseline window
    results = (
        db.query(
            DailyRollup.category,
            func.sum(DailyRollup.total_co2e).label("total"),
        )
        .filter(
            DailyRollup.user_id == user_id,
            DailyRollup.date >= earliest,
            DailyRollup.date <= actual_cutoff,
        )
        .group_by(DailyRollup.category)
        .all()
    )

    return {r.category: round(r.total / days_available, 4) for r in results}


def compute_ewma_trend(db: Session, user_id: int, category: str, span: int = 7) -> float | None:
    """Compute EWMA (Exponentially Weighted Moving Average) for a category.

    Returns the current EWMA value (daily average trend), or None if insufficient data.
    """
    end_date = date.today()
    start_date = end_date - timedelta(days=30)

    results = (
        db.query(DailyRollup.date, DailyRollup.total_co2e)
        .filter(
            DailyRollup.user_id == user_id,
            DailyRollup.category == category,
            DailyRollup.date >= start_date,
            DailyRollup.date <= end_date,
        )
        .order_by(DailyRollup.date)
        .all()
    )

    if len(results) < 3:
        return None

    # Compute EWMA
    alpha = 2.0 / (span + 1)
    ewma = results[0].total_co2e
    for row in results[1:]:
        ewma = alpha * row.total_co2e + (1 - alpha) * ewma

    return round(ewma, 4)


def detect_anomalies(db: Session, user_id: int) -> list[str]:
    """Detect anomalies in recent data using z-score against user's own history.

    Returns list of human-readable anomaly descriptions.
    """
    anomalies = []
    end_date = date.today()
    yesterday = end_date - timedelta(days=1)
    start_date = end_date - timedelta(days=30)

    # Get category totals for yesterday
    yesterday_data = (
        db.query(DailyRollup.category, DailyRollup.total_co2e)
        .filter(
            DailyRollup.user_id == user_id,
            DailyRollup.date == yesterday,
        )
        .all()
    )

    for row in yesterday_data:
        # Get historical data for same category
        historical = (
            db.query(DailyRollup.total_co2e)
            .filter(
                DailyRollup.user_id == user_id,
                DailyRollup.category == row.category,
                DailyRollup.date >= start_date,
                DailyRollup.date < yesterday,
            )
            .all()
        )

        if len(historical) < 5:
            continue

        values = [h.total_co2e for h in historical]
        mean = sum(values) / len(values)
        if mean == 0:
            continue

        variance = sum((v - mean) ** 2 for v in values) / len(values)
        std = variance ** 0.5

        if std > 0:
            z_score = (row.total_co2e - mean) / std
            if z_score > 2.0:
                ratio = round(row.total_co2e / mean, 1)
                category_display = row.category.replace("_", " ").title()
                day_name = yesterday.strftime("%A")
                anomalies.append(
                    f"Yesterday's {category_display} was {ratio}× your usual {day_name}."
                )

    return anomalies


def generate_tips(db: Session, user_id: int) -> list[dict]:
    """Generate personalized, impact-ranked tips.

    Each tip's saving is computed from THIS user's actual data.
    Tips are ranked by potential_saving_kg descending.
    """
    end_date = date.today()
    start_date = end_date - timedelta(days=30)

    # Get last 30 days category totals
    category_totals = (
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
        .all()
    )

    cat_map = {r.category: r.total for r in category_totals}
    grand_total = sum(cat_map.values())

    if grand_total == 0:
        return []

    tips = []
    for template in TIP_TEMPLATES:
        # Check if this user has data in any of the applicable categories
        applicable_total = sum(
            cat_map.get(cat, 0.0) for cat in template["applicable_categories"]
        )
        if applicable_total <= 0:
            continue

        potential_saving = round(applicable_total * template["saving_factor"], 2)
        confidence = min(1.0, applicable_total / grand_total + 0.3)

        tips.append({
            "id": template["id"],
            "category": template["category"],
            "title": template["title"],
            "description": template["description"],
            "potential_saving_kg": potential_saving,
            "confidence": round(confidence, 2),
            "is_anomaly": False,
        })

    # Sort by potential saving descending
    tips.sort(key=lambda t: t["potential_saving_kg"], reverse=True)
    return tips


def get_trend_direction(db: Session, user_id: int) -> str:
    """Determine if the user's emissions are improving, worsening, or stable.

    Compares the last 7 days' average to the previous 7 days' average.
    """
    today = date.today()
    week_ago = today - timedelta(days=7)
    two_weeks_ago = today - timedelta(days=14)

    recent = (
        db.query(func.sum(DailyRollup.total_co2e))
        .filter(
            DailyRollup.user_id == user_id,
            DailyRollup.date > week_ago,
            DailyRollup.date <= today,
        )
        .scalar()
    ) or 0.0

    previous = (
        db.query(func.sum(DailyRollup.total_co2e))
        .filter(
            DailyRollup.user_id == user_id,
            DailyRollup.date > two_weeks_ago,
            DailyRollup.date <= week_ago,
        )
        .scalar()
    ) or 0.0

    if previous == 0:
        return "stable"

    change = (recent - previous) / previous
    if change < -0.1:
        return "improving"
    elif change > 0.1:
        return "worsening"
    return "stable"


def build_dashboard(db: Session, user_id: int) -> dict:
    """Build the complete dashboard response from rollups.

    Never reads raw activity logs — only rollups.
    """
    from app.services.rollup_service import get_daily_totals, get_category_breakdown, get_month_total

    today = date.today()
    month_start = date(today.year, today.month, 1)

    # Previous month
    if today.month == 1:
        prev_year, prev_month = today.year - 1, 12
    else:
        prev_year, prev_month = today.year, today.month - 1

    # Daily totals for last 30 days
    thirty_days_ago = today - timedelta(days=30)
    daily_totals = get_daily_totals(db, user_id, thirty_days_ago, today)

    # Category breakdown for current month
    category_breakdown = get_category_breakdown(db, user_id, month_start, today)

    # Monthly totals
    current_month_total = get_month_total(db, user_id, today.year, today.month)
    previous_month_total = get_month_total(db, user_id, prev_year, prev_month)

    # Baseline
    baseline = compute_baseline(db, user_id)
    baseline_daily_avg = sum(baseline.values()) if baseline else None

    # Trend
    trend = get_trend_direction(db, user_id)

    # Goal data for world state
    goal = db.query(Goal).filter(Goal.user_id == user_id).order_by(Goal.created_at.desc()).first()

    # World state computation
    world_state = compute_world_state(
        current_month_co2e=current_month_total,
        baseline_monthly_co2e=(baseline_daily_avg * 30) if baseline_daily_avg else None,
        goal_target_co2e=goal.target_kg_per_month if goal else None,
        streak_days=goal.streak_count if goal else 0,
        category_breakdown={cb["category"]: cb["total_co2e"] for cb in category_breakdown},
    )

    return {
        "daily_totals": daily_totals,
        "category_breakdown": category_breakdown,
        "current_month_total": current_month_total,
        "previous_month_total": previous_month_total if previous_month_total > 0 else None,
        "baseline_daily_avg": baseline_daily_avg,
        "trend_direction": trend,
        "world_state": world_state,
    }
