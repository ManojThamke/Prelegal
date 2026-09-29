"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button, ErrorMessage, TextField } from "@/components/ui";
import { signIn, signUp } from "@/lib/session";

type Mode = "signin" | "signup";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns what's wrong with the form, or null when it can be submitted. */
export function validate(mode: Mode, name: string, email: string, password: string): string | null {
  if (mode === "signup" && !name.trim()) return "Enter your name.";
  if (!EMAIL.test(email.trim())) return "Enter a valid email address.";
  if (!password) return "Enter your password.";
  if (mode === "signup" && password.length < 8) return "Use at least 8 characters for your password.";
  return null;
}

/** Sign-in or sign-up form. On success the session updates and the page redirects. */
export default function AuthForm({ mode }: { mode: Mode }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const signingUp = mode === "signup";

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problem = validate(mode, name, email, password);
    setError(problem);
    if (problem) return;
    setPending(true);
    try {
      await (signingUp ? signUp(name.trim(), email.trim(), password) : signIn(email.trim(), password));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setPending(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      {signingUp && (
        <TextField label="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      )}
      <TextField
        label="Work email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete={signingUp ? "new-password" : "current-password"}
        hint={signingUp ? "At least 8 characters." : undefined}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <Button type="submit" disabled={pending} className="w-full py-2.5">
        {pending ? (signingUp ? "Creating account…" : "Signing in…") : signingUp ? "Create account" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-slate-600">
        {signingUp ? "Already have an account? " : "New to Prelegal? "}
        <Link
          href={signingUp ? "/" : "/signup/"}
          className="font-semibold text-brand-blue underline-offset-2 hover:underline"
        >
          {signingUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
