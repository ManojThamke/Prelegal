"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import AuthLayout from "@/components/AuthLayout";
import { useSessionExpired, useUser } from "@/lib/session";

export const HOME = "/documents/";

/** A page for signed-out visitors; signed-in users go straight to their documents. */
export default function GuestPage({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  const user = useUser();
  const expired = useSessionExpired();

  useEffect(() => {
    if (user) router.replace(HOME);
  }, [user, router]);

  return (
    <AuthLayout title={title}>
      {expired && (
        <p role="status" className="mb-6 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          Your session ended. Sign in again to continue.
        </p>
      )}
      {children}
    </AuthLayout>
  );
}
