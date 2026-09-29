import { describe, expect, it } from "vitest";

import { timeAgo } from "./drafts";

describe("timeAgo", () => {
  const now = new Date("2026-09-30T12:00:00Z");
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString();

  it("describes recent times in words", () => {
    expect(timeAgo(ago(10), now)).toBe("just now");
    expect(timeAgo(ago(60), now)).toBe("1 minute ago");
    expect(timeAgo(ago(5 * 60), now)).toBe("5 minutes ago");
    expect(timeAgo(ago(3 * 3600), now)).toBe("3 hours ago");
    expect(timeAgo(ago(30 * 3600), now)).toBe("yesterday");
  });

  it("uses a date for older times", () => {
    expect(timeAgo("2026-09-01T12:00:00Z", now)).toBe("Sep 1, 2026");
  });
});
