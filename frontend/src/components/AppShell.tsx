"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import Brand from "@/components/Brand";
import { Button, DISCLAIMER, Spinner, buttonClass } from "@/components/ui";
import { signOut, useUser, type User } from "@/lib/session";

/** Layout for signed-in pages. Signed-out visitors are sent to the sign-in page. */
export default function AppShell({ children }: { children: (user: User) => ReactNode }) {
  const router = useRouter();
  const user = useUser();

  useEffect(() => {
    if (user === null) router.replace("/");
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner label={user === null ? "Taking you to sign in…" : "Loading…"} />
      </div>
    );
  }
  return (
    <>
      <Header user={user} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">{children(user)}</main>
      <footer className="border-t border-slate-200">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs leading-relaxed text-slate-600 sm:px-6 lg:px-8">{DISCLAIMER}</p>
      </footer>
    </>
  );
}

function Header({ user }: { user: User }) {
  const onDocuments = usePathname().startsWith("/documents");
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3 sm:gap-6 sm:px-6 lg:px-8">
        <Link href="/documents/" className="rounded-sm focus-visible:outline-2 focus-visible:outline-brand-blue">
          <Brand className="text-xl" />
        </Link>
        <nav aria-label="Main">
          <Link
            href="/documents/"
            aria-current={onDocuments ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              onDocuments ? "bg-slate-100 text-brand-navy" : "text-slate-600 hover:text-brand-navy"
            }`}
          >
            Documents
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/draft/" className={buttonClass("primary", "px-3 sm:px-4")}>
            New document
          </Link>
          <AccountMenu user={user} />
        </div>
      </div>
    </header>
  );
}

/** The user's initials; opens a menu with their details and "Sign out". */
function AccountMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape or a click outside the menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  async function onSignOut() {
    setError(null);
    try {
      await signOut();
    } catch (e) {
      console.error(e);
      setError("Couldn't sign you out. Try again.");
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label={`Account menu for ${user.name}`}
        aria-expanded={open}
        aria-controls="account-menu"
        onClick={() => setOpen((o) => !o)}
        className="flex size-9 items-center justify-center rounded-full bg-brand-navy text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
      >
        {initials(user.name)}
      </button>
      {open && (
        <div
          id="account-menu"
          className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-brand-navy">{user.name}</p>
            <p className="truncate text-sm text-slate-600">{user.email}</p>
          </div>
          <Button variant="quiet" className="w-full justify-start" onClick={onSignOut}>
            Sign out
          </Button>
          {error && (
            <p role="alert" className="px-3 py-1 text-sm text-rose-700">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase() || "?";
}
