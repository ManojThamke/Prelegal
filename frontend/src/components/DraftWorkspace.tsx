"use client";

import { useEffect, useState } from "react";

import Chat from "@/components/Chat";
import DocumentPreview from "@/components/DocumentPreview";
import { Button, Disclaimer, ErrorMessage, Spinner } from "@/components/ui";
import type { ChatMessage, ChatResult } from "@/lib/chat";
import {
  emptyDraft,
  loadClauses,
  missingItems,
  pdfFileName,
  type DocumentSpec,
  type Draft,
} from "@/lib/documents";
import type { Clause } from "@/lib/template";

export type Resume = { draft: Draft; draftId: number; messages: ChatMessage[] };

type Props = {
  documents: DocumentSpec[];
  /** A saved draft to reopen. */
  resume?: Resume;
  /** Called when the draft is first saved, with its id. */
  onSaved?: (draftId: number) => void;
};

/**
 * The AI chat beside a live preview of whichever document the chat has chosen. Drafts
 * are saved by the backend as the chat goes; `resume` reopens a saved one.
 */
export default function DraftWorkspace({ documents, resume, onSaved }: Props) {
  const [draft, setDraft] = useState<Draft>(resume?.draft ?? emptyDraft);
  const [draftId, setDraftId] = useState<number | null>(resume?.draftId ?? null);
  const spec = documents.find((d) => d.id === draft.documentId) ?? null;

  function onChat(result: ChatResult) {
    setDraft(result.draft);
    if (result.draftId !== null && result.draftId !== draftId) {
      setDraftId(result.draftId);
      onSaved?.(result.draftId);
      // Make this URL reopen the saved draft (e.g. after a refresh).
      window.history.replaceState(null, "", `/draft/?id=${result.draftId}`);
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-brand-navy">{spec?.name ?? "New document"}</h1>
        <p className="mt-1 text-slate-600">
          {draftId
            ? "Saved to your documents as you go."
            : "Tell the assistant what you need. It will pick the right agreement and fill it in with you."}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <section
          aria-label="Assistant"
          className="h-[34rem] overflow-hidden rounded-lg border border-slate-200 bg-white lg:sticky lg:top-6 lg:h-[calc(100vh-9rem)]"
        >
          <Chat draft={draft} draftId={draftId} initialMessages={resume?.messages} onChange={onChat} />
        </section>

        <div className="min-w-0 space-y-4">
          {/* Keyed by document, so switching documents loads the new one's terms afresh. */}
          {spec ? <DocumentPanel key={spec.id} spec={spec} draft={draft} /> : <Catalog documents={documents} />}
        </div>
      </div>
    </>
  );
}

/** The chosen document: its standard terms are loaded once, then previewed live. */
function DocumentPanel({ spec, draft }: { spec: DocumentSpec; draft: Draft }) {
  const [clauses, setClauses] = useState<Clause[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    loadClauses(spec).then(
      (loaded) => current && setClauses(loaded),
      (e) => {
        console.error(e);
        if (current) setError(`The ${spec.name} couldn't be loaded. Refresh the page to try again.`);
      },
    );
    return () => {
      current = false;
    };
  }, [spec]);

  if (error) return <ErrorMessage>{error}</ErrorMessage>;
  if (!clauses) return <Spinner label={`Loading the ${spec.name}…`} />;
  return (
    <>
      <DownloadBar spec={spec} clauses={clauses} draft={draft} />
      <Disclaimer />
      <DocumentPreview spec={spec} clauses={clauses} draft={draft} />
    </>
  );
}

/** Shown until the chat has chosen a document. */
function Catalog({ documents }: { documents: DocumentSpec[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="font-serif text-xl font-semibold text-brand-navy">Your document will appear here</h2>
      <p className="mt-1 text-slate-600">These are the agreements the assistant can draft:</p>
      <ul className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {documents.map((doc) => (
          <li key={doc.id} className="border-t border-slate-100 pt-3">
            <p className="font-semibold text-brand-navy">{doc.name}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{doc.description}</p>
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
      setError("The PDF couldn't be created. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="sticky top-0 z-10 -mx-1 space-y-2 bg-paper/95 px-1 py-2 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="line-clamp-2 min-w-0 flex-1 text-sm text-slate-700">
          {missing.length === 0 ? (
            "All required terms are filled in."
          ) : (
            <>
              <span className="highlight font-semibold text-brand-navy">Still needed ({missing.length}):</span>{" "}
              {missing.join(", ")}
            </>
          )}
        </p>
        <Button onClick={download} disabled={missing.length > 0 || downloading}>
          {downloading ? "Preparing PDF…" : "Download PDF"}
        </Button>
      </div>
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  );
}
