"""External database API."""

import json
import logging
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse
from pydantic import ValidationError

from spoolman.env import is_tigertag_enabled
from spoolman.externaldb import ExternalFilament, ExternalMaterial, get_filaments_file, get_materials_file
from spoolman.tigertagdb import get_tigertag_filaments_file

router = APIRouter(
    prefix="/external",
    tags=["external"],
)


logger = logging.getLogger(__name__)


def _load_filament_source(path: Path, source: str) -> list[dict]:
    """Read a filament JSON cache file, tagging each entry with its source. Returns [] on any error."""
    try:
        if not path.exists():
            return []
        data = json.loads(path.read_bytes())
        for entry in data:
            entry.setdefault("source", source)
    except Exception:
        logger.exception("Failed to load %s filaments", source)
        return []
    return data


def _validate_external_filament(entry: dict) -> ExternalFilament | None:
    """Validate one raw entry; return None (and log) if it does not conform."""
    try:
        return ExternalFilament.model_validate(entry)
    except ValidationError:
        logger.warning("Skipping malformed external filament entry: %s", entry.get("id", "<unknown>"))
        return None


@router.get(
    "/filament",
    name="Get all external filaments",
    response_model_exclude_none=True,
)
async def filaments() -> list[ExternalFilament]:
    """Get all external filaments from all sources."""
    merged: list[dict] = _load_filament_source(get_filaments_file(), "spoolmandb")
    if is_tigertag_enabled():
        merged.extend(_load_filament_source(get_tigertag_filaments_file(), "tigertag"))

    # Return validated models so FastAPI applies the declared response_model (validation +
    # exclude_none) instead of emitting the raw merged dicts; malformed entries are dropped above
    # rather than 500-ing the whole endpoint.
    return [model for model in (_validate_external_filament(e) for e in merged) if model is not None]


@router.get(
    "/material",
    name="Get all external materials",
    response_model_exclude_none=True,
    response_model=list[ExternalMaterial],
)
async def materials() -> FileResponse:
    """Get all external materials."""
    return FileResponse(path=get_materials_file(), media_type="application/json")
