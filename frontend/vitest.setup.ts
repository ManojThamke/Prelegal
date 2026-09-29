import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import { resetSession } from "@/lib/session";

afterEach(() => {
  cleanup();
  globalThis.localStorage?.clear(); // Absent in node-environment tests.
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetSession();
});
