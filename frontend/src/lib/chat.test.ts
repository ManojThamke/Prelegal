import { describe, expect, it } from "vitest";

import { requestBody, stubFetch } from "@/test/backend";

import { sendChat } from "./chat";
import { emptyDraft, todayIso } from "./documents";

const messages = [{ role: "user" as const, content: "Hi" }];

describe("sendChat", () => {
  it("posts the conversation, draft and the user's local date", async () => {
    const fetchMock = stubFetch(Response.json({ reply: "Hello", draft: emptyDraft, draftId: 4 }));

    const result = await sendChat(messages, emptyDraft, 4);

    expect(result).toEqual({ reply: "Hello", draft: emptyDraft, draftId: 4 });
    expect(fetchMock).toHaveBeenCalledWith("/api/chat", expect.anything());
    expect(requestBody(fetchMock)).toEqual({ messages, draft: emptyDraft, draftId: 4, today: todayIso() });
  });

  it("throws the server's error detail", async () => {
    stubFetch(Response.json({ detail: "Not configured" }, { status: 503 }));
    await expect(sendChat(messages, emptyDraft, null)).rejects.toThrow("Not configured");
  });

  it("explains validation errors", async () => {
    stubFetch(
      Response.json({ detail: [{ msg: "String should have at most 4000 characters" }] }, { status: 422 }),
    );
    await expect(sendChat(messages, emptyDraft, null)).rejects.toThrow(
      "Your message could not be sent: String should have at most 4000 characters",
    );
  });

  it("falls back to a generic error without a detail", async () => {
    stubFetch(new Response("Bad gateway", { status: 502 }));
    await expect(sendChat(messages, emptyDraft, null)).rejects.toThrow("The AI assistant didn't respond. Try again.");
  });
});
