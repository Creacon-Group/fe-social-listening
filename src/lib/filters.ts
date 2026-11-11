"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { Channel, PaidFilter, RangePreset, Sentiment, Voice } from "./types";

export interface Filters {
  range: RangePreset;
  from?: string;
  to?: string;
  channels: Channel[];
  sentiments: Sentiment[];
  /** Topic category ids; 0 = mentions with no category. */
  categories: number[];
  /** owned = brand accounts (Brand Voice), earned = everyone else. */
  voice?: Voice;
  /** Zanroo keywords, e.g. campaign keywords. */
  keywords: string[];
  paid?: PaidFilter;
}

const list = <T extends string>(v: string | null) => (v ? (v.split(",").filter(Boolean) as T[]) : []);

function parseFilters(params: Pick<URLSearchParams, "get" | "getAll">): Filters {
  return {
    range: (params.get("range") as RangePreset) ?? "7d",
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    channels: list<Channel>(params.get("channels")),
    sentiments: list<Sentiment>(params.get("sentiments")),
    categories: (params.get("categories") ?? "").split(",").filter(Boolean).map(Number).filter(Number.isInteger),
    voice: (["owned", "earned"] as const).find((v) => v === params.get("voice")),
    keywords: params.getAll("kw"),
    paid: (["paid", "organic"] as const).find((v) => v === params.get("paid")),
  };
}

/** Dashboard filter lives in the URL: shareable links, and the AI assistant reads the same state. */
export function useFilters() {
  const params = useSearchParams();
  const pathname = usePathname();

  const filters = useMemo(() => parseFilters(params), [params]);

  const setFilters = useCallback(
    (patch: Partial<Filters> | ((current: Filters) => Partial<Filters>)) => {
      // Read the live URL, not this render's copy: controls commit after their slide, so two quick
      // changes in different controls must not overwrite each other.
      const current = parseFilters(new URLSearchParams(window.location.search));
      const next = { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
      const q = new URLSearchParams();
      q.set("range", next.range);
      if (next.range === "custom" && next.from && next.to) {
        q.set("from", next.from);
        q.set("to", next.to);
      }
      if (next.channels.length) q.set("channels", next.channels.join(","));
      if (next.sentiments.length) q.set("sentiments", next.sentiments.join(","));
      if (next.categories.length) q.set("categories", next.categories.join(","));
      if (next.voice) q.set("voice", next.voice);
      for (const k of next.keywords) q.append("kw", k); // keywords can contain commas
      if (next.paid) q.set("paid", next.paid);
      // Native history update: useSearchParams syncs at once, with no server round trip,
      // so the segmented thumb and chip capsule start sliding on the same frame as the tap.
      window.history.replaceState(null, "", `${pathname}?${q.toString()}`);
    },
    [pathname],
  );

  return { filters, setFilters };
}

/** Query string the backend understands (and that SWR uses as a cache key). */
export function filterQuery(f: Filters, extra: Record<string, string | number | undefined> = {}) {
  const q = new URLSearchParams();
  q.set("range", f.range === "custom" && !(f.from && f.to) ? "7d" : f.range);
  if (f.range === "custom" && f.from && f.to) {
    q.set("from", f.from);
    q.set("to", f.to);
  }
  if (f.channels.length) q.set("channels", f.channels.join(","));
  if (f.sentiments.length) q.set("sentiments", f.sentiments.join(","));
  if (f.categories.length) q.set("categoryIds", f.categories.join(","));
  if (f.voice) q.set("voice", f.voice);
  if (f.keywords.length) q.set("keywords", f.keywords.join(","));
  if (f.paid) q.set("paid", f.paid);
  for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== "") q.set(k, String(v));
  return q.toString();
}

/** Body shape for the assistant endpoint. */
export function filterBody(f: Filters) {
  const ready = f.range !== "custom" || (f.from && f.to);
  return {
    range: ready ? f.range : "7d",
    ...(f.range === "custom" && f.from && f.to ? { from: f.from, to: f.to } : {}),
    ...(f.channels.length ? { channels: f.channels } : {}),
    ...(f.sentiments.length ? { sentiments: f.sentiments } : {}),
    ...(f.categories.length ? { categoryIds: f.categories } : {}),
    ...(f.voice ? { voice: f.voice } : {}),
    ...(f.keywords.length ? { keywords: f.keywords } : {}),
    ...(f.paid ? { paid: f.paid } : {}),
  };
}

const shiftDay = (ymd: string, days: number) =>
  new Date(new Date(`${ymd}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);

/** The dates a filter covers, counted back from the latest data day (the same rule the API uses). */
export function periodFor(f: Filters, asOf: string | null | undefined): { from: string; to: string } | null {
  if (f.range === "custom") return f.from && f.to ? { from: f.from, to: f.to } : null;
  if (!asOf) return null;
  const days = { today: 1, "7d": 7, "30d": 30, "90d": 90, "365d": 365 }[f.range];
  return { from: shiftDay(asOf, 1 - days), to: asOf };
}
