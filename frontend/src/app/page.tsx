"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import Brand from "@/components/Brand";
import SignInForm from "@/components/SignInForm";
import { useUser } from "@/lib/session";

const HOME = "/nda/";

export default function SignInPage() {
  const router = useRouter();
  const user = useUser();

  // Signed in (already, or by submitting the form): go into the app.
  useEffect(() => {
    if (user) router.replace(HOME);
  }, [user, router]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="text-center">
          <Brand className="text-3xl" />
        </p>
        <p className="mt-2 text-center text-sm text-brand-gray">
          Draft legal agreements from trusted templates.
        </p>
        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="mb-5 text-xl font-semibold text-brand-navy">Sign in</h1>
          <SignInForm />
        </div>
      </div>
    </main>
  );
}
