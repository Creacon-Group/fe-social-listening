"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import useSWR from "swr";
import { btnPrimary, Notice, PageHeader } from "@/components/ui";
import { apiSend, fetcher } from "@/lib/api";
import { CreditsExhausted, creditLine, useCredits } from "@/lib/credits";
import { type Filters, filterBody, useFilters } from "@/lib/filters";
import { CHANNEL_LABEL, SENTIMENT_LABEL, fmtDateTime } from "@/lib/format";
import { useProjectId } from "@/lib/project";
import type { ChatSession, StoredChatMessage } from "@/lib/types";

const SUGGESTIONS = [
  "Compare share of voice for Indosat and Tri against competitors",
  "What negative issues come up most?",
  "Show the 5 Tri mentions with the most engagement",
];

const TOOL_LABEL: Record<string, string> = {
  get_overview: "Reading the summary",
  compare_brands: "Comparing brands",
  top_mentions: "Finding top mentions",
};

function describeFilter(f: Filters) {
  const range =
    f.range === "custom" && f.from && f.to
      ? `${f.from} to ${f.to}`
      : f.range === "today"
        ? "latest day"
        : f.range === "30d"
          ? "last 30 days"
          : "last 7 days";
  const ch = f.channels.length ? f.channels.map((c) => CHANNEL_LABEL[c]).join(", ") : "all channels";
  const se = f.sentiments.length ? f.sentiments.map((s) => SENTIMENT_LABEL[s].toLowerCase()).join(", ") : "all sentiment";
  return `${range}, ${ch}, ${se}`;
}

const toUi = (m: StoredChatMessage): UIMessage => ({
  id: `db-${m.id}`,
  role: m.role === "USER" ? "user" : "assistant",
  parts: [{ type: "text", text: m.content }],
});

function ChatPane({
  projectId,
  sessionId,
  initial,
  firstMessage,
  onSent,
}: {
  projectId: number;
  sessionId: string;
  initial: UIMessage[];
  firstMessage?: string;
  onSent: () => void;
}) {
  const { filters } = useFilters();
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: `/api/projects/${projectId}/assistant/sessions/${sessionId}/chat`,
        credentials: "include",
        // The server keeps the history; send only the new text and the dashboard filter.
        prepareSendMessagesRequest: ({ messages, body }) => {
          const last = messages[messages.length - 1];
          const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          return { body: { text, filter: body?.filter } };
        },
      }),
    [projectId, sessionId],
  );

  const { data: credits, mutate: refreshCredits } = useCredits();
  const outOfCredits = !!credits && !credits.unlimited && credits.remaining === 0;
  const { messages, sendMessage, status, stop, error } = useChat({
    id: sessionId,
    messages: initial,
    transport,
    onFinish: () => {
      onSent();
      void refreshCredits();
    },
    onError: () => void refreshCredits(),
  });
  const busy = status === "submitted" || status === "streaming";
  const creditError = error?.message.includes("CREDITS_EXHAUSTED");

  const sentFirst = useRef(false);
  useEffect(() => {
    if (firstMessage && !sentFirst.current) {
      sentFirst.current = true;
      void sendMessage({ text: firstMessage }, { body: { filter: filterBody(filters) } });
    }
  }, [firstMessage, sendMessage, filters]);

  function submit(text: string) {
    const t = text.trim();
    if (!t || busy || outOfCredits) return;
    setInput("");
    void sendMessage({ text: t }, { body: { filter: filterBody(filters) } });
  }

  // Follow the answer while it streams, but only if the reader is already at the bottom:
  // scrolling up to re-read must not be yanked back down by every new token.
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  useEffect(() => {
    const el = scroller.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  // Messages that were already there when the chat opened do not animate in.
  const [seen] = useState(() => new Set(initial.map((m) => m.id)));

  return (
    <div className="flex h-[calc(100dvh-15rem)] min-h-[28rem] flex-col overflow-hidden rounded-[14px] bg-card md:h-[calc(100dvh-13rem)]">
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 space-y-6 overflow-y-auto overscroll-contain p-5 md:p-6"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div className="mx-auto max-w-xl space-y-4 pt-6 text-center">
            <p className="t-headline">Ask about this project&apos;s mentions</p>
            <p className="text-sm text-muted">Answers use the numbers behind the dashboard, for the filters you have on.</p>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  disabled={outOfCredits}
                  className="rounded-xl bg-surface px-3.5 py-2 text-left text-sm hover:bg-line/60 disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => {
          const fresh = !seen.has(m.id);
          return m.role === "user" ? (
            <div key={m.id} className={`flex justify-end ${fresh ? "msg-enter" : ""}`}>
              <p className="max-w-[80%] whitespace-pre-line rounded-[18px] rounded-br-md bg-ink px-4 py-2.5 text-[0.9375rem] leading-snug text-on-ink">
                {m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
              </p>
            </div>
          ) : (
            <div key={m.id} className={`max-w-[72ch] space-y-3 ${fresh ? "msg-enter" : ""}`}>
              {m.parts.map((p, i) => {
                if (p.type === "text")
                  return (
                    <div key={i} className="prose-chat text-[0.9375rem] leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // Wide tables scroll inside the message instead of stretching the chat.
                          table: ({ children }) => (
                            <div className="-mx-1 overflow-x-auto px-1">
                              <table>{children}</table>
                            </div>
                          ),
                        }}
                      >
                        {p.text}
                      </ReactMarkdown>
                    </div>
                  );
                if (p.type.startsWith("tool-")) {
                  const name = p.type.slice(5);
                  const done = "state" in p && (p.state === "output-available" || p.state === "output-error");
                  return (
                    <p key={i} className="t-caption flex items-center gap-2 text-muted">
                      {done ? (
                        <svg aria-hidden viewBox="0 0 12 12" className="h-3 w-3 text-pos" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m2.5 6.5 2.2 2.2L9.5 3.5" />
                        </svg>
                      ) : (
                        <span aria-hidden className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-muted/30 border-t-muted" />
                      )}
                      {TOOL_LABEL[name] ?? name}
                    </p>
                  );
                }
                return null;
              })}
            </div>
          );
        })}
        {status === "submitted" && (
          <p className="flex items-center gap-2 text-sm text-muted" role="status">
            <span aria-hidden className="thinking-dots">
              <span />
              <span />
              <span />
            </span>
            Thinking
          </p>
        )}
        {error && !creditError && (
          <p role="alert" className="rounded-lg bg-neg/10 px-3 py-2 text-sm text-neg">
            {error.message.includes("503") || error.message.includes("not configured")
              ? "The assistant isn't set up on the server yet (AI model settings)."
              : /overloaded|high demand|rate limit/i.test(error.message)
                ? "The AI model is busy right now. Wait a moment, then send the question again."
                : "No answer came back. Send the question again."}
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-4"
      >
        {outOfCredits && credits && (
          <div className="mb-3">
            <CreditsExhausted credits={credits} />
          </div>
        )}
        <div className="flex items-end gap-2 rounded-[20px] bg-surface p-1.5 pl-4 ring-1 ring-line ring-inset focus-within:ring-2 focus-within:ring-accent">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit(input);
              }
            }}
            rows={1}
            maxLength={2000}
            disabled={outOfCredits}
            placeholder={outOfCredits ? "No credits left today" : "Ask a question"}
            aria-label="Question for the brand assistant"
            className="composer max-h-40 min-h-9 flex-1 resize-none bg-transparent py-2 text-[0.9375rem] leading-snug outline-none [field-sizing:content] placeholder:text-muted"
          />
          {busy ? (
            <button type="button" onClick={() => stop()} aria-label="Stop the answer" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-on-ink">
              <span aria-hidden className="h-2.5 w-2.5 rounded-[2px] bg-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || outOfCredits}
              aria-label="Send"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-on-ink disabled:opacity-30"
            >
              <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
              </svg>
            </button>
          )}
        </div>
        <p className="t-caption mt-2 px-1 text-muted">
          {credits && <span className="font-semibold text-ink">{creditLine(credits)} </span>}
          Filters: {describeFilter(filters)}. Written by AI from the uploaded data, so check key numbers before you use them.
        </p>
      </form>
    </div>
  );
}

export default function AssistantPage() {
  const projectId = useProjectId();
  const sessionsKey = `/api/projects/${projectId}/assistant/sessions`;
  const { data: sessions, mutate: refreshSessions } = useSWR<ChatSession[]>(sessionsKey, fetcher);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ id: string; text?: string } | null>(null);

  const { data: history, error: historyError } = useSWR<StoredChatMessage[]>(
    activeId && pending?.id !== activeId ? `${sessionsKey}/${activeId}/messages` : null,
    fetcher,
  );

  async function newChat() {
    const s = await apiSend<ChatSession>(sessionsKey, "POST");
    setPending({ id: s.id });
    setActiveId(s.id);
    void refreshSessions();
  }

  // Delete with undo instead of a confirm dialog: the chat disappears at once, and is only removed
  // on the server when the undo window closes.
  const [deleted, setDeleted] = useState<ChatSession | null>(null);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitDelete = useCallback(
    async (id: string) => {
      await apiSend(`${sessionsKey}/${id}`, "DELETE").catch(() => undefined);
      setDeleted((d) => (d?.id === id ? null : d));
      void refreshSessions();
    },
    [sessionsKey, refreshSessions],
  );
  function remove(s: ChatSession) {
    if (deleted && deleteTimer.current) {
      clearTimeout(deleteTimer.current);
      void commitDelete(deleted.id);
    }
    if (activeId === s.id) setActiveId(null);
    setDeleted(s);
    deleteTimer.current = setTimeout(() => void commitDelete(s.id), 5000);
  }
  function undoDelete() {
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    setDeleted(null);
  }
  useEffect(() => () => {
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
  }, []);

  const isNew = activeId !== null && pending?.id === activeId;
  const { data: credits } = useCredits();
  const outOfCredits = !!credits && !credits.unlimited && credits.remaining === 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Brand assistant" detail="Answers come from this project&apos;s social listening data" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[16rem_1fr]">
        <aside className="space-y-2">
          <button onClick={newChat} className={`${btnPrimary} w-full`}>
            New chat
          </button>
          {/* Phones: a short scrolling list so the conversation stays on the first screen. */}
          <ul className="max-h-40 space-y-1 overflow-y-auto overscroll-contain lg:max-h-[calc(100dvh-17rem)]" aria-label="Earlier chats">
            {(sessions ?? []).filter((s) => s.id !== deleted?.id).map((s) => (
              <li key={s.id} className="group flex items-center gap-1">
                <button
                  onClick={() => {
                    setPending(null);
                    setActiveId(s.id);
                  }}
                  aria-current={activeId === s.id ? "true" : undefined}
                  className={`min-w-0 flex-1 rounded-md px-3 py-2 text-left text-sm ${
                    activeId === s.id ? "bg-card font-semibold" : "text-muted hover:bg-card"
                  }`}
                >
                  <span className="block truncate">{s.title ?? "Untitled chat"}</span>
                  <span className="block text-xs font-normal text-muted">{fmtDateTime(s.updatedAt)}</span>
                </button>
                <button
                  onClick={() => remove(s)}
                  aria-label={`Delete ${s.title ?? "chat"}`}
                  className="min-h-9 rounded-lg px-2 text-xs text-muted opacity-0 hover:text-neg focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
          {deleted && (
            <p role="status" className="flex items-center justify-between gap-2 rounded-lg bg-card px-3 py-2 text-xs text-muted">
              Chat deleted.
              <button onClick={undoDelete} className="min-h-8 font-semibold text-ink hover:underline">
                Undo
              </button>
            </p>
          )}
        </aside>

        {!activeId ? (
          <div className="space-y-4 rounded-[14px] bg-card p-6">
            {outOfCredits && credits && <CreditsExhausted credits={credits} />}
            <p className="text-sm text-muted">Start a new chat or pick an earlier one.</p>
            {credits && <p className="text-xs text-muted">{creditLine(credits)}</p>}
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={async () => {
                    const created = await apiSend<ChatSession>(sessionsKey, "POST");
                    setPending({ id: created.id, text: s });
                    setActiveId(created.id);
                  }}
                  disabled={outOfCredits}
                  className="rounded-[14px] px-3.5 py-2 text-left ring-1 ring-line ring-inset text-sm hover:ring-ink/40 disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : historyError ? (
          <Notice tone="error">Couldn&apos;t load this chat.</Notice>
        ) : isNew || history ? (
          <ChatPane
            key={activeId}
            projectId={projectId}
            sessionId={activeId}
            initial={isNew ? [] : (history ?? []).map(toUi)}
            firstMessage={isNew ? pending?.text : undefined}
            onSent={() => void refreshSessions()}
          />
        ) : (
          <p className="text-sm text-muted">Loading chat…</p>
        )}
      </div>
    </div>
  );
}
