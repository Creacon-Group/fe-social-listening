"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { Popover, Sheet, useMedia } from "@/components/overlay";
import { ChipGroup, Segmented } from "@/components/segmented";
import { btnPrimary, btnQuiet, inputBase } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { useBusy } from "@/lib/busy";
import { filterQuery, useFilters } from "@/lib/filters";
import { CHANNEL_LABEL, fmtDay, SENTIMENT_LABEL } from "@/lib/format";
import { useCategories, useDataAsOf, useProjectId } from "@/lib/project";
import type { Channel, Keywords, RangePreset, Sentiment } from "@/lib/types";

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

/** Zanroo keywords in the period (brand, product and campaign keywords), searchable. */
function KeywordChoices() {
  const projectId = useProjectId();
  const { filters, setFilters } = useFilters();
  const [find, setFind] = useState("");
  const { data } = useSWR<Keywords>(
    `/api/projects/${projectId}/analytics/keywords?${filterQuery({ ...filters, keywords: [] })}`,
    fetcher,
    { keepPreviousData: true },
  );
  const shown = useMemo(() => {
    const all = data?.keywords ?? [];
    const term = find.trim().toLowerCase();
    const hits = term ? all.filter((k) => k.keyword.toLowerCase().includes(term)) : all.slice(0, 16);
    const picked = filters.keywords.filter((k) => !hits.some((h) => h.keyword === k));
    return [...picked.map((keyword) => ({ keyword, total: 0 })), ...hits.slice(0, 24)];
  }, [data, find, filters.keywords]);
  if (!data?.keywords.length && !filters.keywords.length) return null;
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">Keyword or campaign</legend>
      <input
        type="search"
        value={find}
        onChange={(e) => setFind(e.target.value)}
        placeholder="Find a keyword, e.g. Activation"
        aria-label="Find a keyword"
        className={`${inputBase} mb-2 w-full`}
      />
      <ChipGroup
        items={[
          { key: "all", label: "All keywords", on: !filters.keywords.length, onClick: () => setFilters({ keywords: [] }) },
          ...shown.map((k) => ({
            key: `k:${k.keyword}`,
            label: k.total ? `${k.keyword} (${k.total.toLocaleString("en-GB")})` : k.keyword,
            on: filters.keywords.includes(k.keyword),
            onClick: () => setFilters((f) => ({ keywords: toggle(f.keywords, k.keyword) })),
          })),
        ]}
      />
    </fieldset>
  );
}

/** Channel and sentiment choices. The same content goes in the desktop popover and the phone sheet. */
function FilterChoices() {
  const { filters, setFilters } = useFilters();
  const { data: categories } = useCategories(useProjectId());
  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Owned or earned</legend>
        <ChipGroup
          single
          items={[
            { key: "all", label: "All posts", on: !filters.voice, onClick: () => setFilters({ voice: undefined }) },
            { key: "owned", label: "Owned (brand accounts)", on: filters.voice === "owned", onClick: () => setFilters({ voice: "owned" }) },
            { key: "earned", label: "Earned (public, media, KOL)", on: filters.voice === "earned", onClick: () => setFilters({ voice: "earned" }) },
          ]}
        />
      </fieldset>
      {categories && categories.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Topic</legend>
          <ChipGroup
            items={[
              { key: "all", label: "All topics", on: !filters.categories.length, onClick: () => setFilters({ categories: [] }) },
              ...categories.map((c) => ({
                key: `c${c.id}`,
                label: c.name,
                on: filters.categories.includes(c.id),
                onClick: () => setFilters((f) => ({ categories: toggle(f.categories, c.id) })),
              })),
              { key: "c0", label: "No topic", on: filters.categories.includes(0), onClick: () => setFilters((f) => ({ categories: toggle(f.categories, 0) })) },
            ]}
          />
        </fieldset>
      )}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Channel</legend>
        <ChipGroup
          items={[
            { key: "all", label: "All channels", on: !filters.channels.length, onClick: () => setFilters({ channels: [] }) },
            ...CHANNELS.map((c) => ({
              key: c,
              label: CHANNEL_LABEL[c],
              on: filters.channels.includes(c),
              onClick: () => setFilters((f) => ({ channels: toggle(f.channels, c) })),
            })),
          ]}
        />
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Sentiment</legend>
        <ChipGroup
          items={[
            { key: "all", label: "All sentiment", on: !filters.sentiments.length, onClick: () => setFilters({ sentiments: [] }) },
            ...SENTIMENTS.map((x) => ({
              key: x,
              label: SENTIMENT_LABEL[x],
              on: filters.sentiments.includes(x),
              onClick: () => setFilters((f) => ({ sentiments: toggle(f.sentiments, x) })),
            })),
          ]}
        />
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Paid or organic</legend>
        <ChipGroup
          single
          items={[
            { key: "all", label: "All authors", on: !filters.paid, onClick: () => setFilters({ paid: undefined }) },
            { key: "paid", label: "Paid", on: filters.paid === "paid", onClick: () => setFilters({ paid: "paid" }) },
            { key: "organic", label: "Organic", on: filters.paid === "organic", onClick: () => setFilters({ paid: "organic" }) },
          ]}
        />
        <p className="mt-1.5 text-xs text-muted">Paid accounts are marked on the Influencers page.</p>
      </fieldset>
      <KeywordChoices />
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

  const { data: categories } = useCategories(projectId);
  const categoryName = (id: number) => (id === 0 ? "No topic" : (categories?.find((c) => c.id === id)?.name ?? "Topic"));
  const count =
    filters.channels.length +
    filters.sentiments.length +
    filters.categories.length +
    filters.keywords.length +
    (filters.voice ? 1 : 0) +
    (filters.paid ? 1 : 0);
  const cleared = { channels: [], sentiments: [], categories: [], keywords: [], voice: undefined, paid: undefined };
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
      <div className="-mx-1 max-w-full overflow-x-auto px-1 py-0.5">
      <Segmented
        label="Period"
        value={filters.range}
        onChange={setRange}
        options={[
          { value: "today", label: desktop && asOf ? `Latest day, ${fmtDay(asOf)}` : "Day" },
          { value: "7d", label: "7 days" },
          { value: "30d", label: "30 days" },
          { value: "90d", label: desktop ? "90 days" : "90d" },
          { value: "365d", label: desktop ? "1 year" : "1y" },
          { value: "custom", label: "Custom" },
        ]}
      />
      </div>

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
              <ActiveChip key={c} label={CHANNEL_LABEL[c]} onRemove={() => setFilters((f) => ({ channels: toggle(f.channels, c) }))} />
            ))}
            {filters.categories.map((id) => (
              <ActiveChip
                key={`cat-${id}`}
                label={categoryName(id)}
                onRemove={() => setFilters((f) => ({ categories: toggle(f.categories, id) }))}
              />
            ))}
            {filters.voice && (
              <ActiveChip
                key="voice"
                label={filters.voice === "owned" ? "Owned" : "Earned"}
                onRemove={() => setFilters({ voice: undefined })}
              />
            )}
            {filters.paid && (
              <ActiveChip key="paid" label={filters.paid === "paid" ? "Paid" : "Organic"} onRemove={() => setFilters({ paid: undefined })} />
            )}
            {filters.keywords.map((k) => (
              <ActiveChip key={`kw-${k}`} label={k} onRemove={() => setFilters((f) => ({ keywords: toggle(f.keywords, k) }))} />
            ))}
            {filters.sentiments.map((s) => (
              <ActiveChip
                key={s}
                label={SENTIMENT_LABEL[s]}
                onRemove={() => setFilters((f) => ({ sentiments: toggle(f.sentiments, s) }))}
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
              onClick={() => setFilters(cleared)}
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
              <button type="button" onClick={() => setFilters(cleared)} disabled={!count} className={btnQuiet}>
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
