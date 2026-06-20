"""EcoSphere — Carbon Footprint Tracker API.

FastAPI application with CORS, rate limiting, and auto-documentation.
Visit /docs for the interactive OpenAPI documentation.
"""

import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.database import Base, engine
from app.models.activity import Activity  # noqa: F401
from app.models.daily_rollup import DailyRollup  # noqa: F401
from app.models.emission_factor import EmissionFactor  # noqa: F401
from app.models.goal import Goal  # noqa: F401
from app.models.user import User  # noqa: F401
from app.routers import activities, auth, factors, goals, insights

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


def _seed_emission_factors():
    """Seed emission factors from JSON if the table is empty."""
    from sqlalchemy.orm import Session as SessionType
    from app.core.database import SessionLocal

    db: SessionType = SessionLocal()
    try:
        count = db.query(EmissionFactor).count()
        if count > 0:
            return  # Already seeded

        data_path = Path(__file__).resolve().parent.parent / "data" / "emission_factors.json"
        with open(data_path, "r", encoding="utf-8") as f:
            raw = json.load(f)

        version = raw.get("metadata", {}).get("version", "v1")
        effective_from_str = raw.get("metadata", {}).get("effective_from", "2025-01-01")

        from datetime import date
        effective_from = date.fromisoformat(effective_from_str)

        for factor_data in raw["factors"]:
            factor = EmissionFactor(
                category=factor_data["category"],
                activity_type=factor_data["activity_type"],
                region=factor_data.get("region", "india"),
                unit=factor_data["unit"],
                kg_co2e_per_unit=factor_data["kg_co2e_per_unit"],
                source=factor_data["source"],
                version=version,
                effective_from=effective_from,
            )
            db.add(factor)

        db.commit()
        print(f"[OK] Seeded {len(raw['factors'])} emission factors (version {version})")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — create tables and seed data on startup."""
    Base.metadata.create_all(bind=engine)
    _seed_emission_factors()
    yield


app = FastAPI(
    title="EcoSphere — Carbon Footprint Tracker",
    description="Track, understand, and reduce your carbon footprint with personalized insights.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — locked to frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Mount routers
app.include_router(auth.router)
app.include_router(activities.router)
app.include_router(factors.router)
app.include_router(insights.router)
app.include_router(goals.router)


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "ecosphere"}
