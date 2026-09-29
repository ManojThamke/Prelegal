// The documents Prelegal can draft (from the backend's /api/documents registry), the
// draft being filled in, and the content derived from it for the preview and the PDF.

import { parseClauses, type Clause } from "./template";

export type FieldSpec = {
  key: string;
  label: string;
  description: string;
  example: string;
  required: boolean;
  kind: "text" | "date";
};

export type DocumentSpec = {
  id: string;
  name: string;
  description: string;
  /** /api/templates ids of the document's standard terms, in order. */
  templates: string[];
  /** What the document calls party 1 and party 2, e.g. ["Provider", "Customer"]. */
  roles: [string, string];
  fields: FieldSpec[];
};

export type Party = { name: string; title: string; company: string; noticeAddress: string };

export type Draft = {
  documentId: string | null;
  /** Key-term values, keyed by FieldSpec.key. */
  fields: Record<string, string>;
  party1: Party;
  party2: Party;
};

const emptyParty: Party = { name: "", title: "", company: "", noticeAddress: "" };

export const emptyDraft: Draft = { documentId: null, fields: {}, party1: emptyParty, party2: emptyParty };

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (HTTP ${response.status})`);
  return response.json();
}

export function fetchDocuments(): Promise<DocumentSpec[]> {
  return getJson("/api/documents");
}

/** Fetches and parses the document's standard terms. */
export async function loadClauses(spec: DocumentSpec): Promise<Clause[]> {
  const templates = await Promise.all(
    spec.templates.map((id) => getJson<{ content: string }>(`/api/templates/${encodeURIComponent(id)}`)),
  );
  const clauses = templates.flatMap((t) => parseClauses(t.content));
  if (clauses.length === 0) throw new Error(`Could not parse the ${spec.name} template`);
  return clauses;
}

// ---------------------------------------------------------------------------
// Derived content

export type KeyTerm = { label: string; value: string; placeholder: boolean };

/** The Key Terms table. Missing required values are placeholders; optional ones are "None". */
export function keyTerms(spec: DocumentSpec, draft: Draft): KeyTerm[] {
  return spec.fields.map((field) => {
    const raw = draft.fields[field.key]?.trim() ?? "";
    const value = field.kind === "date" ? formatDate(raw) : raw;
    if (value) return { label: field.label, value, placeholder: false };
    return field.required
      ? { label: field.label, value: `[${field.label}]`, placeholder: true }
      : { label: field.label, value: "None", placeholder: false };
  });
}

/** Rows of the signature table; Signature and Date are left blank for signing. */
export function signatureRows(draft: Draft): { label: string; values: [string, string] }[] {
  const row = (label: string, key?: keyof Party) => ({
    label,
    values: [key ? draft.party1[key] : "", key ? draft.party2[key] : ""] as [string, string],
  });
  return [
    row("Signature"),
    row("Print Name", "name"),
    row("Title", "title"),
    row("Company", "company"),
    row("Notice Address", "noticeAddress"),
    row("Date"),
  ];
}

/** Human-readable names of the required values that are still missing. */
export function missingItems(spec: DocumentSpec, draft: Draft): string[] {
  const missing = spec.fields
    .filter((field) => field.required && !draft.fields[field.key]?.trim())
    .map((field) => field.label);
  ([draft.party1, draft.party2] as const).forEach((party, i) => {
    const role = spec.roles[i];
    if (!party.name.trim()) missing.push(`${role} name`);
    if (!party.company.trim()) missing.push(`${role} company`);
    if (!party.noticeAddress.trim()) missing.push(`${role} notice address`);
  });
  return missing;
}

export function pdfFileName(spec: DocumentSpec, draft: Draft): string {
  const slug = (s: string) => s.trim().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return [spec.name, draft.party1.company, draft.party2.company].map(slug).filter(Boolean).join("-") + ".pdf";
}

export function attribution(spec: DocumentSpec): string {
  return `Common Paper ${spec.name} free to use under CC BY 4.0.`;
}

export const ATTRIBUTION_URL = "https://creativecommons.org/licenses/by/4.0/";

// ---------------------------------------------------------------------------
// Dates

/** The user's local date as ISO yyyy-mm-dd. */
export function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
