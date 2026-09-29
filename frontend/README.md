# Prelegal frontend

Next.js app for Prelegal. It is built as a static export (`out/`) and served by the
FastAPI backend, which also provides the `/api` endpoints it calls.

## Pages

- `/` — placeholder sign-in ([PL-5](https://iamitbhoirr.atlassian.net/browse/PL-5)). Any
  name and valid-looking email lets the user in; there is no authentication yet. The user
  is kept in localStorage (`src/lib/session.ts`).
- `/nda/` — the Mutual NDA creator ([PL-4](https://iamitbhoirr.atlassian.net/browse/PL-4)).
  Fill in the key terms and party details, see the agreement update live, and download
  it as a PDF. Signed-out users are sent back to `/`.

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

- The agreement text comes from the Common Paper templates, fetched from the backend's
  `/api/templates/{id}` (`mutual-nda-coverpage` and `mutual-nda`) in `src/lib/templates.ts`.
- `src/lib/nda.ts` holds the form data model, the template parser, the derived cover
  page content and validation. It is shared by the HTML preview and the PDF.
- `src/components/NdaForm.tsx` is the form, `NdaPreview.tsx` the live HTML preview, and
  `NdaPdf.tsx` the PDF version built with `@react-pdf/renderer`. The PDF library is
  loaded only when the user clicks **Download PDF**.
- The Standard Terms are reproduced verbatim; defined terms such as *Purpose* refer to the
  Cover Page, where the user's values are filled in. Signature and date cells are left
  blank for signing.

Templates are © Common Paper, used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
