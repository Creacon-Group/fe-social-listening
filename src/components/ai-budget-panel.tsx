"use client";

import useSWR from "swr";
import { Notice, Panel } from "@/components/ui";
import { fetcher } from "@/lib/api";
import type { GeoModelBudget } from "@/lib/geo-types";

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Remaining AI gateway (SumoPod) budget per model. Superadmin only.
 * Models whose keys belong to the same gateway user share one budget and show as one row.
 */
export function AiBudgetPanel({ projectId }: { projectId: number }) {
  const { data, error } = useSWR<GeoModelBudget[]>(`/api/projects/${projectId}/geo/budget`, fetcher, { refreshInterval: 60_000 });

  const groups = new Map<string, GeoModelBudget[]>();
  for (const b of data ?? []) {
    const k = b.ownerId && b.maxBudget !== null ? b.ownerId : `model:${b.key}`;
    groups.set(k, [...(groups.get(k) ?? []), b]);
  }

  return (
    <Panel title="AI model budget" aside="SumoPod spend for GEO and the assistant. Updates every minute.">
      {error ? (
        <Notice tone="error">Couldn&apos;t load the AI budget.</Notice>
      ) : !data ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <ul className="divide-y divide-line">
          {[...groups.values()].map((g) => {
            const b = g[0];
            const label = g.map((x) => x.label).join(" + ");
            const known = b.remaining !== null && b.maxBudget !== null;
            const share = known ? b.remaining! / Math.max(b.maxBudget!, 0.01) : 0;
            const low = known && share < 0.2;
            return (
              <li key={label} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-center">
                <div className="min-w-0">
                  <p className="font-semibold">{label}</p>
                  <p className="text-xs text-muted">{g.length > 1 ? "One shared budget for these models" : "Own budget"}</p>
                </div>
                {known ? (
                  <div>
                    <p className="text-sm">
                      <b className={`num ${low ? "text-neg" : "text-ink"}`}>{usd(b.remaining!)}</b>
                      <span className="text-muted">
                        {" "}
                        left of <span className="num">{usd(b.maxBudget!)}</span> · spent <span className="num">{usd(b.spend ?? 0)}</span>
                      </span>
                    </p>
                    <div
                      className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line"
                      role="progressbar"
                      aria-label={`${label} budget left`}
                      aria-valuenow={Math.round(share * 100)}
                      aria-valuemax={100}
                    >
                      <div className={`h-full ${low ? "bg-neg" : "bg-accent"}`} style={{ width: `${share * 100}%` }} />
                    </div>
                    {b.resetAt && <p className="mt-1 text-xs text-muted">Resets {new Date(b.resetAt).toLocaleString("en-GB")}</p>}
                    {low && <p className="mt-1 text-xs text-neg">Under 20% left. Top up the SumoPod budget before the next run.</p>}
                  </div>
                ) : (
                  <p className="text-sm text-muted">{b.error ?? "No budget limit set"}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
