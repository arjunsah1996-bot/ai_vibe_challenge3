"""Goals router — set monthly targets, track streaks, measure progress."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.goal import Goal
from app.models.user import User
from app.schemas.goal import GoalCreate, GoalResponse, GoalUpdate
from app.services.insight_service import compute_baseline
from app.services.rollup_service import get_month_total

router = APIRouter(prefix="/api/goals", tags=["goals"])


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    body: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set a new monthly emissions goal."""
    # Compute baseline from user's historical data
    baseline = compute_baseline(db, current_user.id)
    baseline_kg = round(sum(baseline.values()) * 30, 2) if baseline else None

    goal = Goal(
        user_id=current_user.id,
        target_kg_per_month=body.target_kg_per_month,
        baseline_kg=baseline_kg,
        streak_count=0,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    return _enrich_goal(db, goal)


@router.get("", response_model=GoalResponse | None)
def get_current_goal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the user's most recent goal with progress data."""
    goal = (
        db.query(Goal)
        .filter(Goal.user_id == current_user.id)
        .order_by(Goal.created_at.desc())
        .first()
    )
    if not goal:
        return None

    return _enrich_goal(db, goal)


@router.patch("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    body: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing goal's target or streak."""
    goal = (
        db.query(Goal)
        .filter(Goal.id == goal_id, Goal.user_id == current_user.id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    if body.target_kg_per_month is not None:
        goal.target_kg_per_month = body.target_kg_per_month
    if body.streak_count is not None:
        goal.streak_count = body.streak_count

    db.commit()
    db.refresh(goal)

    return _enrich_goal(db, goal)


def _enrich_goal(db: Session, goal: Goal) -> GoalResponse:
    """Add computed progress fields to a goal response."""
    today = date.today()
    current_month_co2e = get_month_total(db, goal.user_id, today.year, today.month)
    progress_pct = round(current_month_co2e / goal.target_kg_per_month * 100, 1) if goal.target_kg_per_month > 0 else 0.0
    days_in_month = 30  # Simplified
    daily_budget = round((goal.target_kg_per_month - current_month_co2e) / max(1, days_in_month - today.day), 2)

    return GoalResponse(
        id=goal.id,
        target_kg_per_month=goal.target_kg_per_month,
        baseline_kg=goal.baseline_kg,
        streak_count=goal.streak_count,
        created_at=goal.created_at,
        current_month_co2e=current_month_co2e,
        progress_pct=progress_pct,
        daily_budget=max(0, daily_budget),
    )
