import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseCoverIntro, parseStandardTerms, type NdaTemplate } from "./nda";

// The Common Paper templates live in the repository root, next to this app.
const TEMPLATES_DIR = path.join(process.cwd(), "..", "templates");

export async function loadMutualNdaTemplate(): Promise<NdaTemplate> {
  const [coverPage, standardTerms] = await Promise.all([
    readFile(path.join(TEMPLATES_DIR, "Mutual-NDA-coverpage.md"), "utf8"),
    readFile(path.join(TEMPLATES_DIR, "Mutual-NDA.md"), "utf8"),
  ]);

  const template = {
    coverIntro: parseCoverIntro(coverPage),
    clauses: parseStandardTerms(standardTerms),
  };
  if (template.coverIntro.length === 0 || template.clauses.length === 0) {
    throw new Error(`Could not parse the Mutual NDA templates in ${TEMPLATES_DIR}`);
  }
  return template;
}
