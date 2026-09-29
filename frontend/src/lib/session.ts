// Accounts, via the backend's /api/auth. The session itself is an HttpOnly cookie, so
// this module only tracks who is signed in.

import { useSyncExternalStore } from "react";

import { api, onUnauthorized } from "./api";

export type User = { id: number; name: string; email: string };

type Session = {
  /** `undefined` while the session is being checked; `null` when signed out. */
  user: User | null | undefined;
  /** Whether the user was signed out because their session ended (e.g. a server restart). */
  expired: boolean;
};

let session: Session = { user: undefined, expired: false };
let checking: Promise<void> | null = null;
let version = 0; // Bumped on every sign-in/out, so a slower, older check can't overwrite it.
const listeners = new Set<() => void>();

function update(next: Session) {
  session = next;
  version++;
  listeners.forEach((notify) => notify());
}

// Any 401 means the session has ended: go back to signed out.
onUnauthorized(() => {
  if (session.user) update({ user: null, expired: true });
});

async function authenticate(url: string, body: unknown, fallback: string): Promise<User> {
  const user = await api<User>(url, { method: "POST", body, fallback });
  update({ user, expired: false });
  return user;
}

export function signUp(name: string, email: string, password: string): Promise<User> {
  return authenticate("/api/auth/signup", { name, email, password }, "Couldn't create your account. Try again.");
}

export function signIn(email: string, password: string): Promise<User> {
  return authenticate("/api/auth/signin", { email, password }, "Couldn't sign you in. Try again.");
}

/** Ends the session; throws (and stays signed in) if the server couldn't be reached. */
export async function signOut(): Promise<void> {
  await api("/api/auth/signout", { method: "POST" });
  update({ user: null, expired: false });
}

/** Asks the backend who is signed in (once, until the next sign-in or sign-out). */
function checkSession(): Promise<void> {
  const started = version;
  checking ??= api<User>("/api/auth/me")
    .catch(() => null)
    .then((user) => {
      if (version === started) update({ user, expired: false });
    });
  return checking;
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  if (session.user === undefined) void checkSession();
  return () => listeners.delete(notify);
}

/** The signed-in user; `undefined` while checking (and during prerendering), `null` if signed out. */
export function useUser(): User | null | undefined {
  return useSyncExternalStore(subscribe, () => session.user, () => undefined);
}

/** Whether the user was just signed out because their session ended. */
export function useSessionExpired(): boolean {
  return useSyncExternalStore(subscribe, () => session.expired, () => false);
}

/** Test helper: forget the cached session. */
export function resetSession(): void {
  session = { user: undefined, expired: false };
  checking = null;
}
