"use client";

import useSWR from "swr";
import { Notice, PageHeader, Panel, SentimentBar, SentimentLegend, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { filterQuery, useFilters } from "@/lib/filters";
import { fmt, fmtPct, fmtPeriod, fmtSigned } from "@/lib/format";
import { useProjectId } from "@/lib/project";
import type { Demographics } from "@/lib/types";

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

export default function DemographicsPage() {
  const projectId = useProjectId();
  const { filters } = useFilters();
  const { data, error } = useSWR<Demographics>(
    `/api/projects/${projectId}/analytics/demographics?${filterQuery(filters)}`,
    fetcher,
    { keepPreviousData: true },
  );
  const unknownGender = data?.gender.find((g) => g.label === "Unknown")?.total ?? 0;
  const countriesTotal = data?.countries.reduce((s, c) => s + c.total, 0) ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Demographics" detail={data ? fmtPeriod(data.period) : undefined} />
      <Notice>
        Shows what the Zanroo export holds about authors: gender, province and country. The export has no age data.
      </Notice>
      {error ? (
        <Notice tone="error">Couldn&apos;t load demographics: {error.message}</Notice>
      ) : !data ? (
        <Skeleton className="h-96" />
      ) : data.total === 0 ? (
        <Notice>No mentions match these filters.</Notice>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Panel title="Gender" aside={<SentimentLegend />}>
            <Bars rows={data.gender.map((g) => ({ key: g.label, ...g }))} total={data.total} />
            {unknownGender / data.total > 0.9 && (
              <p className="mt-4 text-xs text-muted">
                {fmtPct((unknownGender / data.total) * 100)} of mentions have no gender in the export, so this split can&apos;t
                support conclusions yet.
              </p>
            )}
          </Panel>

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
