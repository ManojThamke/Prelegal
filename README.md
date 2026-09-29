# Prelegal

> **Status: 🚧 In progress** — this project is under active development and is expected to be completed within 1 week (by **October 6, 2026**).

Draft legal agreements from [Common Paper](https://github.com/CommonPaper) templates.

## Running

Requires Docker. The app is packaged as a single container: FastAPI serves the API and
the statically built Next.js frontend at http://localhost:8000.

```bash
# Mac
scripts/start-mac.sh
scripts/stop-mac.sh

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows (PowerShell)
scripts/start-windows.ps1
scripts/stop-windows.ps1
```

Environment variables are read from `.env` in the project root, if present. The SQLite
database is temporary and starts empty every time the app starts.

## Layout

- `backend/` — FastAPI app (uv project). See [backend/README.md](backend/README.md).
- `frontend/` — Next.js app. See [frontend/README.md](frontend/README.md).
- `templates/`, `catalog.json` — the Common Paper templates and their catalog.
- `scripts/` — start/stop scripts.
