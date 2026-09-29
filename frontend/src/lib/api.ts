// One way to call the backend: JSON in and out, readable errors, and a shared reaction
// to HTTP 401 (the session has ended, e.g. because the server restarted).

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** FastAPI errors carry a string `detail`, or a list of validation errors (HTTP 422). */
export function errorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && typeof detail[0]?.msg === "string") {
    return detail[0].msg.replace(/^Value error, /, "");
  }
  return fallback;
}

const unauthorizedListeners = new Set<() => void>();

/** Called whenever a request is rejected with 401. */
export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

type Options = { method?: string; body?: unknown; fallback?: string };

export async function api<T>(url: string, { method = "GET", body, fallback }: Options = {}): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) unauthorizedListeners.forEach((notify) => notify());
    const message = errorMessage(data?.detail, fallback ?? `Request failed (HTTP ${response.status})`);
    throw new ApiError(message, response.status);
  }
  return data;
}
