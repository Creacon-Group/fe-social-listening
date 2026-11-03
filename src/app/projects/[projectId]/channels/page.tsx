"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useSWR from "swr";
import { Segmented } from "@/components/segmented";
import { KpiBand, Notice, PageHeader, Panel, SentimentBar, SentimentLegend, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { filterQuery, useFilters } from "@/lib/filters";
import { CHANNEL_LABEL, fmt, fmtCompact, fmtPct, fmtPeriod, fmtSigned } from "@/lib/format";
import { useProjectId } from "@/lib/project";
import type { Channel, Channels } from "@/lib/types";

type Metric = "total" | "engagements" | "reach" | "engagementPerMention";
const METRIC_LABEL: Record<Metric, string> = {
  total: "Mentions",
  engagements: "Engagement",
  reach: "Estimated reach",
  engagementPerMention: "Engagement per mention",
};

const thBase = "px-2 py-2 text-xs font-medium text-muted";
const th = `${thBase} text-right`;
const td = "num px-2 py-3 text-right";

export default function ChannelsPage() {
  const projectId = useProjectId();
  const router = useRouter();
  const { filters } = useFilters();
  const [metric, setMetric] = useState<Metric>("total");
  const { data, error } = useSWR<Channels>(`/api/projects/${projectId}/analytics/channels?${filterQuery(filters)}`, fetcher, {
    keepPreviousData: true,
  });

  /** Drill down: the mentions of one channel, most engaging first. */
  const mentionsOf = (channel: Channel) => {
    const q = new URLSearchParams(window.location.search);
    q.set("channels", channel);
    q.set("sort", "engagements");
    return `/projects/${projectId}/mentions?${q.toString()}`;
  };

  const rows = [...(data?.channels ?? [])].sort((a, b) => b[metric] - a[metric]);

  return (
    <div className="space-y-5">
      <PageHeader title="Channel analysis" detail={data ? fmtPeriod(data.period) : undefined} />

      {error ? (
        <Notice tone="error">Couldn&apos;t load channels: {error.message}</Notice>
      ) : !data ? (
        <Skeleton className="h-96" />
      ) : data.total === 0 ? (
        <Notice>No mentions match these filters.</Notice>
      ) : (
        <>
          <KpiBand
            items={[
              { label: "Mentions", value: fmt(data.total) },
              { label: "Engagement", value: fmtCompact(data.engagements) },
              { label: "Estimated reach", value: fmtCompact(data.reach) },
              { label: "Engagement per mention", value: fmt(Math.round(data.engagementPerMention)) },
            ]}
          />

          <Panel
            title={`${METRIC_LABEL[metric]} by channel`}
            aside={
              <Segmented
                label="Metric"
                size="sm"
                value={metric}
                onChange={setMetric}
                options={[
                  { value: "total", label: "Mentions" },
                  { value: "engagements", label: "Engagement" },
                  { value: "reach", label: "Reach" },
                  { value: "engagementPerMention", label: "Per mention" },
                ]}
              />
            }
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis
                    dataKey="channel"
                    tickFormatter={(c: Channel) => CHANNEL_LABEL[c]}
                    tick={{ fontSize: 12, fill: "var(--muted)", cursor: "pointer" }}
                    tickLine={false}
                    axisLine={false}
                    onClick={(t: { value?: Channel }) => t.value && router.push(mentionsOf(t.value))}
                  />
                  <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 12, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip
                    cursor={{ fill: "var(--line)" }}
                    labelFormatter={(c) => `${CHANNEL_LABEL[c as Channel]} (click to see posts)`}
                    formatter={(v) => [fmt(Number(v)), METRIC_LABEL[metric]]}
                    contentStyle={{ borderRadius: 10, border: "none", background: "var(--card)", color: "var(--ink)", boxShadow: "var(--shadow-pop)", fontSize: 12 }}
                  />
                  <Bar
                    dataKey={metric}
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={false}
                    cursor="pointer"
                    onClick={(d: { payload?: { channel?: Channel } }) => d.payload?.channel && router.push(mentionsOf(d.payload.channel))}
                  >
                    {rows.map((r, i) => (
                      <Cell key={r.channel} fill={i === 0 ? "var(--ink)" : "var(--accent)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted">Click a bar or channel name to open its posts, most engaging first.</p>
          </Panel>

          <Panel title="Channel by channel" aside={<SentimentLegend />}>
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className={`${thBase} text-left`}>Channel</th>
                    <th className={th}>Mentions</th>
                    <th className={th}>Share</th>
                    <th className={th}>Engagement</th>
                    <th className={th}>Per mention</th>
                    <th className={th}>Reach</th>
                    <th className={th}>Views</th>
                    <th className={th} title="Mentions by brand accounts / everyone else">
                      Owned / earned
                    </th>
                    <th className={`${thBase} w-40 text-left`}>Sentiment</th>
                  </tr>
                </thead>
                <tbody>
                  {data.channels.map((c) => (
                    <tr key={c.channel} className="border-b border-line last:border-0">
                      <td className="px-2 py-3 font-semibold">
                        <Link href={mentionsOf(c.channel)} className="hover:underline">
                          {CHANNEL_LABEL[c.channel]}
                        </Link>
                      </td>
                      <td className={td}>{fmt(c.total)}</td>
                      <td className={td}>{fmtPct(c.share)}</td>
                      <td className={`${td} font-semibold`}>{fmtCompact(c.engagements)}</td>
                      <td className={td}>{fmt(Math.round(c.engagementPerMention))}</td>
                      <td className={td}>{fmtCompact(c.reach)}</td>
                      <td className={td}>{fmtCompact(c.views)}</td>
                      <td className={td}>
                        {fmt(c.owned)} / {fmt(c.earned)}
                      </td>
                      <td className="px-2 py-3">
                        <SentimentBar counts={c} />
                        <span className="num mt-1 block text-xs text-muted">Net {fmtSigned(c.netSentiment)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">
              Online News and Blog have no engagement or reach in the Zanroo export, so they show zero here. Their coverage counts as
              mentions.
            </p>
          </Panel>
        </>
      )}
    </div>
  );
}
