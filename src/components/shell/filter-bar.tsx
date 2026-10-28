"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { Popover, Sheet, useMedia } from "@/components/overlay";
import { Segmented, ToggleChip } from "@/components/segmented";
import { btnPrimary, btnQuiet } from "@/components/ui";
import { useBusy } from "@/lib/busy";
import { useFilters } from "@/lib/filters";
import { CHANNEL_LABEL, fmtDay, SENTIMENT_LABEL } from "@/lib/format";
import { useDataAsOf } from "@/lib/project";
import type { Channel, RangePreset, Sentiment } from "@/lib/types";

const CHANNELS: Channel[] = ["X", "TIKTOK", "INSTAGRAM", "ONLINE_NEWS", "FACEBOOK", "YOUTUBE"];
const SENTIMENTS: Sentiment[] = ["POSITIVE", "NEUTRAL", "NEGATIVE"];

const shift = (ymd: string, days: number) =>
  new Date(new Date(`${ymd}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function SlidersIcon() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M2 4h7M12 4h2M2 12h2M7 12h7" />
      <circle cx="10.5" cy="4" r="1.5" />
      <circle cx="5.5" cy="12" r="1.5" />
    </svg>
  );
}

/** Channel and sentiment choices. The same content goes in the desktop popover and the phone sheet. */
function FilterChoices() {
  const { filters, setFilters } = useFilters();
  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Channel</legend>
        <div className="flex flex-wrap gap-2">
          <ToggleChip on={!filters.channels.length} onClick={() => setFilters({ channels: [] })}>
            All channels
          </ToggleChip>
          {CHANNELS.map((c) => (
            <ToggleChip key={c} on={filters.channels.includes(c)} onClick={() => setFilters({ channels: toggle(filters.channels, c) })}>
              {CHANNEL_LABEL[c]}
            </ToggleChip>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Sentiment</legend>
        <div className="flex flex-wrap gap-2">
          <ToggleChip on={!filters.sentiments.length} onClick={() => setFilters({ sentiments: [] })}>
            All sentiment
          </ToggleChip>
          {SENTIMENTS.map((s) => (
            <ToggleChip
              key={s}
              on={filters.sentiments.includes(s)}
              onClick={() => setFilters({ sentiments: toggle(filters.sentiments, s) })}
            >
              {SENTIMENT_LABEL[s]}
            </ToggleChip>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

/** Removable chip for one active filter, shown next to the Filters button on wide screens. */
function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      layout={!reduce}
      type="button"
      onClick={onRemove}
      aria-label={`Remove filter ${label}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", bounce: 0, duration: 0.25 }}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-card pl-3 pr-2 text-xs font-semibold ring-1 ring-line ring-inset hover:ring-ink/40"
    >
      {label}
      <span aria-hidden className="text-muted">
        ✕
      </span>
    </motion.button>
  );
}

export function Status() {
  const busy = useBusy();
  return (
    <span role="status" aria-live="polite" className="t-caption flex min-w-[5.5rem] items-center justify-end gap-1.5 text-muted">
      <AnimatePresence>
        {busy && (
          <motion.span
            key="busy"
            className="flex items-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <span aria-hidden className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-muted/30 border-t-muted" />
            Updating
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export function FilterBar({ projectId }: { projectId: number }) {
  const { filters, setFilters } = useFilters();
  const { data } = useDataAsOf(projectId);
  const asOf = data?.dataAsOfWib;
  const desktop = useMedia("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const trigger = useRef<HTMLButtonElement>(null);

  const count = filters.channels.length + filters.sentiments.length;
  const setRange = (range: RangePreset) => {
    if (range !== "custom") return setFilters({ range });
    setFilters({
      range: "custom",
      from: filters.from ?? (asOf ? shift(asOf, -6) : undefined),
      to: filters.to ?? asOf ?? undefined,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Segmented
        label="Period"
        value={filters.range}
        onChange={setRange}
        options={[
          { value: "today", label: desktop && asOf ? `Latest day, ${fmtDay(asOf)}` : "Day" },
          { value: "7d", label: "7 days" },
          { value: "30d", label: "30 days" },
          { value: "custom", label: "Custom" },
        ]}
      />

      {filters.range === "custom" && (
        <span className="flex items-center gap-1.5 text-xs">
          <input
            type="date"
            aria-label="From date"
            value={filters.from ?? ""}
            max={filters.to}
            onChange={(e) => setFilters({ from: e.target.value })}
            className="min-h-9 rounded-lg bg-card px-2 ring-1 ring-line ring-inset"
          />
          <span className="text-muted">to</span>
          <input
            type="date"
            aria-label="To date"
            value={filters.to ?? ""}
            min={filters.from}
            onChange={(e) => setFilters({ to: e.target.value })}
            className="min-h-9 rounded-lg bg-card px-2 ring-1 ring-line ring-inset"
          />
        </span>
      )}

      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        aria-label={desktop ? undefined : count ? `Filters, ${count} on` : "Filters"}
        className={`${count ? btnPrimary : btnQuiet} min-h-9 ${desktop ? "" : "min-w-11 px-3"}`}
      >
        <SlidersIcon />
        {desktop ? `Filters${count ? ` (${count})` : ""}` : count ? count : null}
      </button>

      {desktop && (
        <span className="flex flex-wrap items-center gap-1.5">
          <AnimatePresence initial={false}>
            {filters.channels.map((c) => (
              <ActiveChip key={c} label={CHANNEL_LABEL[c]} onRemove={() => setFilters({ channels: toggle(filters.channels, c) })} />
            ))}
            {filters.sentiments.map((s) => (
              <ActiveChip
                key={s}
                label={SENTIMENT_LABEL[s]}
                onRemove={() => setFilters({ sentiments: toggle(filters.sentiments, s) })}
              />
            ))}
          </AnimatePresence>
        </span>
      )}

      {desktop && (
        <span className="ml-auto">
          <Status />
        </span>
      )}

      {desktop ? (
        <Popover open={open} onClose={close} anchor={trigger} label="Filters">
          <FilterChoices />
          {count > 0 && (
            <button
              type="button"
              onClick={() => setFilters({ channels: [], sentiments: [] })}
              className="mt-4 text-sm font-semibold text-muted hover:text-ink"
            >
              Clear filters
            </button>
          )}
        </Popover>
      ) : (
        <Sheet
          open={open}
          onClose={close}
          title="Filters"
          footer={
            <>
              <button type="button" onClick={() => setFilters({ channels: [], sentiments: [] })} disabled={!count} className={btnQuiet}>
                Clear
              </button>
              <button type="button" onClick={close} className={btnPrimary} data-autofocus>
                Done
              </button>
            </>
          }
        >
          <FilterChoices />
        </Sheet>
      )}
    </div>
  );
}
