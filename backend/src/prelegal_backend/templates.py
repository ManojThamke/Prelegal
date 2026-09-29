"""The legal template catalog (catalog.json) and the /api/templates endpoints."""

import json
from dataclasses import dataclass
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel


class TemplateSummary(BaseModel):
    id: str
    name: str
    description: str


class Template(TemplateSummary):
    content: str


@dataclass(frozen=True)
class CatalogEntry:
    summary: TemplateSummary
    path: Path


def load_catalog(catalog_path: Path, templates_dir: Path) -> dict[str, CatalogEntry]:
    """Reads catalog.json, keyed by a URL-safe id derived from each template's filename.

    Fails fast on a duplicate id or a missing template file, so a bad catalog is caught
    at startup rather than on the first request.
    """
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    entries: dict[str, CatalogEntry] = {}
    for item in catalog["templates"]:
        path = templates_dir / Path(item["filename"]).name
        template_id = path.stem.lower()
        if template_id in entries:
            raise ValueError(f"Duplicate template id in {catalog_path}: {template_id}")
        if not path.is_file():
            raise FileNotFoundError(f"Template listed in {catalog_path} not found: {path}")
        summary = TemplateSummary(
            id=template_id, name=item["name"], description=item["description"]
        )
        entries[template_id] = CatalogEntry(summary=summary, path=path)
    return entries


router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("")
def list_templates(request: Request) -> list[TemplateSummary]:
    return [entry.summary for entry in request.app.state.catalog.values()]


@router.get("/{template_id}")
def get_template(template_id: str, request: Request) -> Template:
    entry = request.app.state.catalog.get(template_id)
    if entry is None:
        raise HTTPException(status_code=404, detail=f"Unknown template: {template_id}")
    return Template(**entry.summary.model_dump(), content=entry.path.read_text(encoding="utf-8"))
