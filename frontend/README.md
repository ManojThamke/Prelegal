# Prelegal frontend

Next.js app for creating a Mutual NDA ([PL-4](https://iamitbhoirr.atlassian.net/browse/PL-4)).
Fill in the key terms and party details, see the completed agreement update live, and
download it as a PDF.

## Getting started

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:3000.

Other scripts: `npm run build`, `npm run start`, `npm run lint`.

## How it works

- The agreement text comes from the Common Paper templates in `../templates`
  (`Mutual-NDA-coverpage.md` and `Mutual-NDA.md`). They are read and parsed on the server
  at build time (`src/lib/templates.ts`), so the app must be run from the `frontend`
  directory of this repository.
- `src/lib/nda.ts` holds the form data model, the template parser, the derived cover
  page content and validation. It is shared by the HTML preview and the PDF.
- `src/components/NdaForm.tsx` is the form, `NdaPreview.tsx` the live HTML preview, and
  `NdaPdf.tsx` the PDF version built with `@react-pdf/renderer`. The PDF library is
  loaded only when the user clicks **Download PDF**.
- The Standard Terms are reproduced verbatim; defined terms such as *Purpose* refer to the
  Cover Page, where the user's values are filled in. Signature and date cells are left
  blank for signing.

Templates are © Common Paper, used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
