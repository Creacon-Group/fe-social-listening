"use client";

import { useState } from "react";
import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useSWR from "swr";
import { Segmented } from "@/components/segmented";
import { Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { type Filters, filterQuery } from "@/lib/filters";
import { fmt, fmtCompact, fmtDay } from "@/lib/format";
import type { Interval, Trend, TrendDay } from "@/lib/types";

export const INTERVAL_OPTIONS: { value: Interval; label: string }[] = [
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
];

const monthYear = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

/** Bucket keys from the API ("2026-09-24 13:00", "2026-09-24", "2026-09", "2026-Q3", "2026") as labels. */
export function fmtBucket(key: string, interval: Interval, long = false): string {
  switch (interval) {
    case "hour": {
      const [d, t] = key.split(" ");
      return long ? `${fmtDay(d)}, ${t}` : `${fmtDay(d)} ${t}`;
    }
    case "week":
      return long ? `Week of ${fmtDay(key)}` : fmtDay(key);
    case "month":
      return monthYear.format(new Date(`${key}-01T00:00:00Z`));
    case "quarter": {
      const [y, q] = key.split("-");
      return `${q} ${y}`;
    }
    case "year":
      return key;
    default:
      return fmtDay(key);
  }
}

const tooltipStyle = {
  borderRadius: 10,
  border: "none",
  background: "var(--card)",
  color: "var(--ink)",
  boxShadow: "var(--shadow-pop)",
  fontSize: 12,
};

type Secondary = "reach" | "engagements";
const SECONDARY_LABEL: Record<Secondary, string> = { reach: "Estimated reach", engagements: "Engagement" };

/**
 * Mentions (left axis) against reach or engagement (right axis) in one chart, so a spike in reach
 * can be read against the volume that caused it. Scales differ by orders of magnitude, hence two axes.
 */
export function ComboChart({
  days,
  interval,
  secondary,
  height = "h-72",
}: {
  days: TrendDay[];
  interval: Interval;
  secondary: Secondary;
  height?: string;
}) {
  if (days.length < 2) return <p className="text-sm text-muted">Pick a longer period or a shorter interval to see the trend.</p>;
  return (
    <div className={height}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={days} margin={{ top: 8, right: 0, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={(k) => fmtBucket(String(k), interval)}
            tick={{ fontSize: 12, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={fmtCompact}
            tick={{ fontSize: 12, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={fmtCompact}
            tick={{ fontSize: 12, fill: "var(--accent)" }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            labelFormatter={(k) => fmtBucket(String(k), interval, true)}
            formatter={(v, name) => [fmt(Number(v)), name]}
            contentStyle={tooltipStyle}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
          <Line
            yAxisId="left"
            dataKey="total"
            name="Mentions"
            stroke="var(--ink)"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="right"
            dataKey={secondary}
            name={SECONDARY_LABEL[secondary]}
            stroke="var(--accent)"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Trend panel body: interval and right-axis metric pickers, then the combo chart. Fetches its own data. */
export function TrendPanelBody({
  projectId,
  filters,
  initialInterval = "day",
  height,
}: {
  projectId: number;
  filters: Filters;
  initialInterval?: Interval;
  height?: string;
}) {
  const [interval, setInterval] = useState<Interval>(initialInterval);
  const [secondary, setSecondary] = useState<Secondary>("reach");
  const { data, error } = useSWR<Trend>(
    `/api/projects/${projectId}/analytics/trend?${filterQuery(filters, { interval })}`,
    fetcher,
    { keepPreviousData: true },
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented label="Interval" size="sm" value={interval} onChange={setInterval} options={INTERVAL_OPTIONS} />
        <Segmented
          label="Right axis"
          size="sm"
          value={secondary}
          onChange={setSecondary}
          options={[
            { value: "reach", label: "vs Reach" },
            { value: "engagements", label: "vs Engagement" },
          ]}
        />
      </div>
      {data && data.interval !== interval && (
        <p className="text-xs text-muted">Hourly view is available for periods up to 31 days; showing days instead.</p>
      )}
      {error ? (
        <p className="text-sm text-neg">Couldn&apos;t load the trend: {error.message}</p>
      ) : data ? (
        <ComboChart days={data.days} interval={data.interval} secondary={secondary} height={height} />
      ) : (
        <Skeleton className={height ?? "h-72"} />
      )}
    </div>
  );
}
