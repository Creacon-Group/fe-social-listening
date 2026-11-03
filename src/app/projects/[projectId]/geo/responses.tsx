"use client";

import { useState } from "react";
import useSWR from "swr";
import { Sheet } from "@/components/overlay";
import { Select } from "@/components/select";
import { Notice, Panel, Skeleton } from "@/components/ui";
import { apiSend, fetcher } from "@/lib/api";
import {
  CATEGORY_LABEL,
  type GeoRecommendation,
  type GeoRunDetail,
  type GeoRunRow,
  type GeoSettings,
  groupLabel,
  REC_LABEL,
} from "@/lib/geo-types";

const REC_TONE: Record<GeoRecommendation, string> = {
  RECOMMENDED: "bg-pos/10 text-pos",
  POSITIVE: "bg-pos/10 text-pos",
  NEUTRAL: "bg-surface text-muted",
  NEGATIVE: "bg-neg/10 text-neg",
  NOT_MENTIONED: "bg-surface text-muted",
  UNCLEAR: "bg-accent-soft text-accent",
};

function RecChip({ r }: { r: GeoRecommendation }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${REC_TONE[r]}`}>{REC_LABEL[r]}</span>;
}

/** One answer with everything behind its numbers. The answer is shown as plain text (untrusted). */
function RunDetail({ projectId, runId, canEdit }: { projectId: number; runId: number; canEdit: boolean }) {
  const { data, mutate } = useSWR<GeoRunDetail>(`/api/projects/${projectId}/geo/runs/${runId}`, fetcher);
  if (!data) return <Skeleton className="h-64" />;
  const ev = data.evaluations[0];

  async function correct(resultId: number, recommendation: GeoRecommendation) {
    await apiSend(`/api/projects/${projectId}/geo/results/${resultId}`, "PATCH", {
      recommendation,
      mentioned: recommendation !== "NOT_MENTIONED",
    });
    await mutate();
  }

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="t-label text-muted">Prompt v{data.promptVersion.version} · {CATEGORY_LABEL[data.promptVersion.prompt.category]}</p>
        <p className="mt-1 font-semibold">{data.promptVersion.text}</p>
        <p className="mt-1 text-xs text-muted">
          {groupLabel(data.model, data.mode)} · run {data.runNo}
          {data.latencyMs ? ` · ${(data.latencyMs / 1000).toFixed(1)} s` : ""}
          {data.completionTokens ? ` · ${data.completionTokens} output tokens${data.reasoningTokens ? ` (${data.reasoningTokens} reasoning)` : ""}` : ""}
        </p>
      </div>

      {data.status === "FAILED" ? (
        <Notice tone="error">
          Failed ({data.errorType}): {data.errorMessage}. Failed runs are not counted in any metric.
        </Notice>
      ) : (
        <div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl bg-surface/70 p-3 text-[0.8125rem] leading-relaxed">{data.text}</div>
      )}

      {data.citations.length > 0 && (
        <div>
          <p className="t-label mb-1.5 text-muted">Sources returned by the model</p>
          <ul className="space-y-1">
            {data.citations.map((c) => (
              <li key={c.id}>
                <a href={c.url} target="_blank" rel="noreferrer noopener" className="font-semibold hover:underline">
                  {c.domain}
                </a>
                {c.ownedBy === "TARGET" && <span className="ml-2 text-xs font-semibold text-pos">Owned</span>}
                {c.ownedBy === "COMPETITOR" && <span className="ml-2 text-xs text-muted">Competitor</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {ev && (
        <div>
          <p className="t-label mb-1.5 text-muted">
            Evaluation {ev.version}
            {ev.evaluatorModel ? ` by ${ev.evaluatorModel}` : " (no tracked brand named, no model call)"}
            {ev.status === "failed" ? ` · evaluator failed: ${ev.error}` : ""}
          </p>
          <ul className="space-y-2.5">
            {ev.results.map((r) => (
              <li key={r.id} className="rounded-xl ring-1 ring-line ring-inset p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={r.isTarget ? "mark font-semibold" : "font-semibold"}>{r.name}</span>
                  <RecChip r={r.recommendation} />
                  {r.position && (
                    <span className="text-xs text-muted">
                      #{r.position} of {r.listSize}
                    </span>
                  )}
                  {r.sentiment && r.mentioned && <span className="text-xs text-muted">{r.sentiment}</span>}
                  {r.manual && <span className="text-xs font-semibold text-accent">corrected</span>}
                  {canEdit && (
                    <span className="ml-auto">
                      <Select
                        label={`Correct ${r.name}`}
                        hideLabel
                        density="sm"
                        value={r.recommendation}
                        onChange={(e) => void correct(r.id, e.target.value as GeoRecommendation)}
                      >
                        {(Object.keys(REC_LABEL) as GeoRecommendation[]).map((k) => (
                          <option key={k} value={k}>
                            {REC_LABEL[k]}
                          </option>
                        ))}
                      </Select>
                    </span>
                  )}
                </div>
                {r.matches && r.matches.length > 0 && <p className="mt-1 text-xs text-muted">Found as: {r.matches.join(", ")}</p>}
                {r.evidence && <p className="mt-1 text-xs italic text-muted">&ldquo;{r.evidence}&rdquo;</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function GeoResponsesTab({ projectId, batchId, canEdit }: { projectId: number; batchId: number | null; canEdit: boolean }) {
  const [model, setModel] = useState("");
  const [mode, setMode] = useState("");
  const [mentioned, setMentioned] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const { data: settings } = useSWR<GeoSettings>(`/api/projects/${projectId}/geo/settings`, fetcher);
  const q = new URLSearchParams();
  if (batchId) q.set("batchId", String(batchId));
  if (model) q.set("model", model);
  if (mode) q.set("mode", mode);
  if (mentioned) q.set("mentioned", mentioned);
  if (status) q.set("status", status);
  const { data, error } = useSWR<{ items: GeoRunRow[]; total: number }>(`/api/projects/${projectId}/geo/runs?${q}`, fetcher, {
    keepPreviousData: true,
  });

  if (error) return <Notice tone="error">Couldn&apos;t load answers: {error.message}</Notice>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select label="Model" hideLabel density="sm" value={model} onChange={(e) => setModel(e.target.value)}>
          <option value="">All models</option>
          {settings?.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
        <Select label="Mode" hideLabel density="sm" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="">Both modes</option>
          <option value="KNOWLEDGE">Knowledge</option>
          <option value="SEARCH">Search</option>
        </Select>
        <Select label="Brand mention" hideLabel density="sm" value={mentioned} onChange={(e) => setMentioned(e.target.value)}>
          <option value="">Any answer</option>
          <option value="yes">Names our brand</option>
          <option value="no">Does not name our brand</option>
        </Select>
        <Select label="Status" hideLabel density="sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>
          <option value="SUCCEEDED">Succeeded</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING">Pending</option>
        </Select>
      </div>

      <Panel title="Answers" aside={data ? `${data.total} runs` : undefined}>
        {!data ? (
          <Skeleton className="h-64" />
        ) : data.items.length === 0 ? (
          <p className="text-sm text-muted">No runs match.</p>
        ) : (
          <div className="-mx-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-3 py-2 font-medium">Prompt</th>
                  <th className="px-3 py-2 font-medium">Model</th>
                  <th className="px-3 py-2 font-medium">Our brand</th>
                  <th className="px-3 py-2 text-right font-medium">Position</th>
                  <th className="px-3 py-2 text-right font-medium">Sources</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id} className="cursor-pointer border-b border-line last:border-0 hover:bg-surface/60" onClick={() => setOpen(r.id)}>
                    <td className="max-w-[26rem] px-3 py-2.5">
                      <button type="button" className="text-left font-medium hover:underline" onClick={() => setOpen(r.id)}>
                        {r.prompt.text}
                      </button>
                      <span className="block text-xs text-muted">{CATEGORY_LABEL[r.prompt.category]} · v{r.prompt.version}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{groupLabel(r.model, r.mode)}</td>
                    <td className="px-3 py-2.5">
                      {r.status === "FAILED" ? (
                        <span className="text-xs font-semibold text-neg">Failed · {r.errorType}</span>
                      ) : r.status === "PENDING" ? (
                        <span className="text-xs text-muted">Waiting</span>
                      ) : r.target ? (
                        <RecChip r={r.target.recommendation} />
                      ) : (
                        <span className="text-xs text-muted">Not evaluated</span>
                      )}
                    </td>
                    <td className="num px-3 py-2.5 text-right">{r.target?.position ? `#${r.target.position}/${r.target.listSize}` : "–"}</td>
                    <td className="num px-3 py-2.5 text-right">{r.mode === "SEARCH" ? r.citations : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Sheet open={open !== null} onClose={() => setOpen(null)} title="Answer detail" centerOnDesktop={false}>
        {open !== null && <RunDetail projectId={projectId} runId={open} canEdit={canEdit} />}
      </Sheet>
    </div>
  );
}
