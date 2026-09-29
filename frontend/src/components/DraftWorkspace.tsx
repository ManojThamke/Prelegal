"use client";

import { useEffect, useState } from "react";

import Chat from "@/components/Chat";
import DocumentPreview from "@/components/DocumentPreview";
import {
  emptyDraft,
  loadClauses,
  missingItems,
  pdfFileName,
  type DocumentSpec,
  type Draft,
} from "@/lib/documents";
import type { Clause } from "@/lib/template";

type Loaded = { id: string; clauses?: Clause[]; error?: string };

/** The AI chat beside a live preview of whichever document the chat has chosen. */
export default function DraftWorkspace({ documents }: { documents: DocumentSpec[] }) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const spec = documents.find((d) => d.id === draft.documentId) ?? null;

  // The chosen document's standard terms, loaded when the chat picks (or switches) it.
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  useEffect(() => {
    if (!spec) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- drop a previous result (e.g. a stale error)
    setLoaded(null);
    let current = true;
    loadClauses(spec).then(
      (clauses) => current && setLoaded({ id: spec.id, clauses }),
      (e) => {
        console.error(e);
        if (current) setLoaded({ id: spec.id, error: `Sorry, the ${spec.name} could not be loaded.` });
      },
    );
    return () => {
      current = false;
    };
  }, [spec]);
  const terms = spec && loaded?.id === spec.id ? loaded : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div className="h-[32rem] overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
        <Chat draft={draft} onChange={setDraft} />
      </div>

      <div className="space-y-4">
        {!spec ? (
          <Catalog documents={documents} />
        ) : terms?.error ? (
          <p role="alert" className="text-rose-600">
            {terms.error}
          </p>
        ) : terms?.clauses ? (
          <>
            <DownloadBar spec={spec} clauses={terms.clauses} draft={draft} />
            <DocumentPreview spec={spec} clauses={terms.clauses} draft={draft} />
          </>
        ) : (
          <p role="status" className="text-slate-600">
            Loading the {spec.name}…
          </p>
        )}
      </div>
    </div>
  );
}

/** Shown until the chat has chosen a document. */
function Catalog({ documents }: { documents: DocumentSpec[] }) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold text-brand-navy">Your document will appear here</h2>
      <p className="mt-1 text-sm text-slate-600">
        Tell the assistant what you need. These are the agreements it can draft:
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {documents.map((doc) => (
          <li key={doc.id} className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-semibold text-brand-navy">{doc.name}</p>
            <p className="mt-1 text-xs text-slate-600">{doc.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DownloadBar({ spec, clauses, draft }: { spec: DocumentSpec; clauses: Clause[]; draft: Draft }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const missing = missingItems(spec, draft);

  async function download() {
    setDownloading(true);
    setError(null);
    try {
      // Loaded on demand: the PDF renderer is large and only needed on download.
      const [{ pdf }, { default: DocumentPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/DocumentPdf"),
      ]);
      const blob = await pdf(<DocumentPdf spec={spec} clauses={clauses} draft={draft} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfFileName(spec, draft);
      a.click();
      // Give the browser a moment to start the download before releasing the blob.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error(e);
      setError("Sorry, the PDF could not be generated. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {missing.length === 0 ? (
            "All required terms are complete."
          ) : (
            <>
              <span className="font-medium text-slate-800">Still needed:</span> {missing.join(", ")}
            </>
          )}
        </p>
        <button
          type="button"
          onClick={download}
          disabled={missing.length > 0 || downloading}
          className="rounded-md bg-brand-purple px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {downloading ? "Preparing PDF…" : "Download PDF"}
        </button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </>
  );
}
