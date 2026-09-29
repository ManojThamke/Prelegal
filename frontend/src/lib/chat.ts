// Client for the backend's AI chat (POST /api/chat), which drafts the chosen document.

import { todayIso, type Draft } from "./documents";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatResult = { reply: string; draft: Draft };

/** The assistant's first message, shown before any call to the backend. */
export const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I can help you draft a legal agreement, such as an NDA, a cloud service agreement, " +
    "or a data processing agreement. What kind of agreement do you need?",
};

/** Sends the conversation and current draft; returns the reply and the updated draft. */
export async function sendChat(messages: ChatMessage[], draft: Draft): Promise<ChatResult> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // The user's local date, so "today" means the same day to the AI as to the user.
    body: JSON.stringify({ messages, draft, today: todayIso() }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(errorMessage(body?.detail, response.status));
  }
  return response.json();
}

/** FastAPI errors carry a string `detail`, or a list of validation errors (HTTP 422). */
function errorMessage(detail: unknown, status: number): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && typeof detail[0]?.msg === "string") {
    return `Your message could not be sent: ${detail[0].msg}`;
  }
  return `The AI assistant failed (HTTP ${status})`;
}
