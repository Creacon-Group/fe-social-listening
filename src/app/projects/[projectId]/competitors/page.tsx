"use client";

import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useSWR from "swr";
import { SovRibbon } from "@/components/sov-ribbon";
import { Notice, PageHeader, Panel, SentimentBar, SentimentLegend, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { filterQuery, useFilters } from "@/lib/filters";
import { fmt, fmtCompact, fmtDay, fmtPct, fmtPeriod, fmtSigned } from "@/lib/format";
import { brandColor, useBrands, useProjectId } from "@/lib/project";
import type { Competitors } from "@/lib/types";

/** Net sentiment as a bar growing left (negative) or right (positive) from zero. */
function NetBar({ value, max }: { value: number; max: number }) {
  const w = max ? (Math.abs(value) / max) * 50 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-24 rounded-full bg-surface" aria-hidden>
        <span className="absolute inset-y-0 left-1/2 w-px bg-line" />
        <span
          className="absolute inset-y-0 rounded-full"
          style={{
            width: `${w}%`,
            left: value >= 0 ? "50%" : `${50 - w}%`,
            background: value >= 0 ? "var(--pos)" : "var(--neg)",
          }}
        />
      </div>
      <span className={`num w-12 text-right font-semibold ${value > 0 ? "text-pos" : value < 0 ? "text-neg" : ""}`}>
        {fmtSigned(value)}
      </span>
    </div>
  );
}

export default function CompetitorsPage() {
  const projectId = useProjectId();
  const { filters } = useFilters();
  const { data, error } = useSWR<Competitors>(
    `/api/projects/${projectId}/analytics/competitors?${filterQuery(filters)}`,
    fetcher,
    { keepPreviousData: true },
  );
  const { data: brands } = useBrands(projectId);

  const colorOf = (id: number) => {
    const i = (brands ?? []).findIndex((b) => b.id === id);
    return brandColor(brands?.[i] ?? {}, Math.max(i, 0));
  };

  // [{ day, [brandId]: total }] for the trend chart
  const trend = useMemo(() => {
    const byDay = new Map<string, Record<string, number | string>>();
    for (const t of data?.trend ?? []) {
      const row = byDay.get(t.day) ?? { day: t.day };
      row[String(t.brandId)] = t.total;
      byDay.set(t.day, row);
    }
    return [...byDay.values()];
  }, [data]);

  const maxNet = Math.max(1, ...(data?.brands ?? []).map((b) => Math.abs(b.netSentiment)));
  const ownNames = (brands ?? []).filter((b) => b.isOwn).map((b) => b.name).join(" + ");

  return (
    <div className="space-y-5">
      <PageHeader title="Kompetitor" detail={data ? fmtPeriod(data.period) : undefined} />

      {error ? (
        <Notice tone="error">Perbandingan brand gagal dimuat: {error.message}</Notice>
      ) : !data ? (
        <>
          <Skeleton className="h-40" />
          <Skeleton className="h-72" />
        </>
      ) : data.brands.length === 0 ? (
        <Notice>Tidak ada mention brand pada filter ini.</Notice>
      ) : (
        <>
          <Panel title="Share of voice" aside={`${fmt(data.totalBrandMentions)} sebutan brand`}>
            <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
              <p>
                <span className="num text-5xl font-bold tracking-tight text-ruby">{fmtPct(data.own.sov)}</span>
              </p>
              <p className="max-w-md pb-1.5 text-sm text-muted">
                {ownNames} disebut di {fmt(data.own.total)} mention unik. Net sentiment gabungan{" "}
                <span className="num font-semibold text-ink">{fmtSigned(data.own.netSentiment)}</span>.
              </p>
            </div>
            <SovRibbon competitors={data} brandColors={brands} />
          </Panel>

          <Panel title="Perbandingan per brand" aside={<SentimentLegend />}>
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="px-2 py-2 font-medium">Brand</th>
                    <th className="px-2 py-2 text-right font-medium">Volume</th>
                    <th className="px-2 py-2 text-right font-medium">SOV</th>
                    <th className="px-2 py-2 font-medium">Net sentiment</th>
                    <th className="w-[26%] px-2 py-2 font-medium">Sentimen</th>
                    <th className="px-2 py-2 text-right font-medium" title="Volume brand dibagi mention unik brand sendiri">
                      Rasio vs {ownNames || "brand sendiri"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.brands.map((b) => (
                    <tr key={b.brandId} className={`border-b border-line last:border-0 ${b.isOwn ? "bg-ruby-soft/40" : ""}`}>
                      <td className="px-2 py-3">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(b.brandId) }} />
                          <span className={b.isOwn ? "font-bold" : "font-medium"}>{b.name}</span>
                          {b.isOwn && <span className="text-xs text-muted">milik sendiri</span>}
                        </span>
                      </td>
                      <td className="num px-2 py-3 text-right">{fmt(b.total)}</td>
                      <td className="num px-2 py-3 text-right font-semibold">{fmtPct(b.sov)}</td>
                      <td className="px-2 py-3">
                        <NetBar value={b.netSentiment} max={maxNet} />
                      </td>
                      <td className="px-2 py-3">
                        <SentimentBar counts={b} />
                      </td>
                      <td className="num px-2 py-3 text-right">
                        {b.ratioToOwn === null
                          ? "–"
                          : `${b.ratioToOwn.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">
              Mention yang menyebut dua brand dihitung untuk keduanya, sehingga SOV semua brand berjumlah 100%.
            </p>
          </Panel>

          <Panel title="Volume harian per brand">
            {trend.length < 2 ? (
              <p className="text-sm text-muted">Pilih rentang lebih dari satu hari untuk melihat tren.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fontSize: 12, fill: "var(--muted)" }} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 12, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={48} />
                    <Tooltip
                      labelFormatter={(d) => fmtDay(String(d))}
                      formatter={(v, name) => [fmt(Number(v)), data.brands.find((b) => String(b.brandId) === name)?.name ?? name]}
                      contentStyle={{ borderRadius: 12, border: "1px solid var(--line)", fontSize: 12 }}
                    />
                    <Legend formatter={(name) => data.brands.find((b) => String(b.brandId) === name)?.name ?? name} wrapperStyle={{ fontSize: 12 }} />
                    {data.brands.map((b) => (
                      <Line
                        key={b.brandId}
                        dataKey={String(b.brandId)}
                        stroke={colorOf(b.brandId)}
                        strokeWidth={b.isOwn ? 2.5 : 1.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
