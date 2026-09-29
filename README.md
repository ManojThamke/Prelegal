# Prelegal

Draft legal agreements by chatting with an AI assistant. Tell Prelegal what you need; it
picks the right [Common Paper](https://github.com/CommonPaper) standard agreement, asks you
for the details one question at a time, fills in a live preview as you answer, and lets you
download the finished draft as a PDF.

> **Status: complete.** All planned features (PL-3 to PL-8) are implemented and tested.

> Prelegal documents are drafts generated with AI assistance. They are not legal advice and
> should be reviewed by a qualified lawyer before you sign or rely on them.

## Features

- **Conversational drafting.** The assistant works out which agreement fits your situation,
  asks for each key term (with an example), and fills in the document as you answer. If you
  ask for something it can't draft, it says so and suggests the closest agreement it can.
- **Eleven agreements** (below), each with a live preview and a PDF download.
- **Accounts and saved documents.** Sign up and sign in; every document is saved as you work
  on it. The **Documents** page lists your drafts, and reopening one restores both the
  document and the conversation so you can carry on.
- **Clear status.** Missing details are highlighted in the preview and listed above it; the
  PDF download unlocks once everything required is filled in.

### Supported agreements

| Agreement | Use it for |
| --- | --- |
| Mutual Non-Disclosure Agreement | Sharing confidential information to explore or pursue a relationship |
| Cloud Service Agreement | Selling or buying SaaS |
| Service Level Agreement | Uptime and support commitments, with service credits |
| Data Processing Agreement | Processing customer personal data (GDPR and similar laws) |
| Design Partner Agreement | Early access to a product in exchange for feedback |
| Professional Services Agreement | Services and deliverables under statements of work |
| Partnership Agreement | A business partnership between two companies |
| Business Associate Agreement | HIPAA terms for protected health information |
| Software License Agreement | Licensing on-premise or self-hosted software |
| Pilot Agreement | A limited-time trial before a full commercial agreement |
| AI Addendum | AI-specific terms added to a services agreement |

## Getting started

### Requirements

- [Docker](https://docs.docker.com/get-docker/) with Compose (Docker Engine 25 or later).
- A Google AI Studio API key for Gemini — [get one free](https://aistudio.google.com/apikey).

### Run it

1. Copy `.env.example` to `.env` and set your key:

   ```bash
   GEMINI_API_KEY=your-key-here
   ```

2. Start Prelegal (it builds the image the first time):

   ```bash
   scripts/start-mac.sh          # macOS
   scripts/start-linux.sh        # Linux
   scripts/start-windows.ps1     # Windows (PowerShell)
   ```

3. Open **http://localhost:8000**, create an account, and choose **New document**.

To stop it, run `scripts/stop-mac.sh`, `scripts/stop-linux.sh`, or
`scripts/stop-windows.ps1`. Port 8000 must be free.

> The database is temporary: accounts and documents are reset whenever Prelegal restarts.

## How it works

Prelegal runs as a single Docker container:

- **Backend** (`backend/`): a FastAPI app (a [uv](https://docs.astral.sh/uv/) project). It
  serves the JSON API under `/api` and the built frontend at `/`, stores users, sessions,
  and drafts in SQLite, and calls Gemini through LiteLLM with Structured Outputs so the
  AI's answers can be merged into the document reliably. See
  [backend/README.md](backend/README.md).
- **Frontend** (`frontend/`): a Next.js app, exported as static files. It parses the
  Common Paper templates, renders the live preview, and generates PDFs in the browser. See
  [frontend/README.md](frontend/README.md).
- **Templates** (`templates/`, `catalog.json`): the Common Paper standard agreements. A
  registry in `backend/src/prelegal_backend/documents.py` lists the key terms the assistant
  collects for each one.

### AI model and quotas

The chat uses `gemini-2.5-flash` and falls back to `gemini-3.5-flash-lite` when a model is
rate-limited. Gemini's free tier has daily per-model limits (20 requests a day for
2.5 Flash), and each chat message uses one or two requests. When every model's quota is
used up, the chat says so; try again later or use a paid key.

## Development

```bash
# Backend (http://localhost:8000)
cd backend
uv sync
uv run prelegal-backend
uv run pytest                           # unit and integration tests
RUN_LLM_TESTS=1 uv run pytest -k live   # also call the real model (uses quota)

# Frontend (http://localhost:3000, proxies /api to the backend)
cd frontend
npm install
npm run dev
npm test                                # Vitest
npm run lint
npm run build                           # static export to frontend/out
```

## Project structure

```
backend/     FastAPI app, SQLite storage, AI chat, and tests
frontend/    Next.js app: pages, components, template parser, and tests
templates/   Common Paper agreement templates (Markdown)
scripts/     start and stop scripts for macOS, Linux, and Windows
catalog.json list of the templates
Dockerfile, docker-compose.yml
```

## License

The code is released under the [MIT License](LICENSE). The agreement templates are
© Common Paper and used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
