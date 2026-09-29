"""Runtime settings, read from environment variables.

The defaults point at the repository layout so the backend runs straight from a
checkout; the Docker image overrides them with its own paths.
"""

import os
from dataclasses import dataclass
from pathlib import Path

# backend/src/prelegal_backend/config.py -> repository root
REPO_ROOT = Path(__file__).resolve().parents[3]


@dataclass(frozen=True)
class Settings:
    catalog_path: Path
    templates_dir: Path
    static_dir: Path
    database_path: Path

    @classmethod
    def from_env(cls) -> "Settings":
        def path(name: str, default: Path) -> Path:
            return Path(os.environ.get(name, default))

        return cls(
            catalog_path=path("PRELEGAL_CATALOG_PATH", REPO_ROOT / "catalog.json"),
            templates_dir=path("PRELEGAL_TEMPLATES_DIR", REPO_ROOT / "templates"),
            static_dir=path("PRELEGAL_STATIC_DIR", REPO_ROOT / "frontend" / "out"),
            database_path=path(
                "PRELEGAL_DATABASE_PATH", REPO_ROOT / "backend" / "data" / "prelegal.db"
            ),
        )
