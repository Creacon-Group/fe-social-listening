"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { Channel, RangePreset, Sentiment } from "./types";

export interface Filters {
  range: RangePreset;
  from?: string;
  to?: string;
  channels: Channel[];
  sentiments: Sentiment[];
}

const list = <T extends string>(v: string | null) => (v ? (v.split(",").filter(Boolean) as T[]) : []);

/** Dashboard filter lives in the URL: shareable links, and the AI assistant reads the same state. */
export function useFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo<Filters>(
    () => ({
      range: (params.get("range") as RangePreset) ?? "7d",
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      channels: list<Channel>(params.get("channels")),
      sentiments: list<Sentiment>(params.get("sentiments")),
    }),
    [params],
  );

  const setFilters = useCallback(
    (patch: Partial<Filters>) => {
      const next = { ...filters, ...patch };
      const q = new URLSearchParams();
      q.set("range", next.range);
      if (next.range === "custom" && next.from && next.to) {
        q.set("from", next.from);
        q.set("to", next.to);
      }
      if (next.channels.length) q.set("channels", next.channels.join(","));
      if (next.sentiments.length) q.set("sentiments", next.sentiments.join(","));
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [filters, pathname, router],
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
  };
}

const shiftDay = (ymd: string, days: number) =>
  new Date(new Date(`${ymd}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);

/** The dates a filter covers, counted back from the latest data day (the same rule the API uses). */
export function periodFor(f: Filters, asOf: string | null | undefined): { from: string; to: string } | null {
  if (f.range === "custom") return f.from && f.to ? { from: f.from, to: f.to } : null;
  if (!asOf) return null;
  const days = f.range === "today" ? 1 : f.range === "7d" ? 7 : 30;
  return { from: shiftDay(asOf, 1 - days), to: asOf };
}
