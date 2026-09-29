// Test helpers: a fake backend (/api/documents, /api/templates/{id}, /api/chat) behind fetch.
import { readFileSync } from "node:fs";
import path from "node:path";

import { vi, type Mock } from "vitest";

import type { ChatResult } from "@/lib/chat";
import type { DocumentSpec, Draft } from "@/lib/documents";
import type { DraftSummary, SavedDraft } from "@/lib/drafts";
import type { User } from "@/lib/session";

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

export const ADA: User = { id: 1, name: "Ada Lovelace", email: "ada@acme.test" };

export function savedDraft(id: number, draft: Draft, overrides: Partial<SavedDraft> = {}): SavedDraft {
  const spec = DOCUMENTS.find((d) => d.id === draft.documentId)!;
  return {
    id,
    documentId: spec.id,
    documentName: spec.name,
    title: spec.name,
    complete: false,
    createdAt: "2026-09-30T10:00:00.000Z",
    updatedAt: "2026-09-30T10:00:00.000Z",
    draft,
    messages: [{ role: "assistant", content: "Hi!" }],
    ...overrides,
  };
}

type Options = {
  /** The signed-in user (default: nobody). */
  user?: User | null;
  /** The user's saved drafts. */
  drafts?: SavedDraft[];
  /** Returned by POST /api/chat; a result with a draftId is also saved. */
  chat?: ChatResult;
  /** Returned (as a 401) by sign-in and sign-up, to simulate a rejected attempt. */
  authError?: string;
  /** Requests whose URL starts with this fail with HTTP 500. */
  failing?: string;
};

function summaryOf(saved: SavedDraft): DraftSummary {
  const { id, documentId, documentName, title, complete, createdAt, updatedAt } = saved;
  return { id, documentId, documentName, title, complete, createdAt, updatedAt };
}

/** Stubs fetch with an in-memory fake of the backend's API. */
export function stubBackend(options: Options = {}) {
  let user = options.user ?? null;
  const drafts = [...(options.drafts ?? [])];
  const json = (body: unknown, status = 200) => Response.json(body, { status });

  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    if (options.failing && url.startsWith(options.failing)) return new Response("", { status: 500 });

    if (url === "/api/auth/me") return user ? json(user) : json({ detail: "Please sign in." }, 401);
    if (url === "/api/auth/signin" || url === "/api/auth/signup") {
      if (options.authError) return json({ detail: options.authError }, 401);
      user = { id: 1, name: body.name ?? ADA.name, email: body.email };
      return json(user, url.endsWith("signup") ? 201 : 200);
    }
    if (url === "/api/auth/signout") {
      user = null;
      return new Response(null, { status: 204 });
    }
    if (url === "/api/documents") return json(DOCUMENTS);

    const draftMatch = url.match(/^\/api\/drafts(?:\/(\d+))?$/);
    if (draftMatch) {
      if (!user) return json({ detail: "Please sign in." }, 401);
      if (!draftMatch[1]) return json(drafts.map(summaryOf));
      const index = drafts.findIndex((d) => d.id === Number(draftMatch[1]));
      if (index < 0) return json({ detail: "Draft not found" }, 404);
      if (method === "DELETE") {
        drafts.splice(index, 1);
        return new Response(null, { status: 204 });
      }
      return json(drafts[index]);
    }

    if (url === "/api/chat" && options.chat) {
      const { draftId, draft } = options.chat;
      if (draftId !== null && !drafts.some((d) => d.id === draftId)) drafts.push(savedDraft(draftId, draft));
      return json(options.chat);
    }

    const id = url.replace("/api/templates/", "");
    if (!TEMPLATE_FILES[id]) return json({ detail: "Not found" }, 404);
    return json({ id, name: id, description: "", content: readTemplate(id) });
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
