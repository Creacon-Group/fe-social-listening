"use client";

import { useState } from "react";
import useSWR from "swr";
import { Select } from "@/components/select";
import { Notice, PageHeader, Panel, SentimentBar, SentimentLegend, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { filterQuery, useFilters } from "@/lib/filters";
import { CHANNEL_LABEL, fmt, fmtCompact, fmtPeriod, fmtSigned, webUrl } from "@/lib/format";
import { useProjectId } from "@/lib/project";
import type { Influencers } from "@/lib/types";

const SORTS = [
  ["reach", "Most reach"],
  ["engagements", "Most engagement"],
  ["mentions", "Most mentions"],
] as const;

const th = "px-3 py-2 text-left text-xs font-semibold text-muted";
const td = "px-3 py-2.5 align-middle";

export default function InfluencersPage() {
  const projectId = useProjectId();
  const { filters } = useFilters();
  const [sort, setSort] = useState<(typeof SORTS)[number][0]>("reach");
  const { data, error, isLoading } = useSWR<Influencers>(
    `/api/projects/${projectId}/analytics/influencers?${filterQuery(filters, { sort })}`,
    fetcher,
    { keepPreviousData: true },
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Influencers & sources" detail={data ? fmtPeriod(data.period) : undefined} />
      {error ? (
        <Notice tone="error">Couldn&apos;t load influencers: {error.message}</Notice>
      ) : !data ? (
        <Skeleton className="h-96" />
      ) : data.authors.length === 0 ? (
        <Notice>No mentions match these filters.</Notice>
      ) : (
        <>
          <Panel
            title="Top influencers"
            aside={
              <Select label="Sort influencers" hideLabel density="sm" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                {SORTS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            }
          >
            <div className={`-mx-3 overflow-x-auto ${isLoading ? "opacity-60" : ""}`}>
              <table className="w-full min-w-[44rem] text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className={th}>#</th>
                    <th className={th}>Account</th>
                    <th className={`${th} text-right`}>Followers</th>
                    <th className={`${th} text-right`}>Mentions</th>
                    <th className={`${th} text-right`}>Reach</th>
                    <th className={`${th} text-right`}>Engagement</th>
                    <th className={`${th} w-40`}>Sentiment</th>
                  </tr>
                </thead>
                <tbody>
                  {data.authors.map((a, i) => {
                    const handle = a.handle.replace(/^@/, "");
                    return (
                      <tr key={`${a.channel}-${a.handle}`} className="border-b border-line last:border-0">
                        <td className={`${td} num text-muted`}>{i + 1}</td>
                        <td className={td}>
                          {webUrl(a.userLink) ? (
                            <a href={webUrl(a.userLink)!} target="_blank" rel="noreferrer noopener" className="font-semibold hover:underline">
                              {a.name ?? `@${handle}`}
                            </a>
                          ) : (
                            <span className="font-semibold">{a.name ?? `@${handle}`}</span>
                          )}
                          <span className="block text-xs text-muted">
                            @{handle} on {CHANNEL_LABEL[a.channel]}
                            {a.verified ? " (verified)" : ""}
                          </span>
                        </td>
                        <td className={`${td} num text-right`}>{a.followers ? fmtCompact(a.followers) : "–"}</td>
                        <td className={`${td} num text-right`}>{fmt(a.total)}</td>
                        <td className={`${td} num text-right font-semibold`}>{fmtCompact(a.reach)}</td>
                        <td className={`${td} num text-right`}>{fmtCompact(a.engagements)}</td>
                        <td className={td}>
                          <SentimentBar counts={a} />
                          <span className="num mt-1 block text-xs text-muted">Net {fmtSigned(a.netSentiment)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Top sources" aside={<SentimentLegend />}>
            <p className="mb-3 text-sm text-muted">News sites and platforms, from the link on each mention.</p>
            <div className="-mx-3 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className={th}>Site or platform</th>
                    <th className={`${th} text-right`}>Mentions</th>
                    <th className={`${th} text-right`}>Reach</th>
                    <th className={`${th} text-right`}>Engagement</th>
                    <th className={`${th} w-40`}>Sentiment</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sources.map((s) => (
                    <tr key={s.host} className="border-b border-line last:border-0">
                      <td className={`${td} font-semibold`}>
                        {s.host}
                        <span className="block text-xs font-normal text-muted">{CHANNEL_LABEL[s.channel]}</span>
                      </td>
                      <td className={`${td} num text-right`}>{fmt(s.total)}</td>
                      <td className={`${td} num text-right`}>{fmtCompact(s.reach)}</td>
                      <td className={`${td} num text-right`}>{fmtCompact(s.engagements)}</td>
                      <td className={td}>
                        <SentimentBar counts={s} />
                        <span className="num mt-1 block text-xs text-muted">Net {fmtSigned(s.netSentiment)}</span>
                      </td>
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
