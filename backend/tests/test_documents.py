import json
import re

import pytest

from prelegal_backend.config import REPO_ROOT
from prelegal_backend.documents import DOCUMENTS, REGISTRY

# Defined terms that are not key terms: references to other documents.
NOT_KEY_TERMS = {"DPA"}


def normalize(term: str) -> str:
    """Folds possessives and plurals, e.g. "Customer’s" and "Customers" -> "customer"."""
    term = re.sub(r"['’]s$", "", term.strip())
    return term.removesuffix("s").lower()


def template_terms(template_id: str) -> set[str]:
    catalog = json.loads((REPO_ROOT / "catalog.json").read_text(encoding="utf-8"))
    filename = next(t["filename"] for t in catalog["templates"] if t["filename"].lower().endswith(f"/{template_id}.md"))
    text = (REPO_ROOT / filename).read_text(encoding="utf-8")
    return set(re.findall(r'<span class="\w+_link"[^>]*>([^<]+)</span>', text))


@pytest.mark.parametrize("spec", DOCUMENTS, ids=lambda spec: spec.id)
def test_registry_covers_every_defined_term(spec):
    covered = {normalize(f.label) for f in spec.fields}
    covered |= {normalize(role) for role in spec.roles}
    covered |= {normalize(t) for t in NOT_KEY_TERMS | {"Notice Address"}}  # Party details.

    missing = {
        term
        for template_id in spec.templates
        for term in template_terms(template_id)
        if normalize(term) not in covered
    }

    assert not missing, f"{spec.id}: add these defined terms to the registry: {sorted(missing)}"


def test_registry_covers_the_catalog():
    catalog = json.loads((REPO_ROOT / "catalog.json").read_text(encoding="utf-8"))
    template_ids = {t["filename"].split("/")[-1].removesuffix(".md").lower() for t in catalog["templates"]}
    # The NDA's cover page is part of the NDA; every other template is its own document.
    assert set(REGISTRY) == template_ids - {"mutual-nda-coverpage"}
    assert all(set(spec.templates) <= template_ids for spec in DOCUMENTS)


@pytest.mark.parametrize("spec", DOCUMENTS, ids=lambda spec: spec.id)
def test_field_keys_are_unique(spec):
    keys = [f.key for f in spec.fields]
    assert len(keys) == len(set(keys))


def test_list_documents(client):
    response = client.get("/api/documents")

    assert response.status_code == 200
    documents = response.json()
    assert [d["id"] for d in documents] == [spec.id for spec in DOCUMENTS]
    csa = next(d for d in documents if d["id"] == "csa")
    assert csa["roles"] == ["Provider", "Customer"]
    assert csa["fields"][0] == {
        "key": "effectiveDate",
        "label": "Effective Date",
        "description": "When the agreement takes effect.",
        "example": "",
        "required": True,
        "kind": "date",
    }
