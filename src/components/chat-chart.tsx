"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmt, fmtCompact } from "@/lib/format";
import { brandColor } from "@/lib/project";

/**
 * Chart spec the assistant writes in a ```chart fenced block (see the BE system prompt).
 * The numbers come from tool results; this component only draws them.
 */
type ChartSpec = {
  type: "bar" | "line" | "pie";
  title?: string;
  xKey: string;
  series: { key: string; label?: string }[];
  data: Record<string, string | number>[];
};

const MAX_ROWS = 60;
const MAX_SERIES = 8;

function parseSpec(raw: string): ChartSpec | null {
  try {
    const s = JSON.parse(raw) as Partial<ChartSpec>;
    if (!s || !["bar", "line", "pie"].includes(s.type as string)) return null;
    if (typeof s.xKey !== "string" || !Array.isArray(s.series) || !Array.isArray(s.data)) return null;
    const series = s.series.filter((x) => x && typeof x.key === "string").slice(0, MAX_SERIES);
    const data = s.data.filter((r) => r && typeof r === "object").slice(0, MAX_ROWS);
    if (!series.length || !data.length) return null;
    return { type: s.type as ChartSpec["type"], title: s.title, xKey: s.xKey, series, data };
  } catch {
    return null;
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
const tick = { fontSize: 11, fill: "var(--muted)" };
const num = (v: unknown) => (typeof v === "number" ? fmt(v) : String(v));

export function ChatChart({ raw, streaming }: { raw: string; streaming: boolean }) {
  const spec = parseSpec(raw);
  if (!spec) {
    // While the answer streams the JSON is still incomplete.
    if (streaming)
      return <div className="h-56 animate-pulse rounded-xl bg-surface" aria-label="Preparing chart" />;
    return (
      <pre className="overflow-x-auto rounded-xl bg-surface p-3 text-xs">
        <code>{raw}</code>
      </pre>
    );
  }

  const { type, title, xKey, series, data } = spec;
  const label = (k: string) => series.find((s) => s.key === k)?.label ?? k;

  return (
    <figure className="rounded-xl border border-line bg-card p-3">
      {title && <figcaption className="mb-2 text-sm font-semibold">{title}</figcaption>}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {type === "pie" ? (
            <PieChart>
              <Pie data={data} dataKey={series[0].key} nameKey={xKey} innerRadius="45%" outerRadius="80%" paddingAngle={1}>
                {data.map((_, i) => (
                  <Cell key={i} fill={brandColor({}, i)} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => num(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          ) : type === "line" ? (
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey={xKey} tick={tick} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => fmtCompact(v)} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, k) => [num(v), label(String(k))]} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} formatter={(k) => label(String(k))} />}
              {series.map((s, i) => (
                <Line key={s.key} dataKey={s.key} stroke={brandColor({}, i)} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey={xKey} tick={tick} tickLine={false} axisLine={false} interval={0} />
              <YAxis tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => fmtCompact(v)} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface)" }} formatter={(v, k) => [num(v), label(String(k))]} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} formatter={(k) => label(String(k))} />}
              {series.map((s, i) => (
                <Bar key={s.key} dataKey={s.key} fill={brandColor({}, i)} radius={[4, 4, 0, 0]} maxBarSize={48} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
