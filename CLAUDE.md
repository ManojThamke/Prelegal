# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The catalog has 12 entries covering 11 document types (the Mutual NDA has separate standard-terms and cover-page templates).
The goal is to support all of them via AI chat with user authentication and document persistence; see "Current status" below for what exists today.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use LiteLLM to call Google Gemini with the GEMINI_API_KEY (a Google AI Studio key, free tier): `gemini/gemini-2.5-flash`, falling back to `gemini/gemini-3.5-flash-lite` when rate-limited (free-tier quotas are per model; 2.5 Flash allows only 20 requests/day). You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is a GEMINI_API_KEY in the .env file in the project root. (The project originally used `openrouter/openai/gpt-oss-120b` on Cerebras via OpenRouter — see the Cerebras skill — but switched to Gemini because the OpenRouter account has no credits.)

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database should use SQLite and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.  
The frontend is statically built (Next.js `output: "export"`) and served by FastAPI.  
There should be scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

These are Tailwind tokens in `frontend/src/app/globals.css`: `brand-yellow`, `brand-blue`, `brand-purple`, `brand-navy`, `brand-gray`.

## Current status

Implemented (PL-3 templates, PL-4 NDA prototype, PL-5 V1 foundation, PL-6 AI chat, PL-7 all document types):
- **Backend** (`backend/src/prelegal_backend/`): FastAPI app factory `create_app()` in `main.py`. Endpoints: `GET /api/health`, `GET /api/templates` (catalog), `GET /api/templates/{id}` (markdown; id = lower-cased file stem, e.g. `mutual-nda`, `csa`). `GET /api/documents` (`documents.py`): the curated registry of the 11 draftable documents — party roles and key terms (label, description, example, required, text/date) per document; a test checks it covers every defined term in each template. `POST /api/chat` (`chat.py`): stateless AI chat turn — takes `{messages, draft, today}` where `draft = {documentId, fields, party1, party2}`; one Structured Outputs call returns `ChatTurn {reply, documentId, fieldUpdates: [{key, value}], party1, party2}`; the backend merges it (switching documents resets key terms, keeps parties) and, when a document is newly chosen, asks the model again with that document's key terms. Returns `{reply, draft}`; 429 when every model is rate-limited. The LLM is a FastAPI dependency (`get_chat_model`) so tests override it. Catalog validated at startup. Unknown `/api/*` → JSON 404. Serves `frontend/out` at `/`. Paths overridable via `PRELEGAL_*` env vars (`config.py`).
- **Database** (`db.py`): SQLite `users` table (id, email unique/case-insensitive, name, password_hash, created_at), deleted and recreated on every app start. Nothing reads or writes it yet. Keep uvicorn single-worker.
- **Frontend**: `/` is a fake sign-in (name + email in localStorage via `src/lib/session.ts`; no auth). `/draft/` is the drafting workspace: AI chat (`Chat.tsx`) that picks the document (or offers the closest supported one) and fills it in, beside the catalog until a document is chosen, then a live preview (`DocumentPreview.tsx`: Key Terms, signature table by role, Standard Terms) and PDF download (`DocumentPdf.tsx`). `src/lib/template.ts` parses every template format into nested clauses; `src/lib/documents.ts` holds the registry types and derived content.
- **Packaging**: multi-stage `Dockerfile`, `docker-compose.yml` (optional `.env`, healthcheck), scripts in `scripts/` (Mac/Linux wrappers share `start.sh`/`stop.sh`).
- **Tests**: `cd backend && uv run pytest` (live LLM test opt-in: `RUN_LLM_TESTS=1`); `cd frontend && npm test` (Vitest), `npm run lint`.
- **Dev**: backend `cd backend && uv run prelegal-backend` (:8000); frontend `npm run dev` (:3000, proxies `/api` to :8000).

Not yet implemented: real sign-up/sign-in, chat/document persistence.

