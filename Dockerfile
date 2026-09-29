# syntax=docker/dockerfile:1

# ---- Frontend: static export of the Next.js app ----
FROM node:24-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Backend: FastAPI serving the API and the exported frontend ----
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:0.12 /uv /uvx /bin/
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/.venv

WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock backend/.python-version ./
RUN uv sync --frozen --no-dev --no-install-project
COPY backend/ ./
RUN uv sync --frozen --no-dev

COPY catalog.json /app/catalog.json
COPY templates/ /app/templates/
COPY --from=frontend /app/frontend/out /app/static

RUN useradd --system --no-create-home prelegal \
    && mkdir /app/data \
    && chown prelegal /app/data
USER prelegal

ENV PATH="/app/.venv/bin:$PATH" \
    PRELEGAL_CATALOG_PATH=/app/catalog.json \
    PRELEGAL_TEMPLATES_DIR=/app/templates \
    PRELEGAL_STATIC_DIR=/app/static \
    PRELEGAL_DATABASE_PATH=/app/data/prelegal.db

EXPOSE 8000
# Keep a single uvicorn worker: each worker process would recreate (wipe) the database on startup.
CMD ["uvicorn", "prelegal_backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
