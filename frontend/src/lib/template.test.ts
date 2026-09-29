import { describe, expect, it } from "vitest";

import { TEMPLATE_FILES, readTemplate } from "@/test/backend";

import { clauseNumber, parseClauses, parseInline, type Clause, type Run } from "./template";

const flatten = (clauses: Clause[]): Clause[] => clauses.flatMap((c) => [c, ...flatten(c.children)]);
const plainText = (runs: Run[]): string =>
  runs.map((r) => (r.kind === "bold" ? plainText(r.runs) : r.text)).join("");

describe("parseInline", () => {
  it("splits bold text, defined terms and links", () => {
    expect(
      parseInline('See **Terms**, the <span class="coverpage_link">Purpose</span> and [CC](https://cc.org).'),
    ).toEqual([
      { kind: "text", text: "See " },
      { kind: "bold", runs: [{ kind: "text", text: "Terms" }] },
      { kind: "text", text: ", the " },
      { kind: "term", text: "Purpose" },
      { kind: "text", text: " and " },
      { kind: "link", text: "CC", href: "https://cc.org" },
      { kind: "text", text: "." },
    ]);
  });

  it("parses defined terms inside bold text", () => {
    expect(parseInline('**Up to the <span class="keyterms_link" id="x">General Cap Amount</span>.**')).toEqual([
      {
        kind: "bold",
        runs: [
          { kind: "text", text: "Up to the " },
          { kind: "term", text: "General Cap Amount" },
          { kind: "text", text: "." },
        ],
      },
    ]);
  });

  it("unwraps anchor spans and handles bare and scheme-less links", () => {
    expect(parseInline('<span id="8.17"></span><span id="4.6">**"Output"**</span> at <https://a.test/x>')).toEqual([
      { kind: "bold", runs: [{ kind: "text", text: '"Output"' }] },
      { kind: "text", text: " at " },
      { kind: "link", text: "https://a.test/x", href: "https://a.test/x" },
    ]);
    expect(parseInline("[v1](commonpaper.com/a)")).toEqual([
      { kind: "link", text: "v1", href: "https://commonpaper.com/a" },
    ]);
  });
});

describe("parseClauses", () => {
  it("nests sections, clauses and lettered items", () => {
    const [service] = parseClauses(readTemplate("csa"));

    expect(service).toMatchObject({ marker: "1", level: 0, title: "Service", body: [] });
    expect(service.children[0]).toMatchObject({ marker: "1", level: 1, title: "Access and Use" });
    const restrictions = flatten(parseClauses(readTemplate("csa"))).find((c) => c.children.some((i) => i.level === 2))!;
    expect(restrictions.children[0].marker).toBe("a");
  });

  it("parses the Mutual NDA's flat clauses and skips its attribution line", () => {
    const clauses = parseClauses(readTemplate("mutual-nda"));

    expect(clauses[0]).toMatchObject({ marker: "1", level: 0, title: "Introduction", children: [] });
    expect(clauses.length).toBeGreaterThan(5);
    expect(flatten(clauses).some((c) => /CC BY/.test(plainText(c.body)))).toBe(false);
  });

  it("nests roman numerals below lettered items", () => {
    const deepest = flatten(parseClauses(readTemplate("dpa"))).filter((c) => c.level === 3);
    expect(deepest.map((c) => c.marker)).toContain("vii");
  });

  it("handles CRLF line endings", () => {
    const lf = readTemplate("sla");
    expect(parseClauses(lf.replace(/\r?\n/g, "\r\n"))).toEqual(parseClauses(lf));
  });

  it.each(Object.keys(TEMPLATE_FILES).filter((id) => id !== "mutual-nda-coverpage"))(
    "parses %s cleanly",
    (id) => {
      const clauses = flatten(parseClauses(readTemplate(id)));

      expect(clauses.length).toBeGreaterThan(10);
      for (const clause of clauses) {
        const text = clause.title + plainText(clause.body);
        expect(text, `${id} ${clause.marker}`).not.toMatch(/<\/?span|\*\*/);
      }
    },
  );
});

describe("clauseNumber", () => {
  it("numbers like Common Paper documents", () => {
    const clause = (level: number, marker: string): Clause => ({ marker, level, title: "", body: [], children: [] });
    expect(clauseNumber(clause(0, "3"), "")).toBe("3");
    expect(clauseNumber(clause(1, "2"), "3")).toBe("3.2");
    expect(clauseNumber(clause(2, "b"), "3.2")).toBe("(b)");
  });
});
