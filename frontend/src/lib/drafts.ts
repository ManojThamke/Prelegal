// The user's saved drafts (/api/drafts). Drafts are saved by the chat as it goes.

import { api } from "./api";
import type { ChatMessage } from "./chat";
import type { Draft } from "./documents";

export type DraftSummary = {
  id: number;
  documentId: string;
  documentName: string;
  title: string;
  complete: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SavedDraft = DraftSummary & { draft: Draft; messages: ChatMessage[] };

export const listDrafts = () => api<DraftSummary[]>("/api/drafts");

export const getDraft = (id: number) => api<SavedDraft>(`/api/drafts/${id}`);

export const deleteDraft = (id: number) => api<void>(`/api/drafts/${id}`, { method: "DELETE" });

/** "just now", "5 minutes ago", "yesterday", or a date. */
export function timeAgo(iso: string, now = new Date()): string {
  const seconds = Math.round((now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (hours < 48) return "yesterday";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
