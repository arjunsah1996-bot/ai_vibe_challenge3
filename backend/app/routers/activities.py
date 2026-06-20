"""Activity router — log, list, and manage emission activities."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.engine.calculator import calculate
from app.models.activity import Activity
from app.models.emission_factor import EmissionFactor
from app.models.user import User
from app.schemas.activity import ActivityCreate, ActivityListResponse, ActivityResponse
from app.services.rollup_service import update_rollup

router = APIRouter(prefix="/api/activities", tags=["activities"])


@router.post("", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
def log_activity(
    body: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Log a new activity — CO₂e is computed and stored immutably at this moment."""
    # Look up the emission factor
    factor = db.query(EmissionFactor).filter(EmissionFactor.id == body.factor_id).first()
    if not factor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Emission factor with id {body.factor_id} not found",
        )

    # Compute emissions using the pure engine
    computed_co2e = calculate(factor.activity_type, body.quantity, factor.region)

    # Determine timestamp
    logged_at = body.logged_at or datetime.now(timezone.utc)

    # Create activity record with immutable computed_co2e
    activity = Activity(
        user_id=current_user.id,
        factor_id=factor.id,
        quantity=body.quantity,
        computed_co2e=computed_co2e,
        logged_at=logged_at,
    )
    db.add(activity)
    db.flush()

    # Incrementally update the daily rollup
    update_rollup(db, current_user.id, logged_at.date(), factor.category, computed_co2e)

    db.commit()
    db.refresh(activity)

    return ActivityResponse(
        id=activity.id,
        factor_id=activity.factor_id,
        quantity=activity.quantity,
        computed_co2e=activity.computed_co2e,
        logged_at=activity.logged_at,
        category=factor.category,
        activity_type=factor.activity_type,
        unit=factor.unit,
    )


@router.get("", response_model=ActivityListResponse)
def list_activities(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List the current user's activities with optional category filtering."""
    query = (
        db.query(Activity, EmissionFactor)
        .join(EmissionFactor, Activity.factor_id == EmissionFactor.id)
        .filter(Activity.user_id == current_user.id)
    )

    if category:
        query = query.filter(EmissionFactor.category == category)

    total = query.count()
    items = (
        query.order_by(Activity.logged_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return ActivityListResponse(
        items=[
            ActivityResponse(
                id=a.id,
                factor_id=a.factor_id,
                quantity=a.quantity,
                computed_co2e=a.computed_co2e,
                logged_at=a.logged_at,
                category=f.category,
                activity_type=f.activity_type,
                unit=f.unit,
            )
            for a, f in items
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an activity and adjust the rollup."""
    activity = (
        db.query(Activity)
        .filter(Activity.id == activity_id, Activity.user_id == current_user.id)
        .first()
    )
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found",
        )

    factor = db.query(EmissionFactor).filter(EmissionFactor.id == activity.factor_id).first()

    # Adjust rollup (subtract the deleted amount)
    if factor:
        update_rollup(
            db, current_user.id,
            activity.logged_at.date(),
            factor.category,
            -activity.computed_co2e,
        )

    db.delete(activity)
    db.commit()
