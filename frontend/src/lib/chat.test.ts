import { describe, expect, it } from "vitest";

import { requestBody, stubFetch } from "@/test/fetch";

import { sendChat } from "./chat";
import { defaultNdaData, todayIso } from "./nda";

const messages = [{ role: "user" as const, content: "Hi" }];

describe("sendChat", () => {
  it("posts the conversation, fields and the user's local date", async () => {
    const fetchMock = stubFetch(Response.json({ reply: "Hello", fields: defaultNdaData }));

    const result = await sendChat(messages, defaultNdaData);

    expect(result).toEqual({ reply: "Hello", fields: defaultNdaData });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/chat");
    expect(requestBody(fetchMock)).toEqual({ messages, fields: defaultNdaData, today: todayIso() });
  });

  it("throws the server's error detail", async () => {
    stubFetch(Response.json({ detail: "Not configured" }, { status: 503 }));
    await expect(sendChat(messages, defaultNdaData)).rejects.toThrow("Not configured");
  });

  it("explains validation errors", async () => {
    stubFetch(
      Response.json({ detail: [{ msg: "String should have at most 4000 characters" }] }, { status: 422 }),
    );
    await expect(sendChat(messages, defaultNdaData)).rejects.toThrow(
      "Your message could not be sent: String should have at most 4000 characters",
    );
  });

  it("falls back to a generic error without a detail", async () => {
    stubFetch(new Response("Bad gateway", { status: 502 }));
    await expect(sendChat(messages, defaultNdaData)).rejects.toThrow(/HTTP 502/);
  });
});
