"use client";

import Brand from "@/components/Brand";
import { signOut, type User } from "@/lib/session";

export default function AppHeader({ user }: { user: User }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Brand className="text-lg" />
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-brand-gray sm:inline" title={user.email}>
            {user.name}
          </span>
          <button
            type="button"
            onClick={signOut}
            className="rounded-md px-3 py-1.5 font-medium text-brand-blue ring-1 ring-brand-blue/40 hover:bg-brand-blue/10"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
