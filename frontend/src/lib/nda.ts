// Shared Mutual NDA model: form data, template parsing, and the derived
// cover page content rendered by both the HTML preview and the PDF.

export type Party = {
  name: string;
  title: string;
  company: string;
  noticeAddress: string;
};

export type NdaData = {
  purpose: string;
  effectiveDate: string; // ISO yyyy-mm-dd
  mndaTermType: "expires" | "until-terminated";
  mndaTermYears: string;
  confidentialityType: "years" | "perpetual";
  confidentialityYears: string;
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
  party1: Party;
  party2: Party;
};

const emptyParty: Party = { name: "", title: "", company: "", noticeAddress: "" };

export const defaultNdaData: NdaData = {
  purpose: "Evaluating whether to enter into a business relationship with the other party.",
  effectiveDate: "",
  mndaTermType: "expires",
  mndaTermYears: "1",
  confidentialityType: "years",
  confidentialityYears: "1",
  governingLaw: "",
  jurisdiction: "",
  modifications: "",
  party1: emptyParty,
  party2: emptyParty,
};

// ---------------------------------------------------------------------------
// Template parsing

/** A span of inline text. `term` is a defined term that refers to the Cover Page. */
export type Run =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "term"; text: string }
  | { kind: "link"; text: string; href: string };

export type Clause = { number: string; title: string; body: Run[] };

export type NdaTemplate = {
  /** The "Using this Mutual Non-Disclosure Agreement" paragraph of the cover page. */
  coverIntro: Run[];
  /** The numbered Standard Terms. */
  clauses: Clause[];
};

const INLINE =
  /\*\*([^*]+)\*\*|<span class="coverpage_link">([^<]+)<\/span>|\[([^\]]+)\]\(([^)]+)\)/g;

export function parseInline(source: string): Run[] {
  const runs: Run[] = [];
  let last = 0;
  for (const m of source.matchAll(INLINE)) {
    if (m.index > last) runs.push({ kind: "text", text: source.slice(last, m.index) });
    if (m[1] !== undefined) runs.push({ kind: "bold", text: m[1] });
    else if (m[2] !== undefined) runs.push({ kind: "term", text: m[2] });
    else runs.push({ kind: "link", text: m[3], href: m[4] });
    last = m.index + m[0].length;
  }
  if (last < source.length) runs.push({ kind: "text", text: source.slice(last) });
  return runs;
}

// Templates may be checked out with CRLF line endings (e.g. git autocrlf on Windows).
const normalizeNewlines = (text: string) => text.replace(/\r\n?/g, "\n");

/** Parses numbered clauses of the form `1. **Title**. Body...` */
export function parseStandardTerms(markdown: string): Clause[] {
  const clauses: Clause[] = [];
  for (const line of normalizeNewlines(markdown).split("\n")) {
    const m = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*\.\s*(.*)$/);
    if (m) clauses.push({ number: m[1], title: m[2], body: parseInline(m[3]) });
  }
  return clauses;
}

/** Extracts the intro paragraph that sits under the cover page's "USING THIS..." heading. */
export function parseCoverIntro(markdown: string): Run[] {
  const m = normalizeNewlines(markdown).match(/^## USING THIS[^\n]*\n+([^\n]+)/m);
  return m ? parseInline(m[1].trim()) : [];
}

// ---------------------------------------------------------------------------
// Derived cover page content

export type CoverSection = {
  heading: string;
  label?: string;
  /** Paragraphs of the section. A missing value is represented by `placeholder`. */
  lines: { text: string; placeholder?: boolean }[];
};

const yearsLabel = (years: string) =>
  `${years} year${Number(years) === 1 ? "" : "s"}`;

export function formatDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

const value = (text: string, placeholder: string) =>
  text.trim() ? { text: text.trim() } : { text: `[${placeholder}]`, placeholder: true };

export function coverSections(data: NdaData): CoverSection[] {
  const mndaTerm =
    data.mndaTermType === "expires"
      ? isPositiveInteger(data.mndaTermYears)
        ? { text: `Expires ${yearsLabel(data.mndaTermYears)} from Effective Date.` }
        : { text: "Expires [number of years] from Effective Date.", placeholder: true }
      : { text: "Continues until terminated in accordance with the terms of the MNDA." };

  const confidentiality =
    data.confidentialityType === "years"
      ? {
          text: `${
            isPositiveInteger(data.confidentialityYears)
              ? yearsLabel(data.confidentialityYears)
              : "[number of years]"
          } from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`,
          placeholder: !isPositiveInteger(data.confidentialityYears),
        }
      : { text: "In perpetuity." };

  return [
    {
      heading: "Purpose",
      label: "How Confidential Information may be used",
      lines: [value(data.purpose, "Purpose")],
    },
    { heading: "Effective Date", lines: [value(formatDate(data.effectiveDate), "Effective Date")] },
    { heading: "MNDA Term", label: "The length of this MNDA", lines: [mndaTerm] },
    {
      heading: "Term of Confidentiality",
      label: "How long Confidential Information is protected",
      lines: [confidentiality],
    },
    {
      heading: "Governing Law & Jurisdiction",
      lines: [
        prefixed("Governing Law: ", value(data.governingLaw, "State")),
        prefixed("Jurisdiction: ", value(data.jurisdiction, "City or county and state")),
      ],
    },
    {
      heading: "MNDA Modifications",
      lines: [data.modifications.trim() ? { text: data.modifications.trim() } : { text: "None." }],
    },
  ];
}

function prefixed(prefix: string, line: { text: string; placeholder?: boolean }) {
  return { ...line, text: prefix + line.text };
}

/** Rows of the signature table; Signature and Date are left blank for signing. */
export function signatureRows(data: NdaData): { label: string; values: [string, string] }[] {
  const row = (label: string, key?: keyof Party) => ({
    label,
    values: [key ? data.party1[key] : "", key ? data.party2[key] : ""] as [string, string],
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

// ---------------------------------------------------------------------------
// Validation

export function isPositiveInteger(text: string): boolean {
  return /^[1-9]\d*$/.test(text.trim());
}

/** Returns human-readable names of required fields that are missing or invalid. */
export function missingFields(data: NdaData): string[] {
  const missing: string[] = [];
  if (!data.purpose.trim()) missing.push("Purpose");
  if (!data.effectiveDate) missing.push("Effective Date");
  if (data.mndaTermType === "expires" && !isPositiveInteger(data.mndaTermYears))
    missing.push("MNDA Term (years)");
  if (data.confidentialityType === "years" && !isPositiveInteger(data.confidentialityYears))
    missing.push("Term of Confidentiality (years)");
  if (!data.governingLaw.trim()) missing.push("Governing Law");
  if (!data.jurisdiction.trim()) missing.push("Jurisdiction");
  (["party1", "party2"] as const).forEach((key, i) => {
    const party = data[key];
    if (!party.name.trim()) missing.push(`Party ${i + 1} name`);
    if (!party.company.trim()) missing.push(`Party ${i + 1} company`);
    if (!party.noticeAddress.trim()) missing.push(`Party ${i + 1} notice address`);
  });
  return missing;
}

export function pdfFileName(data: NdaData): string {
  const slug = (s: string) => s.trim().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const parts = [slug(data.party1.company), slug(data.party2.company)].filter(Boolean);
  return `Mutual-NDA${parts.length ? "-" + parts.join("-") : ""}.pdf`;
}

export const ATTRIBUTION =
  "Common Paper Mutual Non-Disclosure Agreement (Version 1.0) free to use under CC BY 4.0.";
export const ATTRIBUTION_URL = "https://creativecommons.org/licenses/by/4.0/";
