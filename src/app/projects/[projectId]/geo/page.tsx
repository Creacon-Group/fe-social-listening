"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Segmented } from "@/components/segmented";
import { Select } from "@/components/select";
import { btnPrimary, btnQuiet, Notice, PageHeader } from "@/components/ui";
import { apiSend, fetcher } from "@/lib/api";
import type { GeoBatch, GeoBatchSummary, GeoEstimate } from "@/lib/geo-types";
import { useMe, useProjectId } from "@/lib/project";
import { ManualRun } from "./manual-run";
import { GeoOverviewTab } from "./overview";
import { GeoPromptsTab } from "./prompts";
import { GeoResponsesTab } from "./responses";
import { GeoSettingsTab } from "./settings";

type Tab = "overview" | "prompts" | "responses" | "settings";

const monthName = (period: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${period}-01T00:00:00Z`));

const STATUS_TONE: Record<string, string> = {
  RUNNING: "bg-accent-soft text-accent",
  PAUSED: "bg-accent-soft text-accent",
  COMPLETED: "bg-pos/10 text-pos",
  PARTIAL: "bg-neg/10 text-neg",
  FAILED: "bg-neg/10 text-neg",
};

/** Month picker, progress and the run controls (one run per month). */
function RunBar({
  projectId,
  batchId,
  setBatchId,
  canRun,
  canManual,
}: {
  projectId: number;
  batchId: number | null;
  setBatchId: (id: number | null) => void;
  canRun: boolean;
  canManual: boolean;
}) {
  const [manual, setManual] = useState(false);
  const list = useSWR<GeoBatchSummary[]>(`/api/projects/${projectId}/geo/batches`, fetcher);
  // Same default as the overview: the latest monthly run, else the latest manual run.
  const id = batchId ?? (list.data?.find((x) => x.kind === "monthly") ?? list.data?.[0])?.id ?? null;
  const running = (s?: string) => s === "RUNNING" || s === "PAUSED";
  const batch = useSWR<GeoBatch>(id ? `/api/projects/${projectId}/geo/batches/${id}` : null, fetcher, {
    refreshInterval: (d) => (running(d?.status) ? 3000 : 0),
  });
  const estimate = useSWR<GeoEstimate>(canRun ? `/api/projects/${projectId}/geo/estimate` : null, fetcher);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resumed = useRef(new Set<string>());

  // A batch pauses when the server's time budget runs out; keep it going while the page is open.
  useEffect(() => {
    const b = batch.data;
    if (!b || b.status !== "PAUSED" || !canRun) return;
    const key = `${b.id}:${b.pending}`;
    if (resumed.current.has(key)) return;
    resumed.current.add(key);
    void apiSend(`/api/projects/${projectId}/geo/batches/${b.id}/resume`, "POST").then(() => batch.mutate());
  }, [batch, canRun, projectId]);

  useEffect(() => {
    if (batch.data && !running(batch.data.status)) void list.mutate();
  }, [batch.data?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(path: string, method: "POST" = "POST") {
    setBusy(true);
    setError(null);
    try {
      const b = await apiSend<GeoBatch>(`/api/projects/${projectId}/geo/${path}`, method);
      await list.mutate();
      await estimate.mutate();
      if (b?.id) setBatchId(b.id);
      await batch.mutate();
      setConfirm(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const b = batch.data;
  const est = estimate.data;
  const done = b ? b.succeeded + b.failed : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {list.data && list.data.length > 0 && (
          <Select label="Month" hideLabel density="sm" value={id ?? ""} onChange={(e) => setBatchId(Number(e.target.value))}>
            {list.data.map((x) => (
              <option key={x.id} value={x.id}>
                {x.kind === "adhoc" ? x.label ?? "Manual run" : monthName(x.period!)}
              </option>
            ))}
          </Select>
        )}
        {b && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[b.status]}`}>
            {b.status === "PAUSED" ? "Running" : b.status.charAt(0) + b.status.slice(1).toLowerCase()}
            {running(b.status) ? ` · ${done} of ${b.total}` : b.failed ? ` · ${b.failed} failed` : ""}
          </span>
        )}
        {b && <span className="text-xs text-muted">{(b.tokens.prompt + b.tokens.completion).toLocaleString("en-GB")} tokens used</span>}
        <span className="ml-auto flex flex-wrap gap-2">
          {canManual && (
            <button className={btnQuiet} onClick={() => setManual((v) => !v)}>
              Manual run
            </button>
          )}
          {canRun && b && b.kind !== "adhoc" && !running(b.status) && b.failed > 0 && (
            <button className={btnQuiet} disabled={busy} onClick={() => act(`batches/${b.id}/retry-failed`)}>
              Retry {b.failed} failed
            </button>
          )}
          {canRun && est && !est.alreadyRan && (
            <button className={btnPrimary} disabled={busy || !est.prompts} onClick={() => setConfirm(true)}>
              Run {monthName(est.period)}
            </button>
          )}
        </span>
      </div>

      {canRun && est?.alreadyRan && (
        <p className="text-xs text-muted">
          GEO runs once a month to keep token use low. {monthName(est.period)} has already run; the next run is possible next month
          {est.alreadyRan ? " (failed runs can be retried in this month's batch)." : "."} To test extra prompts now, use Manual run (1 AI
          credit per prompt).
        </p>
      )}

      {confirm && est && (
        <Notice>
          <p className="text-ink">
            Run the {monthName(est.period)} benchmark now? This is the only run for this month.
          </p>
          <p className="mt-1">
            {est.prompts} approved prompts × {est.combos.length} model/mode combinations × {est.runsPerPrompt} run
            {est.runsPerPrompt > 1 ? "s" : ""} = <b className="text-ink">{est.generations} AI answers</b>, plus up to {est.evaluationsAtMost}{" "}
            evaluation calls (answers that name no tracked brand skip evaluation). Each call may use up to {est.maxTokensPerCall.toLocaleString("en-GB")} output
            tokens.
          </p>
          <span className="mt-3 flex gap-2">
            <button className={btnPrimary} disabled={busy} onClick={() => act("batches")}>
              {busy ? "Starting…" : "Start run"}
            </button>
            <button className={btnQuiet} onClick={() => setConfirm(false)}>
              Cancel
            </button>
          </span>
        </Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {manual && (
        <ManualRun
          projectId={projectId}
          onClose={() => setManual(false)}
          onStarted={(id) => {
            setManual(false);
            setBatchId(id);
            void list.mutate();
          }}
        />
      )}
      {b?.kind === "adhoc" && (
        <p className="text-xs text-muted">
          You are looking at a manual run. Its numbers are separate from the monthly benchmark and are not compared month to month.
        </p>
      )}
      {b && running(b.status) && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={done} aria-valuemax={b.total}>
          <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${(done / Math.max(b.total, 1)) * 100}%` }} />
        </div>
      )}
    </div>
  );
}

export default function GeoPage() {
  const projectId = useProjectId();
  const { data: me } = useMe();
  const [tab, setTab] = useState<Tab>("overview");
  const [batchId, setBatchId] = useState<number | null>(null);
  const isAdmin = me?.role === "ADMIN" || me?.role === "SUPERADMIN";
  const canEdit = isAdmin || me?.role === "ANALYST";

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI visibility"
        detail="How Gemini and GPT answer consumer questions about your category: are your brands mentioned, recommended and cited?"
      />
      <RunBar projectId={projectId} batchId={batchId} setBatchId={setBatchId} canRun={isAdmin} canManual={canEdit} />
      <div className="-mx-1 max-w-full overflow-x-auto px-1 py-0.5">
        <Segmented
          label="Section"
          value={tab}
          onChange={setTab}
          options={[
            { value: "overview", label: "Overview" },
            { value: "prompts", label: "Prompts" },
            { value: "responses", label: "Responses" },
            { value: "settings", label: "Settings" },
          ]}
        />
      </div>
      {tab === "overview" && <GeoOverviewTab projectId={projectId} batchId={batchId} />}
      {tab === "prompts" && <GeoPromptsTab projectId={projectId} canEdit={canEdit} />}
      {tab === "responses" && <GeoResponsesTab projectId={projectId} batchId={batchId} canEdit={canEdit} />}
      {tab === "settings" && <GeoSettingsTab projectId={projectId} canEdit={isAdmin} />}
    </div>
  );
}
