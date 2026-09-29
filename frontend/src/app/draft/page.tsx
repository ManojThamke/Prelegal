"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import AppShell from "@/components/AppShell";
import DraftWorkspace, { type Resume } from "@/components/DraftWorkspace";
import { ErrorMessage, Spinner } from "@/components/ui";
import { fetchDocuments, type DocumentSpec } from "@/lib/documents";
import { getDraft } from "@/lib/drafts";

/** /draft/ starts a new document; /draft/?id=N reopens a saved one. */
export default function DraftPage() {
  return (
    <AppShell>
      {() => (
        // useSearchParams needs a Suspense boundary in a statically exported page.
        <Suspense fallback={<Spinner label="Loading…" />}>
          <Draft />
        </Suspense>
      )}
    </AppShell>
  );
}

type State =
  | { status: "loading" }
  | { status: "ready"; documents: DocumentSpec[]; resume?: Resume; key: number }
  | { status: "error"; message: string };

function Draft() {
  const id = Number(useSearchParams().get("id")) || null;
  const [state, setState] = useState<State>({ status: "loading" });
  // When the workspace saves a new draft, the URL gains its id; that must not reload (and
  // reset) the workspace. Only the workspace sets this, so re-running the effect (as React's
  // development mode does) still loads normally.
  const justSaved = useRef<number | null>(null);
  const loads = useRef(0);

  useEffect(() => {
    if (id !== null && id === justSaved.current) return;
    justSaved.current = null;
    let current = true;
    const saved = id ? getDraft(id) : Promise.resolve(null);
    Promise.all([fetchDocuments(), saved]).then(
      ([documents, draft]) => {
        if (!current) return;
        const resume = draft ? { draft: draft.draft, draftId: draft.id, messages: draft.messages } : undefined;
        setState({ status: "ready", documents, resume, key: ++loads.current });
      },
      (e) => {
        console.error(e);
        if (!current) return;
        setState({
          status: "error",
          message:
            e?.status === 404
              ? "This document doesn't exist or belongs to another account."
              : "The drafting workspace couldn't be loaded. Refresh the page to try again.",
        });
      },
    );
    return () => {
      current = false;
    };
  }, [id]);

  if (state.status === "loading") return <Spinner label="Loading…" />;
  if (state.status === "error") {
    return (
      <div className="max-w-xl space-y-4">
        <ErrorMessage>{state.message}</ErrorMessage>
        <Link href="/documents/" className="font-semibold text-brand-blue hover:underline">
          Back to your documents
        </Link>
      </div>
    );
  }
  // Keyed per load, so opening another document (or a new one) starts a fresh workspace.
  return (
    <DraftWorkspace
      key={state.key}
      documents={state.documents}
      resume={state.resume}
      onSaved={(draftId) => (justSaved.current = draftId)}
    />
  );
}
