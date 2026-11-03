"use client";

import useSWR from "swr";
import { Notice, PageHeader, Panel, SentimentBar, SentimentLegend, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { filterQuery, useFilters } from "@/lib/filters";
import { CHANNEL_LABEL, fmt, fmtCompact, fmtPct, fmtPeriod, fmtSigned } from "@/lib/format";
import { useProjectId } from "@/lib/project";
import type { Hashtags, Keywords } from "@/lib/types";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-[18px] p-4 sm:p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="num mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

/** Zanroo keywords (brands, products, campaigns) with a link that filters the whole dashboard by one. */
function KeywordPanel({ projectId }: { projectId: number }) {
  const { filters, setFilters } = useFilters();
  const { data } = useSWR<Keywords>(`/api/projects/${projectId}/analytics/keywords?${filterQuery(filters)}`, fetcher, {
    keepPreviousData: true,
  });
  if (!data) return <Skeleton className="h-64" />;
  if (!data.keywords.length) return null;
  return (
    <Panel title="Keywords and campaigns" aside="From the Zanroo Keyword column">
      <p className="mb-3 text-sm text-muted">
        Totals across all channels per keyword. A mention can match several keywords, so shares add up to more than 100%. Click a
        keyword to filter the whole dashboard by it (useful for campaigns such as &ldquo;Activation&rdquo; keywords).
      </p>
      <div className="-mx-3 max-h-[32rem] overflow-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-3 py-2 font-semibold">Keyword</th>
              <th className="px-3 py-2 text-right font-semibold">Mentions</th>
              <th className="px-3 py-2 text-right font-semibold">Share</th>
              <th className="px-3 py-2 text-right font-semibold">Engagement</th>
              <th className="px-3 py-2 text-right font-semibold">Reach</th>
              <th className="w-36 px-3 py-2 font-semibold">Sentiment</th>
            </tr>
          </thead>
          <tbody>
            {data.keywords.map((k) => (
              <tr key={k.keyword} className="border-b border-line last:border-0">
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setFilters({ keywords: [k.keyword] })}
                    className="text-left font-semibold hover:underline"
                    title="Filter the dashboard by this keyword"
                  >
                    {k.keyword}
                  </button>
                </td>
                <td className="num px-3 py-2 text-right">{fmt(k.total)}</td>
                <td className="num px-3 py-2 text-right">{fmtPct(k.share)}</td>
                <td className="num px-3 py-2 text-right">{fmtCompact(k.engagements)}</td>
                <td className="num px-3 py-2 text-right">{fmtCompact(k.reach)}</td>
                <td className="px-3 py-2">
                  <SentimentBar counts={k} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
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
      <PageHeader title="Hashtags & keywords" detail={data ? fmtPeriod(data.period) : undefined} />
      {error ? (
        <Notice tone="error">Couldn&apos;t load hashtags: {error.message}</Notice>
      ) : !data ? (
        <Skeleton className="h-96" />
      ) : data.hashtags.length === 0 ? (
        <>
          <Notice>No hashtags in mentions that match these filters.</Notice>
          <KeywordPanel projectId={projectId} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Stat label="Mentions with a hashtag" value={fmt(data.mentionsWithHashtag)} />
            <Stat label="Unique hashtags" value={fmt(data.uniqueHashtags)} />
          </div>

          <Panel title="Top 15 hashtags" aside={<SentimentLegend />}>
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

          <KeywordPanel projectId={projectId} />

          <Panel title="Detail hashtag" aside="Taken from mention text">
            <div className="-mx-3 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="px-3 py-2 font-semibold">Hashtag</th>
                    <th className="px-3 py-2 text-right font-semibold">Mentions</th>
                    <th className="px-3 py-2 text-right font-semibold">Engagement</th>
                    <th className="px-3 py-2 text-right font-semibold">Reach</th>
                    <th className="px-3 py-2 text-right font-semibold">Net sentiment</th>
                    <th className="px-3 py-2 font-semibold">Top channel</th>
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
