"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import AppHeader from "@/components/AppHeader";
import NdaCreator from "@/components/NdaCreator";
import type { NdaTemplate } from "@/lib/nda";
import { useUser } from "@/lib/session";
import { loadMutualNdaTemplate } from "@/lib/templates";

export default function NdaPage() {
  const router = useRouter();
  const user = useUser();
  const [template, setTemplate] = useState<NdaTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user === null) router.replace("/");
  }, [user, router]);

  useEffect(() => {
    loadMutualNdaTemplate().then(setTemplate, (e) => {
      console.error(e);
      setError("Sorry, the agreement template could not be loaded. Please refresh to try again.");
    });
  }, []);

  if (!user) return null;

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-brand-navy">Mutual NDA Creator</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Fill in the key terms and party details. The agreement updates as you type, and you can
            download the completed document as a PDF.
          </p>
        </header>
        {error ? (
          <p role="alert" className="text-rose-600">
            {error}
          </p>
        ) : template ? (
          <NdaCreator template={template} />
        ) : (
          <p className="text-brand-gray">Loading agreement…</p>
        )}
      </main>
    </>
  );
}
