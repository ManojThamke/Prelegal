// Test helper: stubs fetch with a fake backend (/api/templates/{id} and /api/chat).
import { readFileSync } from "node:fs";
import path from "node:path";

import { vi } from "vitest";

import type { ChatResult } from "@/lib/chat";

const TEMPLATES_DIR = path.join(__dirname, "..", "..", "..", "templates");

const TEMPLATE_FILES: Record<string, string> = {
  "mutual-nda": "Mutual-NDA.md",
  "mutual-nda-coverpage": "Mutual-NDA-coverpage.md",
};

export function readTemplate(filename: string): string {
  return readFileSync(path.join(TEMPLATES_DIR, filename), "utf8");
}

/**
 * Serves the real template files for known ids and 404 otherwise. `status` makes every
 * request fail with that HTTP status; `content` replaces every template's markdown;
 * `chat` is returned by POST /api/chat.
 */
export function stubTemplatesApi(
  options: { status?: number; content?: string; chat?: ChatResult } = {},
) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === "/api/chat" && options.chat) return Response.json(options.chat);
    const id = url.replace("/api/templates/", "");
    const file = TEMPLATE_FILES[id];
    if (options.status) return new Response("", { status: options.status });
    if (!file) return Response.json({ detail: `Unknown template: ${id}` }, { status: 404 });
    return Response.json({ id, name: id, description: "", content: options.content ?? readTemplate(file) });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
