// Client for the backend's AI chat (POST /api/chat), which drafts the chosen document.

import { api, ApiError } from "./api";
import { todayIso, type Draft } from "./documents";

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** `draftId` is set once the chat has chosen a document and saved the draft. */
export type ChatResult = { reply: string; draft: Draft; draftId: number | null };

/** The assistant's first message, shown before any call to the backend. */
export const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I can help you draft a legal agreement, such as an NDA, a cloud service agreement, " +
    "or a data processing agreement. What kind of agreement do you need?",
};

/** Sends the conversation and current draft; returns the reply and the updated draft. */
export async function sendChat(messages: ChatMessage[], draft: Draft, draftId: number | null): Promise<ChatResult> {
  try {
    return await api<ChatResult>("/api/chat", {
      method: "POST",
      // The user's local date, so "today" means the same day to the AI as to the user.
      body: { messages, draft, draftId, today: todayIso() },
      fallback: "The AI assistant didn't respond. Try again.",
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) throw new Error(`Your message could not be sent: ${e.message}`);
    throw e;
  }
}
