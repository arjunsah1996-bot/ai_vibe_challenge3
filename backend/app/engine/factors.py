"""Versioned emission-factor loader.

Loads factor data from the JSON file into an in-memory lookup structure.
This module performs ONE I/O operation (reading the JSON file) at import time.
After that, all lookups are pure in-memory dictionary reads.
"""

import json
from pathlib import Path
from typing import TypedDict


class FactorData(TypedDict):
    """Shape of a single factor record from the JSON file."""
    category: str
    activity_type: str
    region: str
    unit: str
    kg_co2e_per_unit: float
    source: str
    default_quantity: float


# Resolve path relative to this file → ../data/emission_factors.json
_DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "emission_factors.json"


def _load_factors() -> dict[str, FactorData]:
    """Load the factor JSON and build a lookup keyed by (activity_type, region).

    Returns a dict where key = "activity_type::region" and value = FactorData.
    """
    with open(_DATA_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)

    lookup: dict[str, FactorData] = {}
    for factor in raw["factors"]:
        key = f"{factor['activity_type']}::{factor['region']}"
        lookup[key] = factor
    return lookup


def _load_metadata() -> dict:
    """Load metadata section from the factor JSON."""
    with open(_DATA_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return raw.get("metadata", {})


# Module-level singletons — loaded once
FACTORS: dict[str, FactorData] = _load_factors()
METADATA: dict = _load_metadata()


def get_factor(activity_type: str, region: str = "india") -> FactorData | None:
    """Look up a factor by activity type and region.

    Returns None if no matching factor is found.
    """
    return FACTORS.get(f"{activity_type}::{region}")


def get_all_factors() -> list[FactorData]:
    """Return all loaded factors as a list."""
    return list(FACTORS.values())


def get_categories() -> dict[str, list[FactorData]]:
    """Return factors grouped by category."""
    categories: dict[str, list[FactorData]] = {}
    for factor in FACTORS.values():
        cat = factor["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(factor)
    return categories


def get_version() -> str:
    """Return the current factor dataset version."""
    return METADATA.get("version", "v1")
