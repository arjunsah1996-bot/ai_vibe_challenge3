"""Seed script — creates a demo user with 2+ weeks of realistic activity data.

Run: python -m app.seed_data
"""

import random
from datetime import date, datetime, timedelta, timezone

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.engine.calculator import calculate
from app.models.activity import Activity
from app.models.daily_rollup import DailyRollup
from app.models.emission_factor import EmissionFactor
from app.models.goal import Goal
from app.models.user import User


def seed():
    """Seed the database with a demo user and 2 weeks of realistic activity data."""
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if demo user exists
        existing = db.query(User).filter(User.email == "demo@ecosphere.app").first()
        if existing:
            print("[WARN] Demo user already exists. Skipping seed.")
            return

        # Seed emission factors first (in case main.py hasn't run)
        from app.main import _seed_emission_factors
        _seed_emission_factors()

        # Create demo user
        user = User(
            email="demo@ecosphere.app",
            password_hash=hash_password("demo1234"),
            region="india",
            household_size=3,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        print(f"[OK] Created demo user: demo@ecosphere.app / demo1234 (id={user.id})")

        # Load all factors
        factors = {f.activity_type: f for f in db.query(EmissionFactor).all()}

        # Define daily activity patterns (realistic Indian household)
        weekday_activities = [
            ("electricity", 6.0, 2.0),      # 6 kWh ± 2
            ("ceiling_fan", 10.0, 4.0),      # 10 hours ± 4
            ("lighting_led", 6.0, 2.0),      # 6 hours ± 2
            ("refrigerator", 24.0, 0.0),     # Always running
            ("two_wheeler_petrol", 12.0, 4.0),  # 12 km ± 4
            ("city_bus", 5.0, 3.0),          # 5 km ± 3
            ("vegetarian_meal", 2.0, 0.5),   # 2 meals ± 0.5
            ("dairy_consumption", 0.5, 0.2), # 0.5L ± 0.2
        ]

        weekend_activities = [
            ("electricity", 8.0, 3.0),       # More at home
            ("ac_usage", 4.0, 2.0),          # AC on weekends
            ("ceiling_fan", 14.0, 4.0),
            ("lighting_led", 8.0, 2.0),
            ("refrigerator", 24.0, 0.0),
            ("car_petrol", 15.0, 10.0),      # Weekend drives
            ("vegetarian_meal", 2.0, 0.5),
            ("non_veg_poultry", 0.5, 0.5),   # Occasional non-veg
            ("eating_out", 0.5, 0.5),        # Weekend eating out
            ("dairy_consumption", 0.6, 0.2),
        ]

        # Occasional activities (randomly sprinkled)
        occasional_activities = [
            ("food_delivery_order", 1.0, 0.0, 0.15),   # 15% chance per day
            ("auto_rickshaw", 5.0, 3.0, 0.10),          # 10% chance
            ("metro", 12.0, 5.0, 0.08),                 # 8% chance
            ("washing_machine", 1.0, 0.0, 0.20),        # 20% chance
            ("geyser_water_heater", 0.3, 0.1, 0.25),    # 25% chance
            ("household_waste_landfill", 1.5, 0.5, 0.30), # 30% chance
            ("clothing_item", 1.0, 0.0, 0.03),          # 3% chance
            ("lpg_cylinder", 1.0, 0.0, 0.05),           # 5% chance (once a month-ish)
        ]

        # Generate 16 days of data (2+ weeks)
        today = date.today()
        start_date = today - timedelta(days=15)
        rollup_map: dict[tuple, float] = {}  # (user_id, date, category) -> total_co2e
        activity_count = 0

        for day_offset in range(16):
            current_date = start_date + timedelta(day_offset)
            is_weekend = current_date.weekday() >= 5
            activities = weekend_activities if is_weekend else weekday_activities

            # Log regular activities
            for activity_type, base_qty, variation in activities:
                if activity_type not in factors:
                    continue

                factor = factors[activity_type]
                # Add natural variation
                qty = max(0.1, base_qty + random.uniform(-variation, variation))
                qty = round(qty, 2)

                co2e = calculate(activity_type, qty, "india")

                logged_at = datetime(
                    current_date.year, current_date.month, current_date.day,
                    random.randint(6, 22), random.randint(0, 59),
                    tzinfo=timezone.utc,
                )

                activity = Activity(
                    user_id=user.id,
                    factor_id=factor.id,
                    quantity=qty,
                    computed_co2e=co2e,
                    logged_at=logged_at,
                )
                db.add(activity)
                activity_count += 1

                # Accumulate rollups
                key = (user.id, current_date, factor.category)
                rollup_map[key] = rollup_map.get(key, 0.0) + co2e

            # Sprinkle occasional activities
            for activity_type, base_qty, variation, probability in occasional_activities:
                if random.random() > probability:
                    continue
                if activity_type not in factors:
                    continue

                factor = factors[activity_type]
                qty = max(0.1, base_qty + random.uniform(-variation, variation))
                qty = round(qty, 2)
                co2e = calculate(activity_type, qty, "india")

                logged_at = datetime(
                    current_date.year, current_date.month, current_date.day,
                    random.randint(8, 21), random.randint(0, 59),
                    tzinfo=timezone.utc,
                )

                activity = Activity(
                    user_id=user.id,
                    factor_id=factor.id,
                    quantity=qty,
                    computed_co2e=co2e,
                    logged_at=logged_at,
                )
                db.add(activity)
                activity_count += 1

                key = (user.id, current_date, factor.category)
                rollup_map[key] = rollup_map.get(key, 0.0) + co2e

        # Create rollup records
        for (uid, d, category), total in rollup_map.items():
            rollup = DailyRollup(
                user_id=uid,
                date=d,
                category=category,
                total_co2e=round(total, 4),
            )
            db.add(rollup)

        # Create a goal
        total_emissions = sum(rollup_map.values())
        avg_daily = total_emissions / 16
        monthly_baseline = round(avg_daily * 30, 2)
        target = round(monthly_baseline * 0.8, 2)  # 20% reduction target

        goal = Goal(
            user_id=user.id,
            target_kg_per_month=target,
            baseline_kg=monthly_baseline,
            streak_count=7,  # Simulated streak
        )
        db.add(goal)

        db.commit()
        print(f"[OK] Seeded {activity_count} activities across 16 days")
        print(f"[OK] Created {len(rollup_map)} rollup records")
        print(f"[OK] Set goal: {target} kg/month (baseline: {monthly_baseline} kg/month)")
        print(f"[INFO] Average daily emissions: {round(avg_daily, 2)} kg CO2e")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
