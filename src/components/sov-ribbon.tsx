"use client";

import { fmt, fmtPct } from "@/lib/format";
import { brandColor } from "@/lib/project";
import type { Competitors } from "@/lib/types";

/** One 100% bar split by brand; own brands are marked in the legend. */
export function SovRibbon({
  competitors,
  brandColors,
}: {
  competitors: Competitors;
  brandColors?: { id: number; color: string | null }[];
}) {
  const colorOf = (id: number, i: number) => brandColor(brandColors?.find((b) => b.id === id) ?? {}, i);
  return (
    <div className="mt-4">
      <div className="flex h-11 w-full gap-px overflow-hidden rounded-lg" role="img" aria-label="Share of voice per brand">
        {competitors.brands.map((b, i) => (
          <div
            key={b.brandId}
            title={`${b.name} ${fmtPct(b.sov)}`}
            style={{ width: `${b.sov}%`, background: colorOf(b.brandId, i) }}
            className={`flex min-w-0 shrink-0 items-center overflow-hidden text-xs font-semibold text-white ${b.sov >= 9 ? "px-3" : ""} ${b.isOwn ? "" : "opacity-90"}`}
          >
            {b.sov >= 9 && <span className="truncate">{b.name}</span>}
          </div>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {competitors.brands.map((b, i) => (
          <li key={b.brandId} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colorOf(b.brandId, i) }} />
            {b.isOwn ? <span className="mark font-semibold">{b.name}</span> : <span className="text-muted">{b.name}</span>}
            <span className="num">{fmtPct(b.sov)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">
        Brand split: a mention that names two brands counts for both, so the split adds up to 100% of {fmt(competitors.totalBrandMentions)} brand
        mentions.
      </p>
    </div>
  );
}
