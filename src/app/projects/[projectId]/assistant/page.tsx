"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import useSWR from "swr";
import { Notice, PageHeader } from "@/components/ui";
import { apiSend, fetcher } from "@/lib/api";
import { type Filters, filterBody, useFilters } from "@/lib/filters";
import { CHANNEL_LABEL, SENTIMENT_LABEL, fmtDateTime } from "@/lib/format";
import { useProjectId } from "@/lib/project";
import type { ChatSession, StoredChatMessage } from "@/lib/types";

const SUGGESTIONS = [
  "Bandingkan share of voice Indosat dan Tri dengan kompetitor",
  "Apa isu negatif yang paling banyak dibicarakan?",
  "Tampilkan 5 mention Tri dengan engagement tertinggi",
];

const TOOL_LABEL: Record<string, string> = {
  get_overview: "Mengambil ringkasan",
  compare_brands: "Membandingkan brand",
  top_mentions: "Mencari mention teratas",
};

function describeFilter(f: Filters) {
  const range =
    f.range === "custom" && f.from && f.to
      ? `${f.from} s.d. ${f.to}`
      : f.range === "today"
        ? "hari terakhir"
        : f.range === "30d"
          ? "30 hari"
          : "7 hari";
  const ch = f.channels.length ? f.channels.map((c) => CHANNEL_LABEL[c]).join(", ") : "semua channel";
  const se = f.sentiments.length ? f.sentiments.map((s) => SENTIMENT_LABEL[s].toLowerCase()).join(", ") : "semua sentimen";
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

  const { messages, sendMessage, status, stop, error } = useChat({ id: sessionId, messages: initial, transport, onFinish: onSent });
  const busy = status === "submitted" || status === "streaming";

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
    if (!t || busy) return;
    setInput("");
    void sendMessage({ text: t }, { body: { filter: filterBody(filters) } });
  }

  return (
    <div className="flex min-h-[60vh] flex-col rounded-3xl border border-line bg-card">
      <div className="flex-1 space-y-5 overflow-y-auto p-5 md:p-6" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted">Tanyakan apa saja tentang data mention di project ini. Contoh:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="rounded-2xl border border-line px-3.5 py-2 text-left text-sm hover:border-ruby"
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
              <p className="max-w-[80%] whitespace-pre-line rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm text-white">
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
        {status === "submitted" && <p className="text-xs text-muted">Menyiapkan jawaban…</p>}
        {error && (
          <p role="alert" className="text-sm text-neg">
            {error.message.includes("503") || error.message.includes("dikonfigurasi")
              ? "AI Assistant belum dikonfigurasi di server (GEMINI_API_KEY / GEMINI_MODEL)."
              : "Jawaban gagal dibuat. Coba kirim ulang pertanyaan."}
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
        <p className="mb-2 text-xs text-muted">Memakai filter aktif: {describeFilter(filters)}.</p>
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
            placeholder="Tulis pertanyaan"
            aria-label="Pertanyaan untuk AI Assistant"
            className="flex-1 resize-none rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-ruby"
          />
          {busy ? (
            <button type="button" onClick={() => stop()} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold">
              Berhenti
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
              Kirim
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">
          Jawaban dibuat AI dari data yang sudah diunggah. Periksa angka penting di halaman Kompetitor sebelum dipakai.
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

  async function remove(id: string) {
    await apiSend(`${sessionsKey}/${id}`, "DELETE");
    if (activeId === id) setActiveId(null);
    void refreshSessions();
  }

  const isNew = activeId !== null && pending?.id === activeId;

  return (
    <div className="space-y-5">
      <PageHeader title="AI Assistant" detail="Jawaban berdasarkan data social listening project ini" />
      <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
        <aside className="space-y-2">
          <button onClick={newChat} className="w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white">
            Chat baru
          </button>
          <ul className="space-y-1">
            {(sessions ?? []).map((s) => (
              <li key={s.id} className="group flex items-center gap-1">
                <button
                  onClick={() => {
                    setPending(null);
                    setActiveId(s.id);
                  }}
                  aria-current={activeId === s.id ? "true" : undefined}
                  className={`min-w-0 flex-1 rounded-xl px-3 py-2 text-left text-sm ${
                    activeId === s.id ? "bg-card font-semibold" : "text-muted hover:bg-card"
                  }`}
                >
                  <span className="block truncate">{s.title ?? "Chat tanpa judul"}</span>
                  <span className="block text-xs font-normal text-muted">{fmtDateTime(s.updatedAt)}</span>
                </button>
                <button
                  onClick={() => remove(s.id)}
                  aria-label={`Hapus ${s.title ?? "chat"}`}
                  className="rounded-lg px-2 py-1 text-xs text-muted opacity-0 hover:text-neg focus:opacity-100 group-hover:opacity-100"
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {!activeId ? (
          <div className="rounded-3xl border border-line bg-card p-6">
            <p className="text-sm text-muted">Mulai chat baru, atau pilih chat sebelumnya.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={async () => {
                    const created = await apiSend<ChatSession>(sessionsKey, "POST");
                    setPending({ id: created.id, text: s });
                    setActiveId(created.id);
                  }}
                  className="rounded-2xl border border-line px-3.5 py-2 text-left text-sm hover:border-ruby"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : historyError ? (
          <Notice tone="error">Riwayat chat gagal dimuat.</Notice>
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
          <p className="text-sm text-muted">Memuat riwayat…</p>
        )}
      </div>
    </div>
  );
}
