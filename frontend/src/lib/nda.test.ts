import { describe, expect, it } from "vitest";

import { readTemplate } from "@/test/templatesApi";

import {
  coverSections,
  defaultNdaData,
  formatDate,
  missingFields,
  parseCoverIntro,
  parseInline,
  parseStandardTerms,
  pdfFileName,
  type NdaData,
} from "./nda";

const complete: NdaData = {
  ...defaultNdaData,
  effectiveDate: "2026-09-29",
  governingLaw: "Delaware",
  jurisdiction: "New Castle, DE",
  party1: { name: "Ada Lovelace", title: "CEO", company: "Acme, Inc.", noticeAddress: "ada@acme.test" },
  party2: { name: "Alan Turing", title: "", company: "Bletchley Ltd", noticeAddress: "alan@b.test" },
};

describe("parseInline", () => {
  it("splits bold text, defined terms and links", () => {
    expect(
      parseInline('See **Terms**, the <span class="coverpage_link">Purpose</span> and [CC](https://cc.org).'),
    ).toEqual([
      { kind: "text", text: "See " },
      { kind: "bold", text: "Terms" },
      { kind: "text", text: ", the " },
      { kind: "term", text: "Purpose" },
      { kind: "text", text: " and " },
      { kind: "link", text: "CC", href: "https://cc.org" },
      { kind: "text", text: "." },
    ]);
  });
});

describe("template parsing", () => {
  it("parses the numbered Standard Terms", () => {
    const clauses = parseStandardTerms(readTemplate("Mutual-NDA.md"));
    expect(clauses.length).toBeGreaterThan(5);
    expect(clauses[0]).toMatchObject({ number: "1", title: "Introduction" });
  });

  it("handles CRLF line endings", () => {
    const lf = readTemplate("Mutual-NDA.md");
    expect(parseStandardTerms(lf.replace(/\r?\n/g, "\r\n"))).toEqual(parseStandardTerms(lf));
  });

  it("extracts the cover page intro", () => {
    expect(parseCoverIntro(readTemplate("Mutual-NDA-coverpage.md")).length).toBeGreaterThan(0);
  });
});

describe("coverSections", () => {
  it("marks missing values as placeholders", () => {
    const sections = coverSections(defaultNdaData);
    const effective = sections.find((s) => s.heading === "Effective Date")!;
    expect(effective.lines[0]).toEqual({ text: "[Effective Date]", placeholder: true });
  });

  it("fills in completed values", () => {
    const sections = coverSections({ ...complete, mndaTermYears: "2" });
    const text = sections.flatMap((s) => s.lines).map((l) => l.text);
    expect(text).toContain("September 29, 2026");
    expect(text).toContain("Expires 2 years from Effective Date.");
    expect(text).toContain("Governing Law: Delaware");
    expect(sections.flatMap((s) => s.lines).some((l) => l.placeholder)).toBe(false);
  });
});

describe("missingFields", () => {
  it("lists every required field on an empty form", () => {
    expect(missingFields(defaultNdaData)).toEqual([
      "Effective Date",
      "Governing Law",
      "Jurisdiction",
      "Party 1 name",
      "Party 1 company",
      "Party 1 notice address",
      "Party 2 name",
      "Party 2 company",
      "Party 2 notice address",
    ]);
  });

  it("is empty when the form is complete", () => {
    expect(missingFields(complete)).toEqual([]);
  });

  it("rejects non-integer year counts", () => {
    expect(missingFields({ ...complete, mndaTermYears: "1.5" })).toEqual(["MNDA Term (years)"]);
  });
});

describe("formatting", () => {
  it("formats ISO dates without shifting the day", () => {
    expect(formatDate("2026-01-01")).toBe("January 1, 2026");
    expect(formatDate("")).toBe("");
  });

  it("builds a PDF file name from the company names", () => {
    expect(pdfFileName(complete)).toBe("Mutual-NDA-Acme-Inc-Bletchley-Ltd.pdf");
    expect(pdfFileName(defaultNdaData)).toBe("Mutual-NDA.pdf");
  });
});
