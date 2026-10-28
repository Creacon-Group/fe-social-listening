"use client";

import { useState } from "react";
import useSWR from "swr";
import { TrendCharts } from "@/components/trend-charts";
import { btnPrimary, Notice, PageHeader, Panel, SentimentChip, Skeleton } from "@/components/ui";
import { apiSend, fetcher } from "@/lib/api";
import { filterBody, filterQuery, useFilters } from "@/lib/filters";
import { CHANNEL_LABEL, fmtDateTime, fmtPeriod } from "@/lib/format";
import { useMe, useProjectId } from "@/lib/project";
import type { Insight, InsightSummary, Trend } from "@/lib/types";

const ymd = (iso: string) => iso.slice(0, 10);

function InsightBody({ insight }: { insight: Insight }) {
  return (
    <article className="space-y-5">
      <div>
        <p className="text-xs text-muted">
          {fmtPeriod(insight.period)}, written {fmtDateTime(insight.createdAt)}
          {insight.model ? ` by ${insight.model}` : ""}
        </p>
        <h2 className="mt-2 max-w-[38ch] text-[1.375rem] font-bold leading-[1.25] tracking-[-0.022em]">{insight.headline}</h2>
      </div>
      <ol className="space-y-4">
        {insight.findings.map((f, i) => (
          <li key={i} className="text-[0.95rem] leading-relaxed">
            <p className="font-semibold">
              {i + 1}. {f.title}
            </p>
            <p className="mt-1">
              {f.body}{" "}
              {f.refs.map((r) => (
                <a key={r} href={`#src-${r}`} className="font-semibold text-ink underline decoration-signal decoration-2 underline-offset-2">
                  [{r}]
                </a>
              ))}
            </p>
          </li>
        ))}
      </ol>
      {insight.sources.length > 0 && (
        <div className="border-t border-line pt-4">
          <p className="mb-2 text-xs font-semibold text-muted">Sources</p>
          <ul className="space-y-2">
            {insight.sources.map((s) => (
              <li key={s.ref} id={`src-${s.ref}`} className="flex gap-2 text-sm">
                <span className="num font-semibold text-ink underline underline-offset-2">[{s.ref}]</span>
                <span className="min-w-0">
                  <span className="text-xs text-muted">
                    {s.author ?? "Unknown author"} on {CHANNEL_LABEL[s.channel]}, {fmtDateTime(s.publishedAt)}
                  </span>{" "}
                  <SentimentChip s={s.sentiment} />
                  <span className="mt-0.5 block break-words">
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer noopener" className="hover:underline">
                        {s.text || "Open post"}
                      </a>
                    ) : (
                      s.text
                    )}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted">Written by AI from the uploaded data. Check key numbers before you use them.</p>
    </article>
  );
}

export default function InsightsPage() {
  const projectId = useProjectId();
  const { filters } = useFilters();
  const { data: me } = useMe();
  const trend = useSWR<Trend>(`/api/projects/${projectId}/analytics/trend?${filterQuery(filters)}`, fetcher, {
    keepPreviousData: true,
  });
  const listKey = `/api/projects/${projectId}/insights`;
  const list = useSWR<InsightSummary[]>(listKey, fetcher);
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const period = trend.data?.period;
  const forPeriod = period
    ? list.data?.find((i) => ymd(i.periodFrom) === period.from && ymd(i.periodTo) === period.to)
    : undefined;
  const selectedId = picked ?? forPeriod?.id ?? null;
  const detail = useSWR<Insight>(selectedId ? `${listKey}/${selectedId}` : null, fetcher);
  const canGenerate = me && me.role !== "VIEWER";

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const created = await apiSend<Insight>(listKey, "POST", { filter: filterBody(filters) });
      await list.mutate();
      setPicked(created.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Insights" detail={period ? fmtPeriod(period) : undefined} />

      {canGenerate && (
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={generate} disabled={busy || !period} className={btnPrimary}>
            {busy ? "Writing insights…" : forPeriod ? "Rewrite insights for this period" : "Write insights for this period"}
          </button>
          <span className="text-xs text-muted">Uses the filters above. Takes 20 to 60 seconds.</span>
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Insights">
          {busy ? (
            <div className="space-y-3">
              <Skeleton className="h-8" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : selectedId && detail.data ? (
            <InsightBody insight={detail.data} />
          ) : selectedId && !detail.error ? (
            <Skeleton className="h-64" />
          ) : (
            <p className="text-sm text-muted">
              No insights for {period ? fmtPeriod(period) : "this period"} yet.{" "}
              {canGenerate ? "Use the button above to write them." : "Ask an admin or analyst to write them."}
            </p>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="Mentions and reach">
            {trend.data ? <TrendCharts days={trend.data.days} stacked /> : <Skeleton className="h-96" />}
          </Panel>
          <Panel title="Earlier insights">
            {!list.data?.length ? (
              <p className="text-sm text-muted">No insights yet.</p>
            ) : (
              <ul className="space-y-1">
                {list.data.map((i) => (
                  <li key={i.id}>
                    <button
                      onClick={() => setPicked(i.id)}
                      aria-current={selectedId === i.id ? "true" : undefined}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm ${selectedId === i.id ? "bg-line/60 font-semibold" : "hover:bg-surface"}`}
                    >
                      <span className="block truncate font-semibold">{i.headline}</span>
                      <span className={`block text-xs text-muted font-normal`}>
                        {fmtPeriod({ from: ymd(i.periodFrom), to: ymd(i.periodTo) })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
