"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import useSWR from "swr";
import { Notice, PageHeader } from "@/components/ui";
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
  const endRef = useRef<HTMLDivElement>(null);

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

  // Braces matter: newer browsers return a Promise from scrollIntoView, and an effect may only return a cleanup.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  function submit(text: string) {
    const t = text.trim();
    if (!t || busy || outOfCredits) return;
    setInput("");
    void sendMessage({ text: t }, { body: { filter: filterBody(filters) } });
  }

  return (
    <div className="flex min-h-[60vh] flex-col rounded-[14px] bg-card">
      <div className="flex-1 space-y-5 overflow-y-auto p-5 md:p-6" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted">Ask about the mentions in this project. For example:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  disabled={outOfCredits}
                  className="rounded-[14px] px-3.5 py-2 text-left ring-1 ring-line ring-inset text-sm hover:ring-ink/40 disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[80%] whitespace-pre-line rounded-lg rounded-br-sm bg-ink px-4 py-2.5 text-sm text-on-ink">
                {m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
              </p>
            </div>
          ) : (
            <div key={m.id} className="max-w-[92%] space-y-2">
              {m.parts.map((p, i) => {
                if (p.type === "text")
                  return (
                    <div key={i} className="prose-chat text-sm leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.text}</ReactMarkdown>
                    </div>
                  );
                if (p.type.startsWith("tool-")) {
                  const name = p.type.slice(5);
                  return (
                    <p key={i} className="text-xs text-muted">
                      {TOOL_LABEL[name] ?? name}
                    </p>
                  );
                }
                return null;
              })}
            </div>
          ),
        )}
        {status === "submitted" && <p className="text-xs text-muted">Working on it…</p>}
        {error && !creditError && (
          <p role="alert" className="text-sm text-neg">
            {error.message.includes("503") || error.message.includes("dikonfigurasi")
              ? "The assistant isn't set up on the server yet (AI model settings)."
              : error.message.includes("sibuk")
                ? "The AI model is busy right now. Wait a moment, then send the question again."
                : "No answer came back. Send the question again."}
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="border-t border-line p-3 md:p-4"
      >
        {outOfCredits && credits && (
          <div className="mb-3">
            <CreditsExhausted credits={credits} />
          </div>
        )}
        <p className="mb-2 text-xs text-muted">Using the filters above: {describeFilter(filters)}.</p>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            rows={2}
            maxLength={2000}
            disabled={outOfCredits}
            placeholder={outOfCredits ? "No credits left today" : "Ask a question"}
            aria-label="Question for the brand assistant"
            className="flex-1 resize-none rounded-[14px] bg-surface px-3.5 ring-1 ring-line ring-inset py-2.5 text-sm outline-none focus:ring-2 focus:ring-ink"
          />
          {busy ? (
            <button type="button" onClick={() => stop()} className="rounded-lg px-4 py-2.5 text-sm ring-1 ring-line ring-inset font-semibold">
              Stop
            </button>
          ) : (
            <button type="submit" disabled={!input.trim() || outOfCredits} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-on-ink disabled:opacity-40">
              Send
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">
          {credits && <span className="font-semibold text-ink">{creditLine(credits)} </span>}
          Each answered question uses one credit. Answers are written by AI from the uploaded data, so check key numbers on
          the Competitors page before you use them.
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
          <button onClick={newChat} className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-on-ink">
            New chat
          </button>
          <ul className="space-y-1">
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
