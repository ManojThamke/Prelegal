// Placeholder sign-in. There is no authentication yet: the user's name and email
// are kept in localStorage so the app can greet them and gate its pages.

import { useMemo, useSyncExternalStore } from "react";

export type User = { name: string; email: string };

const STORAGE_KEY = "prelegal.user";
const listeners = new Set<() => void>();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns an error message for invalid sign-in details, or null when they are valid. */
export function validateSignIn({ name, email }: User): string | null {
  if (!name.trim()) return "Please enter your name.";
  if (!EMAIL.test(email.trim())) return "Please enter a valid email address.";
  return null;
}

export function parseUser(raw: string | null): User | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return typeof value?.name === "string" && typeof value?.email === "string"
      ? { name: value.name, email: value.email }
      : null;
  } catch {
    return null;
  }
}

export function signIn(user: User): void {
  const clean = { name: user.name.trim(), email: user.email.trim() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  listeners.forEach((notify) => notify());
}

export function signOut(): void {
  localStorage.removeItem(STORAGE_KEY);
  listeners.forEach((notify) => notify());
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // Storage can be unavailable, e.g. when blocked by privacy settings.
  }
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  window.addEventListener("storage", notify); // Sign-in/out in other tabs.
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", notify);
  };
}

/**
 * The signed-in user, or null when signed out. `undefined` means "not known yet":
 * pages are prerendered without access to localStorage.
 */
export function useUser(): User | null | undefined {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, readRaw, () => undefined);
  return useMemo(() => (raw === undefined ? undefined : parseUser(raw)), [raw]);
}
