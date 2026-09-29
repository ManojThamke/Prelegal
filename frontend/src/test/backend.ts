// Test helpers: a fake backend (/api/documents, /api/templates/{id}, /api/chat) behind fetch.
import { readFileSync } from "node:fs";
import path from "node:path";

import { vi, type Mock } from "vitest";

import type { ChatResult } from "@/lib/chat";
import type { DocumentSpec, Draft } from "@/lib/documents";

const REPO_ROOT = path.join(__dirname, "..", "..", "..");

/** Template ids (as served by /api/templates) mapped to their files, from catalog.json. */
export const TEMPLATE_FILES: Record<string, string> = Object.fromEntries(
  (JSON.parse(readFileSync(path.join(REPO_ROOT, "catalog.json"), "utf8")).templates as { filename: string }[]).map(
    ({ filename }) => [path.basename(filename, ".md").toLowerCase(), filename],
  ),
);

export function readTemplate(id: string): string {
  return readFileSync(path.join(REPO_ROOT, TEMPLATE_FILES[id]), "utf8");
}

const field = (key: string, label: string, required = true, kind: "text" | "date" = "text") => ({
  key,
  label,
  description: `The ${label}.`,
  example: "",
  required,
  kind,
});

/** A slice of the backend's document registry. */
export const NDA: DocumentSpec = {
  id: "mutual-nda",
  name: "Mutual Non-Disclosure Agreement",
  description: "Lets both parties share confidential information.",
  templates: ["mutual-nda"],
  roles: ["Party 1", "Party 2"],
  fields: [
    field("purpose", "Purpose"),
    field("effectiveDate", "Effective Date", true, "date"),
    field("governingLaw", "Governing Law"),
    field("modifications", "MNDA Modifications", false),
  ],
};

export const CSA: DocumentSpec = {
  id: "csa",
  name: "Cloud Service Agreement",
  description: "Standard terms for selling and buying cloud software.",
  templates: ["csa"],
  roles: ["Provider", "Customer"],
  fields: [field("subscriptionPeriod", "Subscription Period"), field("governingLaw", "Governing Law")],
};

export const DOCUMENTS = [NDA, CSA];

export const party = (name: string, company: string, noticeAddress: string) => ({
  name,
  title: "",
  company,
  noticeAddress,
});

/** A draft of `spec` with the given key terms and parties. */
export function draftOf(spec: DocumentSpec, fields: Record<string, string> = {}, parties: Partial<Draft> = {}): Draft {
  return { documentId: spec.id, fields, party1: party("", "", ""), party2: party("", "", ""), ...parties };
}

/**
 * Stubs fetch with the fake backend. `chat` is returned by POST /api/chat; `failing`
 * makes requests whose URL starts with it fail with HTTP 500.
 */
export function stubBackend(options: { chat?: ChatResult; failing?: string } = {}) {
  const fetchMock = vi.fn(async (url: string) => {
    if (options.failing && url.startsWith(options.failing)) return new Response("", { status: 500 });
    if (url === "/api/documents") return Response.json(DOCUMENTS);
    if (url === "/api/chat" && options.chat) return Response.json(options.chat);
    const id = url.replace("/api/templates/", "");
    if (!TEMPLATE_FILES[id]) return Response.json({ detail: "Not found" }, { status: 404 });
    return Response.json({ id, name: id, description: "", content: readTemplate(id) });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Stubs fetch; each call resolves with the next of `responses`. */
export function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn(async () => responses.shift()!);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** The parsed JSON body of the `n`th request made through a stubbed fetch. */
export function requestBody(fetchMock: Mock, n = 0) {
  const [, init] = fetchMock.mock.calls[n] as unknown as [string, RequestInit];
  return JSON.parse(init.body as string);
}
