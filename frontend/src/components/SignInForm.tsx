"use client";

import { useState, type FormEvent } from "react";

import { signIn, validateSignIn } from "@/lib/session";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm " +
  "focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30";

export default function SignInForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const problem = validateSignIn({ name, email });
    setError(problem);
    if (problem) return;
    signIn({ name, email });
  }

  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      <label className="block space-y-1">
        <span className="block text-sm font-medium text-slate-700">Name</span>
        <input
          className={inputClass}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="block space-y-1">
        <span className="block text-sm font-medium text-slate-700">Work email</span>
        <input
          type="email"
          className={inputClass}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="w-full rounded-md bg-brand-purple px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
      >
        Sign in
      </button>
    </form>
  );
}
