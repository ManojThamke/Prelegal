# Prelegal frontend

Next.js app for Prelegal. It is built as a static export (`out/`) and served by the
FastAPI backend, which also provides the `/api` endpoints it calls.

## Pages

- `/` — placeholder sign-in ([PL-5](https://iamitbhoirr.atlassian.net/browse/PL-5)). Any
  name and valid-looking email lets the user in; there is no authentication yet. The user
  is kept in localStorage (`src/lib/session.ts`).
- `/draft/` — the drafting workspace ([PL-7](https://iamitbhoirr.atlassian.net/browse/PL-7)).
  Tell the AI assistant what you need; it picks the agreement (or offers the closest one it
  can draft), fills it in as you chat, and you can download it as a PDF. Signed-out users
  are sent back to `/`.

## Development

Run the backend on port 8000 (see `../backend/README.md`), then:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. In development only, `/api/*` is proxied to the backend
(`BACKEND_URL`, default `http://localhost:8000`).

Other scripts: `npm run build` (static export to `out/`), `npm test` (Vitest),
`npm run lint`.

## How it works

- `src/lib/documents.ts` loads the document registry (`/api/documents`) and derives the
  Key Terms, signature rows, and still-missing items from the current draft.
- `src/lib/template.ts` parses the Common Paper templates (fetched from
  `/api/templates/{id}`) into nested clauses, with defined terms marked.
- `src/components/Chat.tsx` is the freeform chat with the AI assistant. Each turn posts the
  conversation and current draft to `/api/chat` (`src/lib/chat.ts`) and applies the draft it
  returns; `DraftWorkspace.tsx` shows the catalog until a document is chosen.
- `DocumentPreview.tsx` is the live HTML preview and `DocumentPdf.tsx` the PDF version built
  with `@react-pdf/renderer`, loaded only when the user clicks **Download PDF**.
- The Standard Terms are reproduced verbatim; defined terms refer to the Key Terms, where
  the user's values are filled in. Signature and date cells are left blank for signing.

Templates are © Common Paper, used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
