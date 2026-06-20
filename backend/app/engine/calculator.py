"""Pure emission calculation engine — ZERO I/O, ZERO database access.

Every function in this module is deterministic and side-effect-free.
Input: activity description + quantity → Output: kg CO₂e.

This is the intellectual core of EcoSphere, designed for 100% unit-test coverage.
"""

from app.engine.factors import get_factor


def calculate(activity_type: str, quantity: float, region: str = "india") -> float:
    """Calculate emissions for a single activity.

    Args:
        activity_type: The type of activity (must match a key in emission_factors.json).
        quantity: How much of the activity (in the factor's unit).
        region: Geographic region for factor lookup (default: "india").

    Returns:
        Emissions in kg CO₂e. Returns 0.0 if no factor is found.

    Raises:
        ValueError: If quantity is negative.
    """
    if quantity < 0:
        raise ValueError(f"Quantity must be non-negative, got {quantity}")

    factor = get_factor(activity_type, region)
    if factor is None:
        return 0.0

    return round(quantity * factor["kg_co2e_per_unit"], 4)


def calculate_batch(
    items: list[tuple[str, float, str]],
) -> list[float]:
    """Calculate emissions for multiple activities.

    Args:
        items: List of (activity_type, quantity, region) tuples.

    Returns:
        List of kg CO₂e values, one per input item.
    """
    return [calculate(activity_type, quantity, region) for activity_type, quantity, region in items]


def calculate_total(
    items: list[tuple[str, float, str]],
) -> float:
    """Calculate total emissions for multiple activities.

    Args:
        items: List of (activity_type, quantity, region) tuples.

    Returns:
        Total kg CO₂e across all items.
    """
    return round(sum(calculate_batch(items)), 4)


def compute_world_state(
    current_month_co2e: float,
    baseline_monthly_co2e: float | None,
    goal_target_co2e: float | None,
    streak_days: int,
    category_breakdown: dict[str, float] | None = None,
) -> dict[str, float | int]:
    """Pure function: user metrics → 3D scene parameters.

    This is the worldState = f(userMetrics) mapping function.
    All output values are normalized 0.0–1.0 unless noted.

    Args:
        current_month_co2e: Total emissions this month in kg.
        baseline_monthly_co2e: User's baseline monthly average (from first 14 days). None if not yet established.
        goal_target_co2e: User's monthly goal in kg. None if no goal set.
        streak_days: Consecutive days of logging/under budget.
        category_breakdown: Optional dict of category → total_co2e for diversity weighting.

    Returns:
        Dict with keys: haze_density, foliage_density, light_warmth, river_clarity,
        grove_size, wildlife_count, overall_score.
    """
    # Reference: use baseline if available, else a reasonable India average (~200 kg/month)
    reference = baseline_monthly_co2e if baseline_monthly_co2e and baseline_monthly_co2e > 0 else 200.0

    # Ratio of current vs reference (1.0 = at baseline, <1.0 = better, >1.0 = worse)
    ratio = current_month_co2e / reference if reference > 0 else 1.0

    # Overall score: 1.0 = pristine, 0.0 = heavily polluted
    # Clamped between 0 and 1, inverse of ratio with smooth falloff
    overall_score = max(0.0, min(1.0, 1.0 - (ratio - 0.3) / 1.4))

    # Haze: 0 = clear, 1 = heavy haze (inverse of score)
    haze_density = round(1.0 - overall_score, 3)

    # Foliage: dense when score is high
    foliage_density = round(overall_score, 3)

    # Light warmth: golden-hour warmth when score is high
    light_warmth = round(0.3 + 0.7 * overall_score, 3)

    # River clarity: driven by goal progress
    if goal_target_co2e and goal_target_co2e > 0:
        goal_ratio = current_month_co2e / goal_target_co2e
        river_clarity = round(max(0.0, min(1.0, 1.0 - (goal_ratio - 0.3) / 1.0)), 3)
    else:
        river_clarity = round(overall_score * 0.8, 3)

    # Grove size: one tree per streak day, capped at 30
    grove_size = min(streak_days, 30)

    # Wildlife: proportional to overall score, 0-20 range
    wildlife_count = int(overall_score * 20)

    return {
        "haze_density": haze_density,
        "foliage_density": foliage_density,
        "light_warmth": light_warmth,
        "river_clarity": river_clarity,
        "grove_size": grove_size,
        "wildlife_count": wildlife_count,
        "overall_score": round(overall_score, 3),
    }
