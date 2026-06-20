"""Table-driven tests for the pure calculation engine.

Target: 100% coverage on the engine module.
Each test case: (activity_type, quantity, region) → expected kg CO₂e.
"""

import pytest
from app.engine.calculator import calculate, calculate_batch, calculate_total, compute_world_state


class TestCalculate:
    """Table-driven tests for the calculate() function."""

    @pytest.mark.parametrize("activity_type,quantity,region,expected", [
        # Household energy
        ("electricity", 1.0, "india", 0.736),
        ("electricity", 10.0, "india", 7.36),
        ("electricity", 0.0, "india", 0.0),
        ("lpg_cylinder", 1.0, "india", 42.5),
        ("png_piped_gas", 2.0, "india", 3.92),
        ("ac_usage", 4.0, "india", 4.416),
        ("geyser_water_heater", 0.5, "india", 0.736),
        ("refrigerator", 24.0, "india", 2.64),
        ("washing_machine", 1.0, "india", 0.736),
        ("ceiling_fan", 8.0, "india", 0.44),
        ("lighting_led", 6.0, "india", 0.0444),

        # Backup power
        ("diesel_generator", 2.0, "india", 13.4),
        ("inverter_battery_charging", 1.0, "india", 0.736),

        # Transport — zero emission
        ("walking", 5.0, "india", 0.0),
        ("cycling", 10.0, "india", 0.0),

        # Transport — motorized
        ("city_bus", 10.0, "india", 0.89),
        ("metro", 15.0, "india", 0.615),
        ("auto_rickshaw", 5.0, "india", 0.3),
        ("two_wheeler_petrol", 12.0, "india", 0.6),
        ("car_petrol", 20.0, "india", 3.4),
        ("car_diesel", 20.0, "india", 3.1),
        ("car_cng", 20.0, "india", 2.6),
        ("car_ev", 20.0, "india", 2.2),
        ("taxi_ridehail", 10.0, "india", 1.9),
        ("intercity_bus", 200.0, "india", 6.0),
        ("train_ac_class", 300.0, "india", 5.4),
        ("train_non_ac", 300.0, "india", 2.4),
        ("domestic_flight", 1000.0, "india", 255.0),
        ("international_flight", 5000.0, "india", 975.0),

        # Food
        ("vegetarian_meal", 1.0, "india", 0.7),
        ("non_veg_poultry", 1.0, "india", 1.8),
        ("non_veg_mutton", 1.0, "india", 7.0),
        ("non_veg_fish", 1.0, "india", 1.4),
        ("dairy_consumption", 0.5, "india", 0.7),
        ("eating_out", 1.0, "india", 2.5),
        ("food_delivery_order", 1.0, "india", 3.1),

        # Shopping
        ("clothing_item", 1.0, "india", 10.0),
        ("electronics_purchase", 1.0, "india", 50.0),
        ("general_goods", 1.0, "india", 5.0),

        # Waste
        ("household_waste_landfill", 2.0, "india", 1.16),
        ("household_waste_composted", 1.0, "india", 0.1),

        # Unknown activity
        ("nonexistent_activity", 5.0, "india", 0.0),
    ])
    def test_calculate(self, activity_type: str, quantity: float, region: str, expected: float):
        result = calculate(activity_type, quantity, region)
        assert abs(result - expected) < 0.01, f"Expected {expected}, got {result}"

    def test_negative_quantity_raises(self):
        with pytest.raises(ValueError, match="non-negative"):
            calculate("electricity", -5.0)

    def test_calculate_batch(self):
        items = [
            ("electricity", 10.0, "india"),
            ("car_petrol", 20.0, "india"),
            ("walking", 5.0, "india"),
        ]
        results = calculate_batch(items)
        assert len(results) == 3
        assert abs(results[0] - 7.36) < 0.01
        assert abs(results[1] - 3.4) < 0.01
        assert results[2] == 0.0

    def test_calculate_total(self):
        items = [
            ("electricity", 10.0, "india"),
            ("car_petrol", 20.0, "india"),
        ]
        total = calculate_total(items)
        assert abs(total - 10.76) < 0.01


class TestComputeWorldState:
    """Tests for the worldState = f(userMetrics) pure function."""

    def test_pristine_world(self):
        """Low emissions → pristine world (high scores)."""
        ws = compute_world_state(
            current_month_co2e=30.0,
            baseline_monthly_co2e=200.0,
            goal_target_co2e=200.0,
            streak_days=15,
        )
        assert ws["overall_score"] > 0.7
        assert ws["haze_density"] < 0.3
        assert ws["foliage_density"] > 0.7
        assert ws["river_clarity"] > 0.5
        assert ws["grove_size"] == 15
        assert ws["wildlife_count"] > 10

    def test_polluted_world(self):
        """High emissions → degraded world (low scores)."""
        ws = compute_world_state(
            current_month_co2e=400.0,
            baseline_monthly_co2e=200.0,
            goal_target_co2e=200.0,
            streak_days=0,
        )
        assert ws["overall_score"] < 0.4
        assert ws["haze_density"] > 0.5
        assert ws["foliage_density"] < 0.5
        assert ws["grove_size"] == 0
        assert ws["wildlife_count"] < 10

    def test_no_baseline(self):
        """World state with no baseline uses default reference."""
        ws = compute_world_state(
            current_month_co2e=100.0,
            baseline_monthly_co2e=None,
            goal_target_co2e=None,
            streak_days=5,
        )
        assert 0 <= ws["overall_score"] <= 1
        assert ws["grove_size"] == 5

    def test_grove_capped_at_30(self):
        ws = compute_world_state(100, 200, 200, streak_days=50)
        assert ws["grove_size"] == 30

    def test_all_values_bounded(self):
        """All normalized values are between 0 and 1."""
        for co2e in [0, 50, 100, 200, 500, 1000]:
            ws = compute_world_state(co2e, 200, 200, 10)
            assert 0 <= ws["haze_density"] <= 1
            assert 0 <= ws["foliage_density"] <= 1
            assert 0 <= ws["light_warmth"] <= 1
            assert 0 <= ws["river_clarity"] <= 1
            assert 0 <= ws["overall_score"] <= 1
