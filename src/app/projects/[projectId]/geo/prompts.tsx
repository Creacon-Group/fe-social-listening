"use client";

import { useState } from "react";
import useSWR from "swr";
import { Select } from "@/components/select";
import { btnPrimary, btnQuiet, inputBase, Notice, Panel, Skeleton } from "@/components/ui";
import { apiSend, fetcher } from "@/lib/api";
import { CATEGORY_LABEL, type GeoCategory, type GeoPrompt } from "@/lib/geo-types";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as GeoCategory[];
const STATUS_TONE = { APPROVED: "bg-pos/10 text-pos", DRAFT: "bg-accent-soft text-accent", ARCHIVED: "bg-surface text-muted" } as const;
const MIN_PER_CATEGORY = 2;

function PromptRow({ projectId, p, canEdit, onChanged }: { projectId: number; p: GeoPrompt; canEdit: boolean; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(p.text);
  const [error, setError] = useState<string | null>(null);

  async function update(body: object) {
    setError(null);
    try {
      await apiSend(`/api/projects/${projectId}/geo/prompts/${p.id}`, "PATCH", body);
      setEditing(false);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <li className="border-b border-line py-3 last:border-0">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className={`${inputBase} w-full`} aria-label="Prompt text" />
          ) : (
            <p className="text-sm">{p.text}</p>
          )}
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_TONE[p.status]}`}>{p.status.charAt(0) + p.status.slice(1).toLowerCase()}</span>
            <span>{CATEGORY_LABEL[p.category]}</span>·<span>{p.branded ? "Branded" : "Non-branded"}</span>·<span>v{p.version}</span>
            <span>· {p.language === "en" ? "English" : "Bahasa Indonesia"}</span>
            {p.source === "suggested" && <span>· suggested by AI</span>}
          </p>
          {error && <p className="mt-1 text-xs text-neg">{error}</p>}
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-1.5">
            {editing ? (
              <>
                <button className={btnPrimary} onClick={() => update({ text })} disabled={text.trim().length < 5}>
                  Save as v{p.version + 1}
                </button>
                <button className={btnQuiet} onClick={() => {
                    setEditing(false);
                    setText(p.text);
                  }}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                {p.status !== "APPROVED" && (
                  <button className={btnQuiet} onClick={() => update({ status: "APPROVED" })}>
                    Approve
                  </button>
                )}
                {p.status === "APPROVED" && (
                  <button className={btnQuiet} onClick={() => update({ status: "DRAFT" })}>
                    Remove from benchmark
                  </button>
                )}
                <button className={btnQuiet} onClick={() => setEditing(true)}>
                  Edit
                </button>
                {p.status !== "ARCHIVED" && (
                  <button className={btnQuiet} onClick={() => update({ status: "ARCHIVED" })}>
                    Archive
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export function GeoPromptsTab({ projectId, canEdit }: { projectId: number; canEdit: boolean }) {
  const key = `/api/projects/${projectId}/geo/prompts`;
  const { data, error, mutate } = useSWR<GeoPrompt[]>(key, fetcher);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<GeoCategory>("CATEGORY_DISCOVERY");
  const [branded, setBranded] = useState(false);
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [busy, setBusy] = useState<"add" | "suggest" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [show, setShow] = useState<"active" | "ARCHIVED">("active");

  async function add() {
    setBusy("add");
    setMessage(null);
    try {
      await apiSend(key, "POST", { text, category, branded, language });
      setText("");
      await mutate();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function suggest() {
    setBusy("suggest");
    setMessage(null);
    try {
      const r = await apiSend<{ created: number; skipped?: number; languages?: string[] }>(`${key}/suggest`, "POST");
      setMessage(
        `${r.created} draft prompts added${r.languages && r.languages.length > 1 ? " in Bahasa Indonesia and English" : ""}. Review and approve the ones you want in the benchmark.` +
          (r.skipped ? ` ${r.skipped} suggestions were not in the project language and were left out.` : ""),
      );
      await mutate();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (error) return <Notice tone="error">Couldn&apos;t load prompts: {error.message}</Notice>;
  if (!data) return <Skeleton className="h-96" />;

  const approved = data.filter((p) => p.status === "APPROVED");
  const shown = data.filter((p) => (show === "active" ? p.status !== "ARCHIVED" : p.status === "ARCHIVED"));
  const thin = CATEGORIES.filter((c) => approved.filter((p) => p.category === c).length < MIN_PER_CATEGORY);
  const dupes = new Set(
    data
      .filter((p) => p.status !== "ARCHIVED")
      .map((p) => p.text.trim().toLowerCase())
      .filter((t, i, all) => all.indexOf(t) !== i),
  );

  return (
    <div className="space-y-5">
      <Panel title="Benchmark coverage" aside={`${approved.length} approved prompts (max 50)`}>
        <ul className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
          {CATEGORIES.map((c) => {
            const n = approved.filter((p) => p.category === c).length;
            return (
              <li key={c} className="flex justify-between gap-3 rounded-lg bg-surface/60 px-3 py-2">
                <span>{CATEGORY_LABEL[c]}</span>
                <span className={`num font-semibold ${n < MIN_PER_CATEGORY ? "text-neg" : ""}`}>{n}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted">
          {approved.filter((p) => p.branded).length} branded · {approved.filter((p) => !p.branded).length} non-branded.
          {thin.length > 0 && ` Fewer than ${MIN_PER_CATEGORY} prompts in: ${thin.map((c) => CATEGORY_LABEL[c]).join(", ")}.`}
          {dupes.size > 0 && " Some prompts have the same text."} Only approved prompts run. Editing a prompt saves a new version; past results keep
          the version they used.
        </p>
      </Panel>

      {canEdit && (
        <Panel title="Add a prompt">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Write it as a consumer would ask, e.g. Operator seluler apa yang paling stabil untuk main game online?"
            aria-label="New prompt"
            className={`${inputBase} w-full`}
          />
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <Select label="Category" density="sm" value={category} onChange={(e) => setCategory(e.target.value as GeoCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </Select>
            <Select label="Language" density="sm" value={language} onChange={(e) => setLanguage(e.target.value as "id" | "en")}>
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </Select>
            <label className="flex min-h-9 items-center gap-2 text-sm">
              <input type="checkbox" checked={branded} onChange={(e) => setBranded(e.target.checked)} className="h-4 w-4 accent-[var(--ink)]" />
              Names our brand
            </label>
            <button className={btnPrimary} onClick={add} disabled={busy !== null || text.trim().length < 5}>
              {busy === "add" ? "Adding…" : "Add as draft"}
            </button>
            <button className={`${btnQuiet} ml-auto`} onClick={suggest} disabled={busy !== null}>
              {busy === "suggest" ? "Writing suggestions…" : "Suggest prompts with AI"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Avoid leading questions that push the answer towards our brand. AI suggestions come in as drafts and never run until approved.
          </p>
        </Panel>
      )}

      {message && <Notice>{message}</Notice>}

      <Panel
        title={show === "active" ? "Prompts" : "Archived prompts"}
        aside={
          <button className="font-semibold text-ink underline underline-offset-2" onClick={() => setShow(show === "active" ? "ARCHIVED" : "active")}>
            {show === "active" ? "Show archived" : "Show active"}
          </button>
        }
      >
        {shown.length === 0 ? (
          <p className="text-sm text-muted">No prompts here yet.</p>
        ) : (
          <ul>
            {shown.map((p) => (
              <PromptRow key={`${p.id}-${p.version}-${p.status}`} projectId={projectId} p={p} canEdit={canEdit} onChanged={() => void mutate()} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
