"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { Sheet } from "@/components/overlay";
import { btnPrimary, btnQuiet, inputBase, Notice, PageHeader, Panel, Skeleton } from "@/components/ui";
import { apiSend, fetcher } from "@/lib/api";
import { CHANNEL_LABEL, fmt } from "@/lib/format";
import { brandColor, useCategories, useMe, useProjectId } from "@/lib/project";
import type { Category, CategoryPreview, ZanrooTagSuggestions } from "@/lib/types";

const SWATCHES = ["#2563eb", "#0f766e", "#c2410c", "#7c3aed", "#db2777", "#ca8a04", "#0891b2", "#4b5563"];

type Draft = { id?: number; name: string; color: string | null; zanrooTags: string[]; keywordsText: string };

const emptyDraft: Draft = { name: "", color: SWATCHES[0], zanrooTags: [], keywordsText: "" };
const toKeywords = (text: string) =>
  text
    .split(/[\n,]+/)
    .map((k) => k.trim())
    .filter((k) => k.length >= 2);

/** Match count for the rules being edited, refreshed shortly after typing stops. */
function usePreview(projectId: number, zanrooTags: string[], keywords: string[]) {
  const body = useMemo(() => JSON.stringify({ zanrooTags, keywords }), [zanrooTags, keywords]);
  const deferred = useDeferredValue(body);
  const [state, setState] = useState<{ key: string; data?: CategoryPreview; error?: string } | null>(null);
  useEffect(() => {
    const parsed = JSON.parse(deferred) as { zanrooTags: string[]; keywords: string[] };
    if (!parsed.zanrooTags.length && !parsed.keywords.length) return;
    let live = true;
    const t = setTimeout(() => {
      apiSend<CategoryPreview>(`/api/projects/${projectId}/categories/preview`, "POST", parsed)
        .then((data) => live && setState({ key: deferred, data }))
        .catch((e: Error) => live && setState({ key: deferred, error: e.message }));
    }, 400);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [deferred, projectId]);
  const empty = !zanrooTags.length && !keywords.length;
  return { preview: empty ? null : state?.key === body ? state : null, loading: !empty && state?.key !== body };
}

function TagPicker({ projectId, value, onChange }: { projectId: number; value: string[]; onChange: (v: string[]) => void }) {
  const { data } = useSWR<ZanrooTagSuggestions>(`/api/projects/${projectId}/categories/zanroo-tags`, fetcher);
  const [q, setQ] = useState("");
  const matches = (data?.items ?? [])
    .filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 60);
  const toggle = (name: string) => onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Selected Zanroo tags">
          {value.map((v) => (
            <li key={v}>
              <button
                type="button"
                onClick={() => toggle(v)}
                aria-label={`Remove ${v}`}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-ink pl-3 pr-2 text-xs font-semibold text-on-ink"
              >
                {v}
                <span aria-hidden className="opacity-70">
                  ✕
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search Zanroo tags and categories"
        className={`${inputBase} w-full`}
      />
      <ul className="mt-2 max-h-56 divide-y divide-line overflow-y-auto rounded-lg ring-1 ring-line ring-inset">
        {!data ? (
          <li className="px-3 py-2 text-sm text-muted">Loading tags…</li>
        ) : matches.length === 0 ? (
          <li className="px-3 py-2 text-sm text-muted">No tag matches “{q}”.</li>
        ) : (
          matches.map((i) => (
            <li key={`${i.kind}:${i.name}`}>
              <label className="flex min-h-10 cursor-pointer items-center gap-3 px-3 text-sm hover:bg-surface">
                <input type="checkbox" checked={value.includes(i.name)} onChange={() => toggle(i.name)} className="h-4 w-4 accent-[var(--ink)]" />
                <span className="min-w-0 flex-1 truncate">{i.name}</span>
                <span className="t-caption shrink-0 text-muted">
                  {i.kind === "category" ? "Category" : "Tag"}, {fmt(i.count)}
                </span>
              </label>
            </li>
          ))
        )}
      </ul>
      {data && <p className="t-caption mt-1.5 text-muted">Counts are from the latest {fmt(data.sampled)} tagged mentions.</p>}
    </div>
  );
}

function Editor({ projectId, initial, onDone }: { projectId: number; initial: Draft; onDone: (saved: boolean) => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const keywords = useMemo(() => toKeywords(d.keywordsText), [d.keywordsText]);
  const { preview, loading } = usePreview(projectId, d.zanrooTags, keywords);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => nameRef.current?.focus(), []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const body = { name: d.name, color: d.color, zanrooTags: d.zanrooTags, keywords };
      await apiSend(`/api/projects/${projectId}/categories${d.id ? `/${d.id}` : ""}`, d.id ? "PUT" : "POST", body);
      onDone(true);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Name</span>
          <input
            ref={nameRef}
            required
            maxLength={80}
            value={d.name}
            onChange={(e) => setD({ ...d, name: e.target.value })}
            placeholder="For example Network"
            className={`${inputBase} w-full`}
          />
        </label>
        <fieldset>
          <legend className="mb-1 block text-sm font-semibold">Colour</legend>
          <div className="flex min-h-10 items-center gap-1.5">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                aria-pressed={d.color === c}
                onClick={() => setD({ ...d, color: c })}
                className={`h-7 w-7 rounded-full ${d.color === c ? "ring-2 ring-ink ring-offset-2 ring-offset-card" : ""}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </fieldset>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h3 className="text-sm font-semibold">From Zanroo tags</h3>
          <p className="mb-2 mt-0.5 text-xs text-muted">Mentions Zanroo already tagged with any of these join the topic.</p>
          <TagPicker projectId={projectId} value={d.zanrooTags} onChange={(zanrooTags) => setD({ ...d, zanrooTags })} />
        </section>
        <section>
          <label htmlFor="keywords" className="text-sm font-semibold">
            From keywords
          </label>
          <p className="mb-2 mt-0.5 text-xs text-muted">
            One per line or separated by commas. Matches whole words in any letter case, so “tri” doesn&apos;t match “strike”.
          </p>
          <textarea
            id="keywords"
            rows={9}
            value={d.keywordsText}
            onChange={(e) => setD({ ...d, keywordsText: e.target.value })}
            placeholder={"sinyal\nlemot\nno service"}
            className={`${inputBase} w-full resize-y`}
          />
        </section>
      </div>

      <div role="status" aria-live="polite" className="rounded-lg bg-surface p-3 text-sm">
        {!d.zanrooTags.length && !keywords.length ? (
          <span className="text-muted">Add a Zanroo tag or a keyword to see how many mentions match.</span>
        ) : loading || !preview ? (
          <span className="text-muted">Counting matches…</span>
        ) : preview.error ? (
          <span className="text-neg">{preview.error}</span>
        ) : (
          <>
            <p>
              Matches <span className="num font-semibold">{fmt(preview.data!.total)}</span> mentions across all data.
            </p>
            {preview.data!.samples.length > 0 && (
              <ul className="mt-2 space-y-1.5 text-xs text-muted">
                {preview.data!.samples.slice(0, 3).map((s) => (
                  <li key={s.id} className="line-clamp-2">
                    <span className="font-semibold text-ink">{CHANNEL_LABEL[s.channel]}:</span> {s.content}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {err && (
        <p role="alert" className="text-sm text-neg">
          {err}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy || !d.name.trim()} className={btnPrimary}>
          {busy ? "Saving and tagging mentions…" : d.id ? "Save changes" : "Create topic"}
        </button>
        <button type="button" onClick={() => onDone(false)} disabled={busy} className={btnQuiet}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function CategoriesPage() {
  const projectId = useProjectId();
  const { data: me } = useMe();
  const { data: categories, error, mutate } = useCategories(projectId);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const closeDelete = useCallback(() => setDeleting(null), []);
  const editorRef = useRef<HTMLDivElement>(null);
  const isAdmin = me?.role === "ADMIN" || me?.role === "SUPERADMIN";

  const edit = (draft: Draft) => {
    setEditing(draft);
    requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  async function confirmDelete() {
    if (!deleting) return;
    setBusyDelete(true);
    await apiSend(`/api/projects/${projectId}/categories/${deleting.id}`, "DELETE").catch(() => undefined);
    setBusyDelete(false);
    setDeleting(null);
    void mutate();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Topic categories"
        detail="Group mentions into topics using Zanroo tags and keywords. Changes apply to all existing mentions and to new ones as they arrive."
        actions={
          isAdmin && !editing ? (
            <button onClick={() => edit({ ...emptyDraft, color: SWATCHES[(categories?.length ?? 0) % SWATCHES.length] })} className={btnPrimary}>
              New topic
            </button>
          ) : undefined
        }
      />

      {me && !isAdmin && <Notice>Only admins can change topic categories.</Notice>}

      {editing && (
        <div ref={editorRef} className="scroll-mt-24">
          <Panel title={editing.id ? `Edit ${editing.name}` : "New topic"}>
            <Editor
              key={editing.id ?? "new"}
              projectId={projectId}
              initial={editing}
              onDone={(saved) => {
                setEditing(null);
                if (saved) void mutate();
              }}
            />
          </Panel>
        </div>
      )}

      <Panel title="Topics">
        {error ? (
          <Notice tone="error">Couldn&apos;t load topic categories: {error.message}</Notice>
        ) : !categories ? (
          <Skeleton className="h-40" />
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted">
            No topics yet. {isAdmin ? "Create the first one, for example Network, Quota or Customer care." : ""}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {categories.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ background: brandColor(c, c.id) }} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.name}</p>
                  <p className="t-caption mt-0.5 text-muted">
                    {c.zanrooTags.length ? `${c.zanrooTags.length} Zanroo ${c.zanrooTags.length === 1 ? "tag" : "tags"}` : "No Zanroo tags"}
                    {", "}
                    {c.keywords.length ? `${c.keywords.length} ${c.keywords.length === 1 ? "keyword" : "keywords"}` : "no keywords"}
                  </p>
                </div>
                <span className="num text-sm">
                  <span className="font-semibold">{fmt(c.mentionCount)}</span> <span className="text-muted">mentions</span>
                </span>
                {isAdmin && (
                  <span className="flex gap-1">
                    <button
                      onClick={() =>
                        edit({ id: c.id, name: c.name, color: c.color, zanrooTags: c.zanrooTags, keywordsText: c.keywords.join("\n") })
                      }
                      className="min-h-9 rounded-lg px-3 text-sm font-semibold hover:bg-surface"
                    >
                      Edit
                    </button>
                    <button onClick={() => setDeleting(c)} className="min-h-9 rounded-lg px-3 text-sm font-semibold text-muted hover:bg-surface hover:text-neg">
                      Delete
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Sheet
        open={!!deleting}
        onClose={closeDelete}
        title={`Delete ${deleting?.name ?? "topic"}?`}
        footer={
          <>
            <button type="button" onClick={closeDelete} className={btnQuiet} data-autofocus>
              Cancel
            </button>
            <button type="button" onClick={confirmDelete} disabled={busyDelete} className={btnPrimary.replace("bg-ink", "bg-neg").replace("text-on-ink", "text-white")}>
              {busyDelete ? "Deleting…" : "Delete topic"}
            </button>
          </>
        }
      >
        <p className="text-sm text-muted">
          The topic and its rules are removed from {fmt(deleting?.mentionCount ?? 0)} mentions. The mentions themselves stay. You can create the
          topic again later.
        </p>
      </Sheet>
    </div>
  );
}
