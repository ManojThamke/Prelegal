import { describe, expect, it } from "vitest";

import { stubTemplatesApi } from "@/test/templatesApi";

import { fetchTemplate, loadMutualNdaTemplate } from "./templates";

describe("fetchTemplate", () => {
  it("requests the template by id", async () => {
    const fetchMock = stubTemplatesApi();
    const template = await fetchTemplate("mutual-nda");
    expect(fetchMock).toHaveBeenCalledWith("/api/templates/mutual-nda");
    expect(template.content).toContain("Introduction");
  });

  it("throws on an HTTP error", async () => {
    stubTemplatesApi();
    await expect(fetchTemplate("missing")).rejects.toThrow(/missing.*404/);
  });
});

describe("loadMutualNdaTemplate", () => {
  it("fetches and parses both Mutual NDA templates", async () => {
    stubTemplatesApi();
    const template = await loadMutualNdaTemplate();
    expect(template.coverIntro.length).toBeGreaterThan(0);
    expect(template.clauses[0].title).toBe("Introduction");
  });

  it("rejects templates it cannot parse", async () => {
    stubTemplatesApi({ content: "nothing" });
    await expect(loadMutualNdaTemplate()).rejects.toThrow(/parse/);
  });
});
