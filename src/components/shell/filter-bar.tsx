"use client";

import { useFilters } from "@/lib/filters";
import { CHANNEL_LABEL, fmtDay, SENTIMENT_LABEL } from "@/lib/format";
import { useDataAsOf } from "@/lib/project";
import type { Channel, RangePreset, Sentiment } from "@/lib/types";

const CHANNELS: Channel[] = ["X", "TIKTOK", "INSTAGRAM", "ONLINE_NEWS", "FACEBOOK", "YOUTUBE"];
const SENTIMENTS: Sentiment[] = ["POSITIVE", "NEUTRAL", "NEGATIVE"];

const shift = (ymd: string, days: number) =>
  new Date(new Date(`${ymd}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);

/** One segment of a joined control group. Square-ish corners: these are tools, not tags. */
function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-9 whitespace-nowrap px-3 text-[0.8125rem] font-semibold ${
        active ? "bg-ink text-white" : "text-muted hover:bg-surface hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted">{label}</span>
      <div className="flex flex-wrap divide-x divide-line overflow-hidden rounded-md border border-line bg-card">{children}</div>
    </div>
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
    <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
      <Group label="Period">
        <Seg active={filters.range === "today"} onClick={() => setFilters({ range: "today" })}>
          {presetLabel("today", "Latest day")}
        </Seg>
        <Seg active={filters.range === "7d"} onClick={() => setFilters({ range: "7d" })}>
          {presetLabel("7d", "7 days")}
        </Seg>
        <Seg active={filters.range === "30d"} onClick={() => setFilters({ range: "30d" })}>
          {presetLabel("30d", "30 days")}
        </Seg>
        <Seg
          active={filters.range === "custom"}
          onClick={() =>
            setFilters({
              range: "custom",
              from: filters.from ?? (asOf ? shift(asOf, -6) : undefined),
              to: filters.to ?? asOf ?? undefined,
            })
          }
        >
          Custom
        </Seg>
      </Group>
      {filters.range === "custom" && (
        <span className="flex items-center gap-1.5 text-xs">
          <input
            type="date"
            aria-label="From date"
            value={filters.from ?? ""}
            max={filters.to}
            onChange={(e) => setFilters({ from: e.target.value })}
            className="min-h-9 rounded-md border border-line bg-card px-2"
          />
          <span className="text-muted">to</span>
          <input
            type="date"
            aria-label="To date"
            value={filters.to ?? ""}
            min={filters.from}
            onChange={(e) => setFilters({ to: e.target.value })}
            className="min-h-9 rounded-md border border-line bg-card px-2"
          />
        </span>
      )}

      <Group label="Channel">
        <Seg active={!filters.channels.length} onClick={() => setFilters({ channels: [] })}>
          All
        </Seg>
        {CHANNELS.map((c) => (
          <Seg key={c} active={filters.channels.includes(c)} onClick={() => setFilters({ channels: toggle(filters.channels, c) })}>
            {CHANNEL_LABEL[c]}
          </Seg>
        ))}
      </Group>

      <Group label="Sentiment">
        <Seg active={!filters.sentiments.length} onClick={() => setFilters({ sentiments: [] })}>
          All
        </Seg>
        {SENTIMENTS.map((s) => (
          <Seg key={s} active={filters.sentiments.includes(s)} onClick={() => setFilters({ sentiments: toggle(filters.sentiments, s) })}>
            {SENTIMENT_LABEL[s]}
          </Seg>
        ))}
      </Group>
    </div>
  );
}
