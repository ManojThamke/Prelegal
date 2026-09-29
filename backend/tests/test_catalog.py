import json

import pytest

from prelegal_backend.templates import load_catalog


def write_catalog(tmp_path, filenames):
    templates_dir = tmp_path / "templates"
    templates_dir.mkdir()
    for name in filenames:
        (templates_dir / name).write_text("# Template")
    catalog = tmp_path / "catalog.json"
    catalog.write_text(
        json.dumps(
            {
                "templates": [
                    {"name": n, "description": "", "filename": f"templates/{n}"}
                    for n in filenames
                ]
            }
        )
    )
    return catalog, templates_dir


def test_ids_are_lowercased_file_stems(tmp_path):
    catalog, templates_dir = write_catalog(tmp_path, ["Mutual-NDA.md", "CSA.md"])
    assert list(load_catalog(catalog, templates_dir)) == ["mutual-nda", "csa"]


def test_duplicate_ids_are_rejected(tmp_path):
    catalog, templates_dir = write_catalog(tmp_path, ["CSA.md", "csa.md"])
    with pytest.raises(ValueError, match="Duplicate template id"):
        load_catalog(catalog, templates_dir)


def test_missing_template_file_is_rejected(tmp_path):
    catalog, templates_dir = write_catalog(tmp_path, ["CSA.md"])
    (templates_dir / "CSA.md").unlink()
    with pytest.raises(FileNotFoundError, match="CSA.md"):
        load_catalog(catalog, templates_dir)
