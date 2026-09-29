import { describe, expect, it } from "vitest";

import { CSA, NDA, draftOf, party, stubBackend } from "@/test/backend";

import {
  emptyDraft,
  fetchDocuments,
  formatDate,
  keyTerms,
  loadClauses,
  missingItems,
  pdfFileName,
  signatureRows,
} from "./documents";

const ada = party("Ada Lovelace", "Acme, Inc.", "ada@acme.test");
const alan = party("Alan Turing", "Bletchley Ltd", "alan@b.test");

describe("keyTerms", () => {
  it("formats values, marks missing required terms and shows 'None' for optional ones", () => {
    const draft = draftOf(NDA, { purpose: "Evaluation", effectiveDate: "2026-09-29" });

    expect(keyTerms(NDA, draft)).toEqual([
      { label: "Purpose", value: "Evaluation", placeholder: false },
      { label: "Effective Date", value: "September 29, 2026", placeholder: false },
      { label: "Governing Law", value: "[Governing Law]", placeholder: true },
      { label: "MNDA Modifications", value: "None", placeholder: false },
    ]);
  });
});

describe("missingItems", () => {
  it("lists required terms and party details, named by role", () => {
    const draft = draftOf(CSA, { governingLaw: "Delaware" }, { party1: ada });

    expect(missingItems(CSA, draft)).toEqual([
      "Subscription Period",
      "Customer name",
      "Customer company",
      "Customer notice address",
    ]);
  });

  it("is empty when everything required is set", () => {
    const draft = draftOf(NDA, { purpose: "x", effectiveDate: "2026-01-01", governingLaw: "DE" }, { party1: ada, party2: alan });
    expect(missingItems(NDA, draft)).toEqual([]);
  });
});

describe("signatureRows and pdfFileName", () => {
  it("fill in both parties", () => {
    const draft = draftOf(CSA, {}, { party1: ada, party2: alan });

    expect(signatureRows(draft).find((r) => r.label === "Company")!.values).toEqual(["Acme, Inc.", "Bletchley Ltd"]);
    expect(pdfFileName(CSA, draft)).toBe("Cloud-Service-Agreement-Acme-Inc-Bletchley-Ltd.pdf");
    expect(pdfFileName(CSA, emptyDraft)).toBe("Cloud-Service-Agreement.pdf");
  });
});

describe("loading from the backend", () => {
  it("fetches the registry and a document's parsed standard terms", async () => {
    stubBackend();

    expect(await fetchDocuments()).toEqual([NDA, CSA]);
    const clauses = await loadClauses(CSA);
    expect(clauses[0].title).toBe("Service");
  });

  it("throws on HTTP errors", async () => {
    stubBackend({ failing: "/api/templates" });
    await expect(loadClauses(CSA)).rejects.toThrow(/HTTP 500/);
  });
});

describe("formatDate", () => {
  it("formats ISO dates without shifting the day", () => {
    expect(formatDate("2026-01-01")).toBe("January 1, 2026");
    expect(formatDate("")).toBe("");
  });
});
