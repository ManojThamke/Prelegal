# Prelegal backend

FastAPI app (a [uv](https://docs.astral.sh/uv/) project) that serves the JSON API under
`/api` and the statically exported frontend at `/`.

## Endpoints

- `GET /api/health` — liveness check.
- `GET /api/templates` — the template catalog (`../catalog.json`) as `{id, name, description}`.
- `GET /api/templates/{id}` — one template, including its markdown `content`.
  Ids are the lower-cased file names, e.g. `mutual-nda`, `csa`, `ai-addendum`.

## Database

SQLite with a `users` table, ready for sign-up and sign-in. The database is temporary:
it is deleted and recreated every time the app starts (`src/prelegal_backend/db.py`).

## Development

```bash
cd backend
uv sync
uv run prelegal-backend   # http://localhost:8000
uv run pytest
```

The frontend is served only if it has been built (`cd ../frontend && npm run build`).
Paths can be overridden with `PRELEGAL_CATALOG_PATH`, `PRELEGAL_TEMPLATES_DIR`,
`PRELEGAL_STATIC_DIR` and `PRELEGAL_DATABASE_PATH`.
