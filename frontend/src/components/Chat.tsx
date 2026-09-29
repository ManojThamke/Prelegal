"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { buttonClass } from "@/components/ui";
import { GREETING, sendChat, type ChatMessage, type ChatResult } from "@/lib/chat";
import type { Draft } from "@/lib/documents";

type Props = {
  draft: Draft;
  /** The saved draft this conversation continues, if any. */
  draftId: number | null;
  /** A saved conversation to resume; a new one starts with the greeting. */
  initialMessages?: ChatMessage[];
  onChange: (result: ChatResult) => void;
};

/** Freeform chat with the AI assistant, which picks the document and fills it in as it goes. */
export default function Chat({ draft, draftId, initialMessages, onChange }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages?.length ? initialMessages : [GREETING]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  // Keep the latest message in view.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, pending, error]);

  /** Sends a conversation whose last message is the user's, and appends the reply. */
  async function send(conversation: ChatMessage[]) {
    setPending(true);
    setError(null);
    try {
      const result = await sendChat(conversation, draft, draftId);
      setMessages([...conversation, { role: "assistant", content: result.reply }]);
      onChange(result);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "The message couldn't be sent. Try again.");
    } finally {
      setPending(false);
    }
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || pending) return;
    const conversation: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(conversation);
    setInput("");
    void send(conversation);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter inserts a new line.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Focusable so keyboard users can scroll it; polite live region announces replies. */}
      <ol
        ref={listRef}
        aria-label="Conversation"
        aria-live="polite"
        tabIndex={0}
        className="flex-1 space-y-4 overflow-y-auto p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue/30"
      >
        {messages.map((message, i) => {
          const mine = message.role === "user";
          return (
            <li key={i} className={mine ? "flex justify-end" : "flex justify-start"}>
              <p
                className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                  mine ? "rounded-br-md bg-brand-navy text-white" : "rounded-bl-md bg-slate-100 text-slate-800"
                }`}
              >
                {message.content}
              </p>
            </li>
          );
        })}
        {pending && (
          <li className="flex justify-start">
            <p role="status" className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-2.5 text-[15px] text-slate-600">
              Thinking…
            </p>
          </li>
        )}
        {error && (
          <li className="space-y-2 text-sm text-rose-700">
            <p role="alert">{error}</p>
            <button
              type="button"
              onClick={() => send(messages)}
              className="font-medium text-brand-blue underline underline-offset-2"
            >
              Retry
            </button>
          </li>
        )}
      </ol>

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-slate-200 bg-white p-3">
        <textarea
          aria-label="Message"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your answer…"
          className="flex-1 resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-[15px] text-slate-900 focus:border-brand-blue focus:outline-none focus:ring-3 focus:ring-brand-blue/20"
        />
        <button type="submit" disabled={pending || !input.trim()} className={buttonClass("primary")}>
          Send
        </button>
      </form>
    </div>
  );
}
