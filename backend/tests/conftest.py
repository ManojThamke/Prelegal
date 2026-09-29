from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from prelegal_backend.config import REPO_ROOT, Settings
from prelegal_backend.main import create_app


@pytest.fixture
def static_dir(tmp_path: Path) -> Path:
    """A stand-in for the exported frontend (`next build` with trailingSlash)."""
    out = tmp_path / "out"
    (out / "nda").mkdir(parents=True)
    (out / "index.html").write_text("<h1>Sign in</h1>")
    (out / "nda" / "index.html").write_text("<h1>NDA</h1>")
    (out / "404.html").write_text("<h1>Not found</h1>")
    return out


@pytest.fixture
def settings(tmp_path: Path, static_dir: Path) -> Settings:
    return Settings(
        catalog_path=REPO_ROOT / "catalog.json",
        templates_dir=REPO_ROOT / "templates",
        static_dir=static_dir,
        database_path=tmp_path / "data" / "prelegal.db",
    )


@pytest.fixture
def client(settings: Settings):
    with TestClient(create_app(settings)) as client:
        yield client
