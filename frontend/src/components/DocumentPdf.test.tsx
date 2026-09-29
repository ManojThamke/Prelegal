// @vitest-environment node
import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";

import { parseClauses } from "@/lib/template";
import { CSA, TEMPLATE_FILES, draftOf, party, readTemplate } from "@/test/backend";

import DocumentPdf from "./DocumentPdf";

describe("DocumentPdf", () => {
  it.each(Object.keys(TEMPLATE_FILES).filter((id) => id !== "mutual-nda-coverpage"))(
    "renders a PDF of the %s standard terms",
    async (id) => {
      const draft = draftOf(CSA, { governingLaw: "Delaware" }, { party1: party("Ada", "Acme", "ada@acme.test") });

      const pdf = await renderToBuffer(
        <DocumentPdf spec={{ ...CSA, templates: [id] }} clauses={parseClauses(readTemplate(id))} draft={draft} />,
      );

      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(10_000);
    },
    30_000,
  );
});
