// Parses Common Paper templates (markdown with HTML spans) into nested clauses.
//
// Two formats are supported:
//   1. <span class="header_2" id="1">Service</span>              (most templates)
//       1. <span class="header_3" id="1.1">Access.</span> Body...
//           a. Lettered item...
//   1. **Introduction**. Body...                                   (Mutual NDA)
// Defined terms are spans with a "*_link" class; they refer to the Key Terms.

/** A span of inline text. `term` is a defined term that refers to the Key Terms. */
export type Run =
  | { kind: "text"; text: string }
  | { kind: "bold"; runs: Run[] }
  | { kind: "term"; text: string }
  | { kind: "link"; text: string; href: string };

export type Clause = {
  /** The template's own number or letter, e.g. "1", "a", "iv". */
  marker: string;
  /** Nesting depth: 0 for sections, 1 for numbered clauses, 2+ for lettered items. */
  level: number;
  title: string;
  body: Run[];
  children: Clause[];
};

const INLINE =
  /\*\*(.+?)\*\*|<span class="\w+_link"[^>]*>([^<]*)<\/span>|<(https?:\/\/[^>\s]+)>|\[([^\]]+)\]\(([^)]+)\)/g;

export function parseInline(source: string): Run[] {
  // Spans that only carry an anchor id are just text.
  source = source.replace(/<span id="[^"]*">([^<]*)<\/span>/g, "$1");
  const runs: Run[] = [];
  let last = 0;
  const text = (t: string) => t && runs.push({ kind: "text", text: t });
  for (const m of source.matchAll(INLINE)) {
    text(source.slice(last, m.index));
    if (m[1] !== undefined) runs.push({ kind: "bold", runs: parseInline(m[1]) });
    else if (m[2] !== undefined) runs.push({ kind: "term", text: m[2] });
    else if (m[3] !== undefined) runs.push({ kind: "link", text: m[3], href: m[3] });
    else runs.push({ kind: "link", text: m[4], href: /^https?:/.test(m[5]) ? m[5] : `https://${m[5]}` });
    last = m.index + m[0].length;
  }
  text(source.slice(last));
  return runs;
}

const ITEM = /^( *)([0-9]+|[a-z]+)\.\s+(.*)$/;
const HEADER_TITLE = /^<span class="header_\d"[^>]*>([^<]*)<\/span>\s*/;
const BOLD_TITLE = /^\*\*([^*]+)\*\*\.\s*/; // Mutual NDA: `1. **Introduction**. Body`
// The templates' own attribution lines; the renderers add their own.
const ATTRIBUTION_LINE = /CC BY 4\.0/;

/** Parses a template's markdown into its tree of clauses. */
export function parseClauses(markdown: string): Clause[] {
  const roots: Clause[] = [];
  const stack: Clause[] = [];
  // Templates may be checked out with CRLF line endings (e.g. git autocrlf on Windows).
  for (const line of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const m = line.match(ITEM);
    if (!m) {
      const text = line.trim();
      const parent = stack.at(-1);
      if (parent && text && !text.startsWith("#") && !ATTRIBUTION_LINE.test(text)) {
        parent.body.push({ kind: "text", text: " " }, ...parseInline(text)); // Continuation.
      }
      continue;
    }
    const [, indent, marker, rest] = m;
    const level = Math.round(indent.length / 4);
    const heading = rest.match(HEADER_TITLE) ?? rest.match(BOLD_TITLE);
    const clause: Clause = {
      marker,
      level,
      title: heading ? heading[1].trim().replace(/\.$/, "") : "",
      body: parseInline(heading ? rest.slice(heading[0].length) : rest),
      children: [],
    };
    while (stack.length && stack.at(-1)!.level >= level) stack.pop();
    (stack.at(-1)?.children ?? roots).push(clause);
    stack.push(clause);
  }
  return roots;
}

/** Clause numbering as in Common Paper documents: "1", "1.2", then "(a)". */
export function clauseNumber(clause: Clause, parentNumber: string): string {
  if (clause.level === 0) return clause.marker;
  if (clause.level === 1) return `${parentNumber}.${clause.marker}`;
  return `(${clause.marker})`;
}

/** A top-level clause with sub-clauses is rendered as a titled section. */
export function isSection(clause: Clause): boolean {
  return clause.level === 0 && clause.children.length > 0;
}

/** The label printed before a clause: "1." for top-level clauses, else its number. */
export function clauseLabel(clause: Clause, number: string): string {
  return clause.level === 0 ? `${number}.` : number;
}
