"use client";

import { useState } from "react";
import useSWR from "swr";
import { Segmented } from "@/components/segmented";
import { Notice, PageHeader, Panel, SentimentBar, SentimentLegend, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { filterQuery, useFilters } from "@/lib/filters";
import { fmt, fmtPct, fmtPeriod, fmtSigned } from "@/lib/format";
import { useProjectId } from "@/lib/project";
import type { Demographics, Heatmap } from "@/lib/types";

const COUNTRY = new Intl.DisplayNames(["en"], { type: "region" });
const countryName = (code: string) => {
  try {
    return COUNTRY.of(code) ?? code;
  } catch {
    return code;
  }
};

function Bars({ rows, total }: { rows: { key: string; label: string; total: number; positive: number; neutral: number; negative: number; netSentiment: number }[]; total: number }) {
  const max = rows[0]?.total ?? 1;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(6rem,11rem)_1fr_7.5rem] items-center gap-3 text-sm">
          <span className="truncate font-medium" title={r.label}>
            {r.label}
          </span>
          <span className="block" style={{ width: `${Math.max((r.total / max) * 100, 2)}%` }}>
            <SentimentBar counts={r} />
          </span>
          <span className="num text-right text-muted">
            {fmt(r.total)} <span className="text-xs">({fmtPct((r.total / Math.max(total, 1)) * 100)})</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Weekday x hour grid (WIB). Darker = more. Shows when the audience posts and engages. */
function TimingHeatmap({ data }: { data: Heatmap }) {
  const [metric, setMetric] = useState<"total" | "engagements">("total");
  const grid = new Map(data.cells.map((c) => [`${c.dow}-${c.hour}`, c]));
  const max = Math.max(1, ...data.cells.map((c) => c[metric]));
  const best = [...data.cells].sort((a, b) => b[metric] - a[metric]).slice(0, 3);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Segmented
          label="Metric"
          size="sm"
          value={metric}
          onChange={setMetric}
          options={[
            { value: "total", label: "Mentions" },
            { value: "engagements", label: "Engagement" },
          ]}
        />
        {best.length > 0 && (
          <p className="text-sm text-muted">
            Busiest:{" "}
            {best.map((c, i) => (
              <span key={`${c.dow}-${c.hour}`} className="font-semibold text-ink">
                {i > 0 ? ", " : ""}
                {DAYS_LONG[c.dow]} {String(c.hour).padStart(2, "0")}:00
              </span>
            ))}
          </p>
        )}
      </div>
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-[2px] text-[0.6875rem]">
          <colgroup>
            <col className="w-10" />
            {Array.from({ length: 24 }, (_, h) => (
              <col key={h} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th />
              {Array.from({ length: 24 }, (_, h) => (
                <th key={h} className="num font-normal text-muted">
                  {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((d, dow) => (
              <tr key={d}>
                <th className="pr-2 text-left font-medium text-muted">{d}</th>
                {Array.from({ length: 24 }, (_, hour) => {
                  const c = grid.get(`${dow}-${hour}`);
                  const v = c?.[metric] ?? 0;
                  return (
                    <td
                      key={hour}
                      title={`${DAYS_LONG[dow]} ${String(hour).padStart(2, "0")}:00 — ${fmt(c?.total ?? 0)} mentions, ${fmt(c?.engagements ?? 0)} engagement`}
                      className="h-6 rounded-[4px]"
                      style={{ background: v ? `color-mix(in srgb, var(--accent) ${Math.round(12 + (v / max) * 88)}%, transparent)` : "var(--line)" }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Hours are WIB. Use the Owned / earned filter to compare when brands post with when the public talks.</p>
    </div>
  );
}

export default function DemographicsPage() {
  const projectId = useProjectId();
  const { filters } = useFilters();
  const { data, error } = useSWR<Demographics>(
    `/api/projects/${projectId}/analytics/demographics?${filterQuery(filters)}`,
    fetcher,
    { keepPreviousData: true },
  );
  const heat = useSWR<Heatmap>(`/api/projects/${projectId}/analytics/heatmap?${filterQuery(filters)}`, fetcher, {
    keepPreviousData: true,
  });
  const unknownGender = data?.gender.find((g) => g.label === "Unknown")?.total ?? 0;
  const noGender = !!data && data.total > 0 && unknownGender === data.total;
  const countriesTotal = data?.countries.reduce((s, c) => s + c.total, 0) ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Audience & timing" detail={data ? fmtPeriod(data.period) : undefined} />

      <Panel title="When people post">
        {heat.data ? <TimingHeatmap data={heat.data} /> : <Skeleton className="h-56" />}
      </Panel>

      <Notice>
        Shows what the Zanroo export holds about authors: gender, province and country. Age is shown once the export includes it.
        {noGender ? " Gender is empty in this data (every mention is Unknown), so it is hidden." : ""}
      </Notice>
      {error ? (
        <Notice tone="error">Couldn&apos;t load demographics: {error.message}</Notice>
      ) : !data ? (
        <Skeleton className="h-96" />
      ) : data.total === 0 ? (
        <Notice>No mentions match these filters.</Notice>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {!noGender && (
          <Panel title="Gender" aside={<SentimentLegend />}>
            <Bars rows={data.gender.map((g) => ({ key: g.label, ...g }))} total={data.total} />
            {unknownGender / data.total > 0.9 && (
              <p className="mt-4 text-xs text-muted">
                {fmtPct((unknownGender / data.total) * 100)} of mentions have no gender in the export, so this split can&apos;t
                support conclusions yet.
              </p>
            )}
          </Panel>
          )}

          <Panel title="Country" aside={`${fmt(countriesTotal)} mentions with a country`}>
            {data.countries.length ? (
              <Bars
                rows={data.countries.slice(0, 10).map((c) => ({ key: c.code, label: countryName(c.code), ...c }))}
                total={countriesTotal}
              />
            ) : (
              <p className="text-sm text-muted">No country data.</p>
            )}
          </Panel>

          <Panel
            title="Province"
            aside={`${fmt(data.located)} of ${fmt(data.total)} mentions have a location (${fmtPct((data.located / data.total) * 100)})`}
            className="xl:col-span-2"
          >
            {data.provinces.length ? (
              <>
                <Bars
                  rows={data.provinces.slice(0, 20).map((p) => ({ key: p.code, label: p.name, ...p }))}
                  total={data.located}
                />
                <p className="mt-4 text-xs text-muted">
                  Shares are of mentions with a location. Net sentiment in the top provinces:{" "}
                  {data.provinces
                    .slice(0, 3)
                    .map((p) => `${p.name} ${fmtSigned(p.netSentiment)}`)
                    .join(", ")}
                  .
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">
                No province data yet. Upload the Excel file again to fill in locations for existing mentions.
              </p>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
