// Loads legal templates from the backend's /api/templates endpoints.

import { parseCoverIntro, parseStandardTerms, type NdaTemplate } from "./nda";

export type TemplateDocument = {
  id: string;
  name: string;
  description: string;
  /** The template's markdown source. */
  content: string;
};

export async function fetchTemplate(id: string): Promise<TemplateDocument> {
  const response = await fetch(`/api/templates/${encodeURIComponent(id)}`);
  if (!response.ok) {
    throw new Error(`Could not load template "${id}" (HTTP ${response.status})`);
  }
  return response.json();
}

export async function loadMutualNdaTemplate(): Promise<NdaTemplate> {
  const [coverPage, standardTerms] = await Promise.all([
    fetchTemplate("mutual-nda-coverpage"),
    fetchTemplate("mutual-nda"),
  ]);

  const template = {
    coverIntro: parseCoverIntro(coverPage.content),
    clauses: parseStandardTerms(standardTerms.content),
  };
  if (template.coverIntro.length === 0 || template.clauses.length === 0) {
    throw new Error("Could not parse the Mutual NDA templates");
  }
  return template;
}
