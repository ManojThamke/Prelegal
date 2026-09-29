# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The catalog has 12 entries covering 11 document types (the Mutual NDA has separate standard-terms and cover-page templates).
All 11 can be drafted via AI chat. User authentication and document persistence are still to come; see "Current status" below.

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

Implemented: PL-3 templates, PL-4 NDA prototype, PL-5 V1 foundation, PL-6 AI chat, PL-7 all document types.

**Backend** (`backend/src/prelegal_backend/`)
- `main.py`: app factory `create_app()`; catalog validated at startup; unknown `/api/*` → JSON 404; serves `frontend/out` at `/`. Paths overridable via `PRELEGAL_*` env vars (`config.py`).
- Endpoints: `GET /api/health`; `GET /api/templates` and `/api/templates/{id}` (markdown; id = lower-cased file stem, e.g. `mutual-nda`, `csa`); `GET /api/documents`; `POST /api/chat`.
- `documents.py`: curated registry of the 11 draftable documents — template(s), two party roles, key terms (label as in the template, description, example, required, text/date). `test_documents.py` fails if a template's defined term (`*_link` span) isn't covered. To support a new template, add an entry here.
- `chat.py`: stateless chat turn. Request `{messages, draft, today}`, `draft = {documentId, fields, party1, party2}`. One Structured Outputs call returns `ChatTurn {reply, documentId, fieldUpdates: [{key, value}], party1, party2}`; `apply_turn` merges it (switching documents keeps parties and shared key terms; invalid dates ignored; empty values only clear optional terms). When a document is newly chosen, a follow-up call introduces its key terms (on failure the first turn is kept). Every reply ends with a question asking for the next missing value, with an example; `next_question` supplies one when the follow-up call fails. Model fallback 2.5 Flash → 3.5 Flash-Lite; 429 when all are rate-limited, 502 on other failures, 503 without `GEMINI_API_KEY`. The LLM is a FastAPI dependency (`get_chat_model`) so tests override it.
- `db.py`: SQLite `users` table (id, email unique/case-insensitive, name, password_hash, created_at), recreated on every start; not used yet. Keep uvicorn single-worker.

**Frontend** (`frontend/src/`)
- `/` fake sign-in (name + email in localStorage, `lib/session.ts`; no auth). `/draft/` workspace: `Chat.tsx` beside the document catalog until the AI picks a document, then `DocumentPreview.tsx` (Key Terms, signature table by role, Standard Terms) and PDF download (`DocumentPdf.tsx`).
- `lib/template.ts` parses every template format into nested clauses; `lib/documents.ts` holds registry types and derived content (key terms, missing items, file name).

**Packaging & dev**
- Multi-stage `Dockerfile`, `docker-compose.yml` (optional `.env`, healthcheck), scripts in `scripts/` (Mac/Linux wrappers share `start.sh`/`stop.sh`). Port 8000 must be free.
- Tests: `cd backend && uv run pytest` (live LLM tests: `RUN_LLM_TESTS=1`; they use the daily Gemini quota); `cd frontend && npm test`, `npm run lint`.
- Dev: `cd backend && uv run prelegal-backend` (:8000); `cd frontend && npm run dev` (:3000, proxies `/api` to :8000).

Not yet implemented: real sign-up/sign-in (and auth on `/api/chat`), chat/document persistence.

