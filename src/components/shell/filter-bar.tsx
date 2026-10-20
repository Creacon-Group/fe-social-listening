"use client";

import { useFilters } from "@/lib/filters";
import { CHANNEL_LABEL, fmtDay, SENTIMENT_LABEL } from "@/lib/format";
import { useDataAsOf } from "@/lib/project";
import type { Channel, RangePreset, Sentiment } from "@/lib/types";

const CHANNELS: Channel[] = ["X", "TIKTOK", "INSTAGRAM", "ONLINE_NEWS", "FACEBOOK", "YOUTUBE"];
const SENTIMENTS: Sentiment[] = ["POSITIVE", "NEUTRAL", "NEGATIVE"];

const shift = (ymd: string, days: number) =>
  new Date(new Date(`${ymd}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? "bg-ink text-white" : "text-muted hover:bg-surface hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function FilterBar({ projectId }: { projectId: number }) {
  const { filters, setFilters } = useFilters();
  const { data } = useDataAsOf(projectId);
  const asOf = data?.dataAsOfWib;

  // Presets count back from the latest data, so label them with the actual dates.
  const presetLabel = (r: Exclude<RangePreset, "custom">, label: string) => {
    if (!asOf) return label;
    if (r === "today") return `${label} (${fmtDay(asOf)})`;
    const days = r === "7d" ? 7 : 30;
    return `${label} (${fmtDay(shift(asOf, 1 - days))}–${fmtDay(asOf)})`;
  };

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-card px-2 py-2">
      <div role="group" aria-label="Rentang waktu" className="flex flex-wrap items-center gap-0.5">
        <Pill active={filters.range === "today"} onClick={() => setFilters({ range: "today" })}>
          {presetLabel("today", "Hari terakhir")}
        </Pill>
        <Pill active={filters.range === "7d"} onClick={() => setFilters({ range: "7d" })}>
          {presetLabel("7d", "7 hari")}
        </Pill>
        <Pill active={filters.range === "30d"} onClick={() => setFilters({ range: "30d" })}>
          {presetLabel("30d", "30 hari")}
        </Pill>
        <Pill
          active={filters.range === "custom"}
          onClick={() =>
            setFilters({
              range: "custom",
              from: filters.from ?? (asOf ? shift(asOf, -6) : undefined),
              to: filters.to ?? asOf ?? undefined,
            })
          }
        >
          Pilih tanggal
        </Pill>
        {filters.range === "custom" && (
          <span className="flex items-center gap-1 pl-1 text-xs">
            <input
              type="date"
              aria-label="Dari tanggal"
              value={filters.from ?? ""}
              max={filters.to}
              onChange={(e) => setFilters({ from: e.target.value })}
              className="rounded-lg border border-line px-2 py-1"
            />
            <span className="text-muted">s.d.</span>
            <input
              type="date"
              aria-label="Sampai tanggal"
              value={filters.to ?? ""}
              min={filters.from}
              onChange={(e) => setFilters({ to: e.target.value })}
              className="rounded-lg border border-line px-2 py-1"
            />
          </span>
        )}
      </div>

      <span className="hidden h-5 w-px bg-line lg:block" aria-hidden />

      <div role="group" aria-label="Channel" className="flex flex-wrap items-center gap-0.5">
        <Pill active={!filters.channels.length} onClick={() => setFilters({ channels: [] })}>
          Semua channel
        </Pill>
        {CHANNELS.map((c) => (
          <Pill key={c} active={filters.channels.includes(c)} onClick={() => setFilters({ channels: toggle(filters.channels, c) })}>
            {CHANNEL_LABEL[c]}
          </Pill>
        ))}
      </div>

      <span className="hidden h-5 w-px bg-line lg:block" aria-hidden />

      <div role="group" aria-label="Sentimen" className="flex flex-wrap items-center gap-0.5">
        <Pill active={!filters.sentiments.length} onClick={() => setFilters({ sentiments: [] })}>
          Semua sentimen
        </Pill>
        {SENTIMENTS.map((s) => (
          <Pill
            key={s}
            active={filters.sentiments.includes(s)}
            onClick={() => setFilters({ sentiments: toggle(filters.sentiments, s) })}
          >
            {SENTIMENT_LABEL[s]}
          </Pill>
        ))}
      </div>
    </div>
  );
}
