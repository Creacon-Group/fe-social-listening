"use client";

import Link from "next/link";
import useSWR from "swr";
import { ReportActions } from "@/components/report-actions";
import { SovRibbon } from "@/components/sov-ribbon";
import { TrendCharts } from "@/components/trend-charts";
import { KpiBand, Notice, PageHeader, Panel, SentimentBar, SentimentLegend, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { filterQuery, useFilters } from "@/lib/filters";
import { CHANNEL_LABEL, fmt, fmtCompact, fmtPct, fmtPeriod, fmtSigned } from "@/lib/format";
import { useBrands, useProjectId } from "@/lib/project";
import type { Competitors, Overview, Trend } from "@/lib/types";

export default function OverviewPage() {
  const projectId = useProjectId();
  const { filters } = useFilters();
  const q = filterQuery(filters);
  const overview = useSWR<Overview>(`/api/projects/${projectId}/analytics/overview?${q}`, fetcher, { keepPreviousData: true });
  const trend = useSWR<Trend>(`/api/projects/${projectId}/analytics/trend?${q}`, fetcher, { keepPreviousData: true });
  const comp = useSWR<Competitors>(`/api/projects/${projectId}/analytics/competitors?${q}`, fetcher, { keepPreviousData: true });
  const { data: brands } = useBrands(projectId);

  const o = overview.data;
  const c = comp.data;
  const ownNames = (brands ?? []).filter((b) => b.isOwn).map((b) => b.name);

  return (
    <div className="space-y-5">
      <PageHeader title="Summary" detail={o ? fmtPeriod(o.period) : undefined} actions={<ReportActions projectId={projectId} compact />} />

      {overview.error ? (
        <Notice tone="error">Couldn&apos;t load the summary: {overview.error.message}</Notice>
      ) : !o ? (
        <Skeleton className="h-36" />
      ) : o.total === 0 ? (
        <Notice>
          No mentions match these filters. Widen the period or{" "}
          <Link className="font-semibold text-ink underline" href={`/projects/${projectId}/upload`}>
            upload data
          </Link>
          .
        </Notice>
      ) : (
        <>
          <KpiBand
            items={[
              { label: "Mentions", value: fmt(o.total) },
              { label: "Net sentiment", value: fmtSigned(o.netSentiment), hint: "(positive − negative) ÷ total × 100" },
              { label: "Engagement", value: fmtCompact(o.engagements) },
              { label: "Estimated reach", value: fmtCompact(o.reach) },
            ]}
          />

          {c && c.brands.length > 0 && (
            <Panel
              title="Share of voice"
              aside={
                <Link className="font-semibold text-ink underline underline-offset-2" href={`/projects/${projectId}/competitors?${q}`}>
                  Compare brands
                </Link>
              }
            >
              <p className="text-sm text-muted">
                <span className="mark font-semibold text-ink">{ownNames.join(" + ")}</span> hold{" "}
                <span className="num font-bold text-ink">{fmtPct(c.own.sov)}</span> of brand mentions ({fmt(c.own.total)} unique
                mentions).
              </p>
              <SovRibbon competitors={c} brandColors={brands} />
            </Panel>
          )}

          <Panel title="Daily trend">{trend.data ? <TrendCharts days={trend.data.days} /> : <Skeleton className="h-56" />}</Panel>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
            <Panel title="Sentiment" aside={<SentimentLegend />} className="xl:col-span-2">
              <SentimentBar counts={o} height="h-3" />
              <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
                {(
                  [
                    ["Positive", o.positive, "text-pos"],
                    ["Neutral", o.neutral, "text-muted"],
                    ["Negative", o.negative, "text-neg"],
                  ] as const
                ).map(([label, v, tone]) => (
                  <div key={label}>
                    <dt className="text-muted">{label}</dt>
                    <dd className={`wide num mt-0.5 text-xl font-bold ${tone}`}>{fmt(v)}</dd>
                    <dd className="num text-xs text-muted">{fmtPct((v / o.total) * 100)}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <Panel title="Mentions by channel" className="xl:col-span-3">
              <ul className="space-y-3">
                {o.channels.map((ch) => (
                  <li key={ch.channel} className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-3 text-sm">
                    <span className="font-medium">{CHANNEL_LABEL[ch.channel]}</span>
                    <span className="block">
                      <span className="block" style={{ width: `${Math.max((ch.total / o.channels[0].total) * 100, 2)}%` }}>
                        <SentimentBar counts={ch} />
                      </span>
                    </span>
                    <span className="num text-right text-muted">{fmt(ch.total)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
