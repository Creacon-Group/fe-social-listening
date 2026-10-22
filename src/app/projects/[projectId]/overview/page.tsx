"use client";

import Link from "next/link";
import useSWR from "swr";
import { ReportActions } from "@/components/report-actions";
import { SovRibbon } from "@/components/sov-ribbon";
import { TrendCharts } from "@/components/trend-charts";
import { Notice, PageHeader, Panel, SentimentBar, SentimentLegend, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { filterQuery, useFilters } from "@/lib/filters";
import { CHANNEL_LABEL, fmt, fmtCompact, fmtPct, fmtPeriod, fmtSigned } from "@/lib/format";
import { useBrands, useProjectId } from "@/lib/project";
import type { Competitors, Overview, Trend } from "@/lib/types";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-line bg-card p-4 sm:p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="num mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

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
      <PageHeader title="Ringkasan" detail={o ? fmtPeriod(o.period) : undefined} />
      <ReportActions projectId={projectId} compact />

      {overview.error ? (
        <Notice tone="error">Data ringkasan gagal dimuat: {overview.error.message}</Notice>
      ) : !o ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : o.total === 0 ? (
        <Notice>
          Tidak ada mention pada filter ini. Ubah rentang tanggal atau{" "}
          <Link className="font-semibold text-ink underline" href={`/projects/${projectId}/upload`}>
            upload data
          </Link>
          .
        </Notice>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <Stat label="Total mention" value={fmt(o.total)} />
            <Stat label="Net sentiment" value={fmtSigned(o.netSentiment)} hint="(positif − negatif) ÷ total × 100" />
            <Stat label="Engagement" value={fmtCompact(o.engagements)} />
            <Stat label="Estimasi reach" value={fmtCompact(o.reach)} />
          </div>

          <Panel title="Tren harian">
            {trend.data ? <TrendCharts days={trend.data.days} /> : <Skeleton className="h-56" />}
          </Panel>

          <div className="grid gap-5 xl:grid-cols-5">
            <Panel title="Sentimen" aside={<SentimentLegend />} className="xl:col-span-2">
              <SentimentBar counts={o} height="h-4" />
              <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
                {(
                  [
                    ["Positif", o.positive, "text-pos"],
                    ["Netral", o.neutral, "text-muted"],
                    ["Negatif", o.negative, "text-neg"],
                  ] as const
                ).map(([label, v, tone]) => (
                  <div key={label}>
                    <dt className="text-muted">{label}</dt>
                    <dd className={`num mt-0.5 text-lg font-bold ${tone}`}>{fmt(v)}</dd>
                    <dd className="num text-xs text-muted">{fmtPct((v / o.total) * 100)}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <Panel title="Volume per channel" className="xl:col-span-3">
              <ul className="space-y-3">
                {o.channels.map((ch) => (
                  <li key={ch.channel} className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-3 text-sm">
                    <span className="font-medium">{CHANNEL_LABEL[ch.channel]}</span>
                    <span className="block">
                      <span
                        className="block"
                        style={{ width: `${Math.max((ch.total / o.channels[0].total) * 100, 2)}%` }}
                      >
                        <SentimentBar counts={ch} />
                      </span>
                    </span>
                    <span className="num text-right text-muted">{fmt(ch.total)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          {c && c.brands.length > 0 && (
            <Panel
              title="Share of voice"
              aside={
                <Link className="font-semibold text-ink hover:underline" href={`/projects/${projectId}/competitors?${q}`}>
                  Lihat perbandingan lengkap
                </Link>
              }
            >
              <p className="text-sm text-muted">
                {ownNames.join(" + ")}: <span className="num font-bold text-ink">{fmtPct(c.own.sov)}</span> dari mention
                yang menyebut brand ({fmt(c.own.total)} mention unik).
              </p>
              <SovRibbon competitors={c} brandColors={brands} />
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
