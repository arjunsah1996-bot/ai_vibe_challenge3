"""Emission factors router — list, create, update, delete factors."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.activity import Activity
from app.models.emission_factor import EmissionFactor
from app.models.user import User
from app.schemas.factor import CategoryInfo, FactorCreate, FactorResponse, FactorUpdate

router = APIRouter(prefix="/api/factors", tags=["factors"])


@router.get("", response_model=list[FactorResponse])
def list_factors(db: Session = Depends(get_db)):
    """List all available emission factors."""
    factors = db.query(EmissionFactor).order_by(EmissionFactor.category, EmissionFactor.activity_type).all()
    return [FactorResponse.model_validate(f) for f in factors]


@router.get("/categories", response_model=list[CategoryInfo])
def list_categories(db: Session = Depends(get_db)):
    """List emission factors grouped by category."""
    factors = db.query(EmissionFactor).order_by(EmissionFactor.category, EmissionFactor.activity_type).all()

    categories: dict[str, list[FactorResponse]] = {}
    for f in factors:
        cat = f.category
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(FactorResponse.model_validate(f))

    return [
        CategoryInfo(category=cat, activities=activities)
        for cat, activities in categories.items()
    ]


@router.post("", response_model=FactorResponse, status_code=status.HTTP_201_CREATED)
def create_factor(
    body: FactorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new emission factor."""
    factor = EmissionFactor(
        category=body.category,
        activity_type=body.activity_type,
        region=body.region,
        unit=body.unit,
        kg_co2e_per_unit=body.kg_co2e_per_unit,
        source=body.source,
        version="v1",
        effective_from=date.today(),
    )
    db.add(factor)
    db.commit()
    db.refresh(factor)
    return FactorResponse.model_validate(factor)


@router.patch("/{factor_id}", response_model=FactorResponse)
def update_factor(
    factor_id: int,
    body: FactorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing emission factor."""
    factor = db.query(EmissionFactor).filter(EmissionFactor.id == factor_id).first()
    if not factor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Emission factor not found")

    if body.category is not None:
        factor.category = body.category
    if body.activity_type is not None:
        factor.activity_type = body.activity_type
    if body.region is not None:
        factor.region = body.region
    if body.unit is not None:
        factor.unit = body.unit
    if body.kg_co2e_per_unit is not None:
        factor.kg_co2e_per_unit = body.kg_co2e_per_unit
    if body.source is not None:
        factor.source = body.source

    db.commit()
    db.refresh(factor)
    return FactorResponse.model_validate(factor)


@router.delete("/{factor_id}", status_code=status.HTTP_200_OK)
def delete_factor(
    factor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an emission factor. Fails if activities reference it."""
    factor = db.query(EmissionFactor).filter(EmissionFactor.id == factor_id).first()
    if not factor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Emission factor not found")

    # Guard: check if any activities reference this factor
    usage_count = db.query(Activity).filter(Activity.factor_id == factor_id).count()
    if usage_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete: {usage_count} logged activities reference this factor",
        )

    db.delete(factor)
    db.commit()
    return {"message": "Emission factor deleted successfully"}
