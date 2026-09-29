"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import AppHeader from "@/components/AppHeader";
import DraftWorkspace from "@/components/DraftWorkspace";
import { fetchDocuments, type DocumentSpec } from "@/lib/documents";
import { useUser } from "@/lib/session";

export default function DraftPage() {
  const router = useRouter();
  const user = useUser();
  const [documents, setDocuments] = useState<DocumentSpec[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user === null) router.replace("/");
  }, [user, router]);

  useEffect(() => {
    fetchDocuments().then(setDocuments, (e) => {
      console.error(e);
      setError("Sorry, the document catalog could not be loaded. Please refresh to try again.");
    });
  }, []);

  if (!user) return null;

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-brand-navy">Draft an agreement</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Tell our AI assistant what you need. It picks the right agreement, fills it in as you
            chat, and you can download the completed document as a PDF.
          </p>
        </header>
        {error ? (
          <p role="alert" className="text-rose-600">
            {error}
          </p>
        ) : documents ? (
          <DraftWorkspace documents={documents} />
        ) : (
          <p role="status" className="text-slate-600">
            Loading…
          </p>
        )}
      </main>
    </>
  );
}
