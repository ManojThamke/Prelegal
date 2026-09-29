// Test helpers for code that calls the backend with fetch.
import { vi, type Mock } from "vitest";

/** Stubs fetch; each call resolves with the next of `responses`. */
export function stubFetch(...responses: Response[]) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => responses.shift()!);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** The parsed JSON body of the `n`th request made through a stubbed fetch. */
export function requestBody(fetchMock: Mock, n = 0) {
  const [, init] = fetchMock.mock.calls[n] as [string, RequestInit];
  return JSON.parse(init.body as string);
}
