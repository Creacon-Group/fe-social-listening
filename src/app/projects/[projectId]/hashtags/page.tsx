"use client";

import useSWR from "swr";
import { Notice, PageHeader, Panel, SentimentBar, SentimentLegend, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { filterQuery, useFilters } from "@/lib/filters";
import { CHANNEL_LABEL, fmt, fmtCompact, fmtPeriod, fmtSigned } from "@/lib/format";
import { useProjectId } from "@/lib/project";
import type { Hashtags } from "@/lib/types";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-card p-4 sm:p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="num mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

export default function HashtagsPage() {
  const projectId = useProjectId();
  const { filters } = useFilters();
  const { data, error } = useSWR<Hashtags>(`/api/projects/${projectId}/analytics/hashtags?${filterQuery(filters)}`, fetcher, {
    keepPreviousData: true,
  });
  const top = data?.hashtags.slice(0, 15) ?? [];
  const max = top[0]?.total ?? 1;

  return (
    <div className="space-y-5">
      <PageHeader title="Hashtag" detail={data ? fmtPeriod(data.period) : undefined} />
      {error ? (
        <Notice tone="error">Data gagal dimuat: {error.message}</Notice>
      ) : !data ? (
        <Skeleton className="h-96" />
      ) : data.hashtags.length === 0 ? (
        <Notice>Tidak ada hashtag pada filter ini.</Notice>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Stat label="Mention dengan hashtag" value={fmt(data.mentionsWithHashtag)} />
            <Stat label="Hashtag unik" value={fmt(data.uniqueHashtags)} />
          </div>

          <Panel title="15 hashtag teratas" aside={<SentimentLegend />}>
            <ul className="space-y-3">
              {top.map((h) => (
                <li key={h.tag} className="grid grid-cols-[minmax(7rem,12rem)_1fr_4rem] items-center gap-3 text-sm">
                  <span className="truncate font-semibold" title={h.tag}>
                    {h.tag}
                  </span>
                  <span className="block" style={{ width: `${Math.max((h.total / max) * 100, 2)}%` }}>
                    <SentimentBar counts={h} />
                  </span>
                  <span className="num text-right text-muted">{fmt(h.total)}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Detail hashtag" aside="Diambil dari teks mention">
            <div className="-mx-3 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="px-3 py-2 font-semibold">Hashtag</th>
                    <th className="px-3 py-2 text-right font-semibold">Mentions</th>
                    <th className="px-3 py-2 text-right font-semibold">Engagement</th>
                    <th className="px-3 py-2 text-right font-semibold">Reach</th>
                    <th className="px-3 py-2 text-right font-semibold">Net sentiment</th>
                    <th className="px-3 py-2 font-semibold">Channel terbanyak</th>
                  </tr>
                </thead>
                <tbody>
                  {data.hashtags.map((h) => (
                    <tr key={h.tag} className="border-b border-line last:border-0">
                      <td className="px-3 py-2 font-semibold">{h.tag}</td>
                      <td className="num px-3 py-2 text-right">{fmt(h.total)}</td>
                      <td className="num px-3 py-2 text-right">{fmtCompact(h.engagements)}</td>
                      <td className="num px-3 py-2 text-right">{fmtCompact(h.reach)}</td>
                      <td className={`num px-3 py-2 text-right ${h.netSentiment < 0 ? "text-neg" : h.netSentiment > 0 ? "text-pos" : ""}`}>
                        {fmtSigned(h.netSentiment)}
                      </td>
                      <td className="px-3 py-2 text-muted">{h.topChannel ? CHANNEL_LABEL[h.topChannel] : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
