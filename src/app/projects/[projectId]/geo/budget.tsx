"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";
import type { GeoModelBudget } from "@/lib/geo-types";

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Remaining AI gateway budget (superadmin only). Models sharing one LiteLLM user show as one budget. */
export function GeoBudget({ projectId }: { projectId: number }) {
  const { data } = useSWR<GeoModelBudget[]>(`/api/projects/${projectId}/geo/budget`, fetcher, { refreshInterval: 60_000 });
  if (!data) return null;

  const groups = new Map<string, GeoModelBudget[]>();
  for (const b of data) {
    const k = b.ownerId && b.maxBudget !== null ? b.ownerId : `model:${b.key}`;
    groups.set(k, [...(groups.get(k) ?? []), b]);
  }

  return (
    <div className="flex flex-wrap gap-2" aria-label="AI budget">
      {[...groups.values()].map((g) => {
        const b = g[0];
        const label = g.map((x) => x.label).join(" + ") + (g.length > 1 ? " (shared)" : "");
        if (b.remaining === null || b.maxBudget === null)
          return (
            <span key={label} className="rounded-full bg-surface px-3 py-1 text-xs text-muted">
              {label}: {b.error ?? "no budget limit"}
            </span>
          );
        const low = b.remaining / Math.max(b.maxBudget, 0.01) < 0.2;
        return (
          <span
            key={label}
            title={`Spent ${usd(b.spend ?? 0)} of ${usd(b.maxBudget)}${b.resetAt ? ` · resets ${new Date(b.resetAt).toLocaleString("en-GB")}` : ""}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${low ? "bg-neg/10 text-neg" : "bg-surface text-ink"}`}
          >
            {label}: <span className="num">{usd(b.remaining)}</span> left of <span className="num">{usd(b.maxBudget)}</span>
          </span>
        );
      })}
    </div>
  );
}
