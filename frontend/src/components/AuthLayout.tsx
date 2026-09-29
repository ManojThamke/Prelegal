import type { ReactNode } from "react";

import Brand from "@/components/Brand";
import { DISCLAIMER } from "@/components/ui";

// Key terms of a sample agreement, highlighted one after another as if being filled in.
const EXCERPT: (string | { term: string })[] = [
  "This Cloud Service Agreement is between ",
  { term: "Acme, Inc." },
  " and ",
  { term: "Globex Corporation" },
  ". Each subscription lasts ",
  { term: "one year" },
  " and renews unless either party gives notice ",
  { term: "30 days" },
  " before it ends. The laws of ",
  { term: "Delaware" },
  " govern this agreement.",
];

/** Sign-in and sign-up screens: the form beside a sample agreement being drafted. */
export default function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  let termIndex = 0;
  return (
    <div className="grid min-h-screen flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between bg-brand-navy px-12 py-10 text-slate-200 lg:flex">
        <Brand inverted className="text-2xl" />
        <div className="max-w-md">
          <p className="font-serif text-3xl leading-snug text-white">Draft agreements in a conversation.</p>
          <blockquote className="mt-8 border-l-2 border-white/20 pl-5 font-serif text-lg leading-relaxed text-slate-300">
            {EXCERPT.map((part, i) =>
              typeof part === "string" ? (
                part
              ) : (
                <mark
                  key={i}
                  className="term-reveal rounded-sm bg-transparent px-0.5 text-white"
                  style={{ animationDelay: `${600 + termIndex++ * 450}ms` }}
                >
                  {part.term}
                </mark>
              ),
            )}
          </blockquote>
          <p className="mt-6 text-sm text-slate-300">
            Eleven Common Paper agreements, from NDAs to data processing agreements. You answer
            questions; the assistant fills in the terms.
          </p>
        </div>
        <p className="text-xs leading-relaxed text-slate-300">{DISCLAIMER}</p>
      </aside>

      <main className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Brand className="text-2xl lg:hidden" />
          <h1 className="mt-8 font-serif text-3xl font-semibold text-brand-navy lg:mt-0">{title}</h1>
          <div className="mt-8">{children}</div>
          <p className="mt-10 text-xs leading-relaxed text-slate-500 lg:hidden">{DISCLAIMER}</p>
        </div>
      </main>
    </div>
  );
}
