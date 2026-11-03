"use client";

import { useState } from "react";
import useSWR from "swr";
import { Select } from "@/components/select";
import { btnPrimary, inputBase, Notice, Panel, Skeleton } from "@/components/ui";
import { apiSend, fetcher } from "@/lib/api";
import type { GeoSettings } from "@/lib/geo-types";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="t-caption mb-1 block text-muted">{label}</span>
      {children}
    </label>
  );
}

export function GeoSettingsTab({ projectId, canEdit }: { projectId: number; canEdit: boolean }) {
  const key = `/api/projects/${projectId}/geo/settings`;
  const { data, mutate } = useSWR<GeoSettings>(key, fetcher);
  if (!data) return <Skeleton className="h-96" />;
  return <SettingsForm key={projectId} url={key} data={data} canEdit={canEdit} onSaved={(next) => void mutate(next, { revalidate: false })} />;
}

function SettingsForm({ url: key, data, canEdit, onSaved }: { url: string; data: GeoSettings; canEdit: boolean; onSaved: (s: GeoSettings) => void }) {
  const [draft, setDraft] = useState<GeoSettings>(data);
  const [domains, setDomains] = useState<Record<number, string>>(() =>
    Object.fromEntries(data.brands.map((b) => [b.id, b.domains.join(", ")])),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "muted" | "error"; text: string } | null>(null);
  const set = (patch: Partial<GeoSettings>) => setDraft({ ...draft, ...patch });
  const setProfile = (patch: Partial<GeoSettings["profile"]>) => set({ profile: { ...draft.profile, ...patch } });

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const next = await apiSend<GeoSettings>(key, "PUT", {
        enabled: draft.enabled,
        runDay: draft.runDay,
        runsPerPrompt: draft.runsPerPrompt,
        profile: draft.profile,
        brandDomains: draft.brands.map((b) => ({
          brandId: b.id,
          domains: (domains[b.id] ?? "").split(/[,\s]+/).filter(Boolean),
        })),
      });
      onSaved(next);
      setDraft(next);
      setMessage({ tone: "muted", text: "Settings saved." });
    } catch (e) {
      setMessage({ tone: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const off = !canEdit;
  return (
    <div className="space-y-5">
      {off && <Notice>Only admins can change GEO settings.</Notice>}

      <Panel title="Schedule and budget">
        <label className={`flex items-center gap-3 text-sm ${off ? "opacity-60" : "cursor-pointer"}`}>
          <input type="checkbox" disabled={off} checked={draft.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="h-4 w-4 accent-[var(--ink)]" />
          Run automatically once a month
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Select label="Run on day of the month (WIB)" disabled={off} value={draft.runDay} onChange={(e) => set({ runDay: Number(e.target.value) })}>
            {Array.from({ length: 28 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </Select>
          <Select label="Runs per prompt and model" disabled={off} value={draft.runsPerPrompt} onChange={(e) => set({ runsPerPrompt: Number(e.target.value) })}>
            <option value={1}>1 (lowest token use)</option>
            <option value={2}>2</option>
            <option value={3}>3 (shows answer variability)</option>
          </Select>
        </div>
        <p className="mt-3 text-xs text-muted">
          GEO runs at most once per calendar month per project, whether started by the schedule or by hand. Failed runs can be retried inside the
          same month without starting a new run.
        </p>
      </Panel>

      <Panel title="Brand profile">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Target brand name in reports">
            <input className={`${inputBase} w-full`} disabled={off} value={draft.profile.targetName ?? ""} placeholder="IOH" onChange={(e) => setProfile({ targetName: e.target.value })} />
          </Field>
          <Field label="Industry">
            <input className={`${inputBase} w-full`} disabled={off} value={draft.profile.industry ?? ""} placeholder="Telekomunikasi seluler" onChange={(e) => setProfile({ industry: e.target.value })} />
          </Field>
          <Field label="Market">
            <input className={`${inputBase} w-full`} disabled={off} value={draft.profile.market ?? ""} placeholder="Indonesia" onChange={(e) => setProfile({ market: e.target.value })} />
          </Field>
          <Select label="Prompt language" disabled={off} value={draft.profile.language ?? "id"} onChange={(e) => setProfile({ language: e.target.value })}>
            <option value="id">Bahasa Indonesia</option>
            <option value="en">English</option>
          </Select>
        </div>
        <p className="mt-3 text-xs text-muted">
          The target groups all your own brands ({draft.brands.filter((b) => b.isOwn).map((b) => b.name).join(" + ")}). Brand names and keyword aliases
          from the social listening setup are used to find mentions in AI answers.
        </p>
      </Panel>

      <Panel title="Owned websites">
        <div className="space-y-3">
          {draft.brands.map((b) => (
            <Field key={b.id} label={`${b.name}${b.isOwn ? " (our brand)" : " (competitor)"}`}>
              <input
                className={`${inputBase} w-full`}
                disabled={off}
                value={domains[b.id] ?? ""}
                placeholder="e.g. im3.id, indosatooredoo.com"
                onChange={(e) => setDomains({ ...domains, [b.id]: e.target.value })}
              />
            </Field>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Used for the owned-domain citation rate when Gemini Search cites a source.</p>
      </Panel>

      <Panel title="AI models (SumoPod)">
        <ul className="space-y-2 text-sm">
          {data.models.map((m) => (
            <li key={m.key} className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{m.label}</span>
              <code className="text-xs text-muted">{m.id}</code>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${m.configured ? "bg-pos/10 text-pos" : "bg-neg/10 text-neg"}`}>
                {m.configured ? "API key set" : "No API key"}
              </span>
              <span className="text-xs text-muted">
                Modes: {m.modes.join(", ").toLowerCase()} · citations {m.capabilities.citations ? "yes" : "not available"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">Answers are classified by {data.evaluator}. Keys and model ids are set on the server and never sent to the browser.</p>
      </Panel>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {canEdit && (
        <button className={btnPrimary} onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </button>
      )}
    </div>
  );
}
