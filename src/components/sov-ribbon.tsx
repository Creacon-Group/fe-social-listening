"use client";

import { fmtPct } from "@/lib/format";
import { brandColor } from "@/lib/project";
import type { Competitors } from "@/lib/types";

/** One 100% bar split by brand. Own brands carry their saturated colors; competitors stay muted. */
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
      <div className="flex h-12 w-full overflow-hidden rounded-2xl" role="img" aria-label="Share of voice per brand">
        {competitors.brands.map((b, i) => (
          <div
            key={b.brandId}
            title={`${b.name} ${fmtPct(b.sov)}`}
            style={{ width: `${b.sov}%`, background: colorOf(b.brandId, i) }}
            className={`flex items-center overflow-hidden px-3 text-xs font-semibold text-white ${b.isOwn ? "" : "opacity-90"}`}
          >
            {b.sov >= 9 && <span className="truncate">{b.name}</span>}
          </div>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {competitors.brands.map((b, i) => (
          <li key={b.brandId} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(b.brandId, i) }} />
            <span className={b.isOwn ? "font-semibold" : "text-muted"}>{b.name}</span>
            <span className="num">{fmtPct(b.sov)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
