"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmt, fmtCompact, fmtDay } from "@/lib/format";
import type { TrendDay } from "@/lib/types";

function DayChart({ days, dataKey, color, label }: { days: TrendDay[]; dataKey: "total" | "reach"; color: string; label: string }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={days} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fontSize: 12, fill: "var(--muted)" }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 12, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={52} />
          <Tooltip
            labelFormatter={(d) => fmtDay(String(d))}
            formatter={(v) => [fmt(Number(v)), label]}
            contentStyle={{ borderRadius: 12, border: "1px solid var(--line)", fontSize: 12 }}
          />
          <Area dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={color} fillOpacity={0.08} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Mentions and reach per day, as in the Summary and AI Insights pages. */
export function TrendCharts({ days, stacked = false }: { days: TrendDay[]; stacked?: boolean }) {
  if (days.length < 2) return <p className="text-sm text-muted">Pilih rentang lebih dari satu hari untuk melihat tren.</p>;
  return (
    <div className={`grid gap-5 ${stacked ? "" : "lg:grid-cols-2"}`}>
      <div>
        <p className="mb-2 text-sm font-semibold">Mentions per hari</p>
        <DayChart days={days} dataKey="total" color="var(--ruby)" label="Mentions" />
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Reach per hari</p>
        <DayChart days={days} dataKey="reach" color="var(--violet)" label="Reach" />
      </div>
    </div>
  );
}
