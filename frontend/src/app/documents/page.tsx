"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AppShell from "@/components/AppShell";
import { Button, ErrorMessage, Spinner, buttonClass } from "@/components/ui";
import { deleteDraft, listDrafts, timeAgo, type DraftSummary } from "@/lib/drafts";

export default function DocumentsPage() {
  return <AppShell>{(user) => <Documents firstName={user.name.split(" ")[0]} />}</AppShell>;
}

function Documents({ firstName }: { firstName: string }) {
  const [drafts, setDrafts] = useState<DraftSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDrafts().then(setDrafts, (e) => {
      console.error(e);
      setError("Your documents couldn't be loaded. Refresh the page to try again.");
    });
  }, []);

  async function remove(draft: DraftSummary) {
    if (!window.confirm(`Delete "${draft.title}"? This can't be undone.`)) return;
    try {
      await deleteDraft(draft.id);
      setDrafts((current) => current?.filter((d) => d.id !== draft.id) ?? null);
    } catch (e) {
      console.error(e);
      setError(`"${draft.title}" couldn't be deleted. Try again.`);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-brand-navy">Your documents</h1>
          <p className="mt-1 text-slate-600">
            {drafts?.length
              ? "Pick up where you left off, or start a new agreement."
              : `Welcome, ${firstName}. Your drafts are saved here as you work on them.`}
          </p>
        </div>
        <Link href="/draft/" className={buttonClass("primary")}>
          New document
        </Link>
      </div>

      <div className="mt-8">
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {!drafts && !error && <Spinner label="Loading your documents…" />}
        {drafts?.length === 0 && <EmptyState />}
        {drafts && drafts.length > 0 && (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {drafts.map((draft) => (
              <li key={draft.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/draft/?id=${draft.id}`}
                    className="block truncate font-semibold text-brand-navy hover:underline"
                  >
                    {draft.title}
                  </Link>
                  <p className="mt-0.5 text-sm text-slate-500">Edited {timeAgo(draft.updatedAt)}</p>
                </div>
                <Status complete={draft.complete} />
                <div className="flex items-center gap-1">
                  <Link href={`/draft/?id=${draft.id}`} className={buttonClass("secondary", "py-1.5")}>
                    Open
                  </Link>
                  <Button variant="danger" className="py-1.5" onClick={() => remove(draft)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function Status({ complete }: { complete: boolean }) {
  return complete ? (
    <span className="rounded-full bg-brand-navy/5 px-2.5 py-0.5 text-xs font-semibold text-brand-navy ring-1 ring-brand-navy/20">
      Ready to download
    </span>
  ) : (
    <span className="rounded-full bg-highlight/60 px-2.5 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-brand-yellow/50">
      Needs details
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <h2 className="font-serif text-xl font-semibold text-brand-navy">No documents yet</h2>
      <p className="mx-auto mt-2 max-w-md text-slate-600">
        Tell the assistant what you need, like an NDA with a new partner or a cloud service
        agreement for a customer, and it will draft it with you.
      </p>
      <Link href="/draft/" className={buttonClass("primary", "mt-6")}>
        Draft your first document
      </Link>
    </div>
  );
}
