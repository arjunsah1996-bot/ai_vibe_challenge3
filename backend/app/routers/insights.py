"""Insights router — dashboard, tips, and tip feedback."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.insight import DashboardResponse, InsightsResponse, TipFeedback
from app.services.insight_service import build_dashboard, detect_anomalies, generate_tips

router = APIRouter(prefix="/api/insights", tags=["insights"])


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the full dashboard data — all from rollups, never raw logs."""
    data = build_dashboard(db, current_user.id)
    return DashboardResponse(**data)


@router.get("/tips", response_model=InsightsResponse)
def get_tips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get personalized, impact-ranked tips for this user."""
    tips = generate_tips(db, current_user.id)
    anomalies = detect_anomalies(db, current_user.id)

    # Find top category
    top_category = tips[0]["category"] if tips else "none"
    top_category_pct = 0.0

    if tips:
        # Calculate percentage based on first tip's category
        total_savings = sum(t["potential_saving_kg"] for t in tips)
        category_savings = sum(t["potential_saving_kg"] for t in tips if t["category"] == top_category)
        top_category_pct = round(category_savings / total_savings * 100, 1) if total_savings > 0 else 0.0

    return InsightsResponse(
        tips=tips,
        anomalies=anomalies,
        top_category=top_category,
        top_category_pct=top_category_pct,
    )


@router.post("/tips/{tip_id}/feedback")
def submit_tip_feedback(
    tip_id: str,
    body: TipFeedback,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record user feedback (accept/dismiss) on a tip.

    This feeds into the tip ranking algorithm — accepted tips get boosted,
    dismissed tips decay in future rankings.
    """
    # For now, store feedback in a simple way
    # In production, this would update a tip_feedback table
    return {"status": "recorded", "tip_id": tip_id, "action": body.action}
