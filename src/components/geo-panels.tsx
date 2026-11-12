"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Segmented } from "@/components/segmented";
import { BetaChip, Panel, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { fmtPct } from "@/lib/format";
import type { GeoSummary } from "@/lib/geo-types";

const pct = (v: number | null) => (v === null ? "–" : fmtPct(v));
const monthName = (period: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${period}-01T00:00:00Z`));
/** "Run November 2026", or the manual run's own label ("Manual run, 12 Nov, 09:01 WIB (5 prompts)"). */
const runName = (s: GeoSummary) => (s.run.kind === "adhoc" ? (s.run.label ?? "Manual run") : `Run ${monthName(s.run.period)}`);

/** Latest monthly AI visibility run not after `periodEnd` (YYYY-MM-DD). null = no run yet. */
export function useGeoSummary(projectId: number, periodEnd?: string) {
  return useSWR<GeoSummary | null>(`/api/projects/${projectId}/geo/summary${periodEnd ? `?to=${periodEnd}` : ""}`, fetcher, {
    keepPreviousData: true,
  });
}

function Aside({ projectId, s }: { projectId: number; s?: GeoSummary | null }) {
  return (
    <Link href={`/projects/${projectId}/geo`} className="font-semibold text-ink underline underline-offset-2">
      {s ? runName(s) : "AI visibility"}
    </Link>
  );
}

const Empty = () => (
  <p className="text-sm text-muted">No AI visibility run yet. Approve prompts and run it on the AI visibility page.</p>
);

const Note = ({ s }: { s: GeoSummary }) => (
  <p className="mt-3 text-xs text-muted">
    How Gemini and GPT answer consumer questions, from {s.run.kind === "adhoc" ? "a manual run (no monthly benchmark yet)" : "the monthly AI benchmark"} ({s.run.prompts} prompts). Not affected by the filters above.
  </p>
);

/** Own brand group per model and mode: mentioned, recommended, AI share of voice. For Summary and AI insights. */
export function GeoSummaryPanel({ projectId, periodEnd, className = "" }: { projectId: number; periodEnd?: string; className?: string }) {
  const { data, isLoading } = useGeoSummary(projectId, periodEnd);
  const target = data?.groups[0]?.brands.find((b) => b.isTarget)?.name;
  return (
    <Panel
      title={
        <>
          {target ? `AI visibility · ${target}` : "AI visibility"}
          <BetaChip className="ml-2" />
        </>
      }
      aside={<Aside projectId={projectId} s={data} />} className={className}>
      {isLoading && data === undefined ? (
        <Skeleton className="h-32" />
      ) : !data ? (
        <Empty />
      ) : (
        <>
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-2 py-2 font-medium">Model</th>
                  <th className="px-2 py-2 text-right font-medium">Mentioned</th>
                  <th className="px-2 py-2 text-right font-medium">Recommended</th>
                  <th className="px-2 py-2 text-right font-medium" title="AI share of voice">AI SoV</th>
                </tr>
              </thead>
              <tbody>
                {data.groups.map((g) => (
                  <tr key={g.label} className="border-b border-line last:border-0">
                    <td className="px-2 py-2.5">
                      {g.label}
                      <span className="block text-xs text-muted">{g.validResponses} answers</span>
                    </td>
                    <td className="num px-2 py-2.5 text-right">{pct(g.mentionRate)}</td>
                    <td className="num px-2 py-2.5 text-right font-semibold">{pct(g.recommendationRate)}</td>
                    <td className="num px-2 py-2.5 text-right">{pct(g.sov)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Note s={data} />
        </>
      )}
    </Panel>
  );
}

/** AI share of voice per brand, one model/mode at a time. For Competitive insights. */
export function GeoCompetitorsPanel({ projectId, periodEnd }: { projectId: number; periodEnd?: string }) {
  const { data, isLoading } = useGeoSummary(projectId, periodEnd);
  const [pick, setPick] = useState(0);
  const g = data?.groups[Math.min(pick, (data?.groups.length ?? 1) - 1)];
  return (
    <Panel
      title={
        <>
          AI share of voice
          <BetaChip className="ml-2" />
        </>
      }
      aside={
        data && data.groups.length > 1 ? (
          <div className="max-w-full overflow-x-auto">
            <Segmented
              label="Model and mode"
              size="sm"
              value={String(pick)}
              onChange={(v) => setPick(Number(v))}
              options={data.groups.map((x, i) => ({ value: String(i), label: x.label }))}
            />
          </div>
        ) : (
          <Aside projectId={projectId} s={data} />
        )
      }
    >
      {isLoading && data === undefined ? (
        <Skeleton className="h-40" />
      ) : !data || !g ? (
        <Empty />
      ) : (
        <>
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-2 py-2 font-medium">Brand</th>
                  <th className="px-2 py-2 text-right font-medium">Mentioned</th>
                  <th className="px-2 py-2 text-right font-medium">Recommended</th>
                  <th className="px-2 py-2 text-right font-medium">Avg position</th>
                  <th className="px-2 py-2 text-right font-medium">AI SoV</th>
                  <th className="w-[30%] px-2 py-2 font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {g.brands.map((b) => (
                  <tr key={b.isTarget ? "target" : b.brandId} className="border-b border-line last:border-0">
                    <td className="px-2 py-2.5">{b.isTarget ? <span className="mark font-semibold">{b.name}</span> : b.name}</td>
                    <td className="num px-2 py-2.5 text-right">{pct(b.mentionRate)}</td>
                    <td className="num px-2 py-2.5 text-right font-semibold">{pct(b.recommendationRate)}</td>
                    <td className="num px-2 py-2.5 text-right">{b.avgPosition === null ? "–" : `#${b.avgPosition}`}</td>
                    <td className="num px-2 py-2.5 text-right">{pct(b.sov)}</td>
                    <td className="px-2 py-2.5">
                      <span className="block h-2 rounded-full bg-line">
                        <span className={`block h-2 rounded-full ${b.isTarget ? "bg-ink" : "bg-accent"}`} style={{ width: `${b.sov ?? 0}%` }} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">
            {g.label}, {g.validResponses} answers, {runName(data).replace(/^Run/, "run")}. In AI answers your own brands count as one group, so this is
            not the same split as the social share of voice above. Not affected by the filters above.{" "}
            <Link href={`/projects/${projectId}/geo`} className="font-semibold text-ink underline underline-offset-2">
              Open AI visibility
            </Link>
          </p>
        </>
      )}
    </Panel>
  );
}
