"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useSWR from "swr";
import { BrandName, Notice, PageHeader, Panel, SentimentBar, SentimentLegend, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { filterQuery, useFilters } from "@/lib/filters";
import { fmt, fmtCompact, fmtDay, fmtPct, fmtPeriod, fmtSigned } from "@/lib/format";
import { brandColor, useMe, useProjectId } from "@/lib/project";
import type { Topic, Topics } from "@/lib/types";

const tone = (n: number) => (n < 0 ? "text-neg" : n > 0 ? "text-pos" : "text-muted");

/** Link to the Mentions page with the current filters plus one topic. */
function useMentionsHref(projectId: number) {
  const params = useSearchParams();
  return (categoryId: number) => {
    const q = new URLSearchParams(params.toString());
    q.set("categories", String(categoryId));
    return `/projects/${projectId}/mentions?${q.toString()}`;
  };
}

function Change({ t, days }: { t: Topic; days: number }) {
  if (t.change === null)
    return <span className="text-muted">{t.total ? `None in the previous ${days === 1 ? "day" : `${days} days`}` : ""}</span>;
  const up = t.change > 0;
  return (
    <span className={t.change === 0 ? "text-muted" : up ? "text-ink" : "text-muted"}>
      <span aria-hidden>{up ? "▲" : t.change < 0 ? "▼" : ""} </span>
      {fmtSigned(t.change)}% vs previous {days === 1 ? "day" : `${days} days`}
    </span>
  );
}

function TopicTrend({ topics }: { topics: Topic[] }) {
  const top = topics.filter((t) => t.total > 0).slice(0, 5);
  if (!top.length || top[0].days.length < 2) return <p className="text-sm text-muted">Pick a period longer than one day to see the trend.</p>;
  const rows = top[0].days.map((d, i) => ({ day: d.day, ...Object.fromEntries(top.map((t) => [t.name, t.days[i]?.total ?? 0])) }));
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fontSize: 12, fill: "var(--muted)" }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 12, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={48} />
          <Tooltip
            labelFormatter={(d) => fmtDay(String(d))}
            formatter={(v, name) => [fmt(Number(v)), String(name)]}
            contentStyle={{ borderRadius: 10, border: "none", background: "var(--card)", color: "var(--ink)", boxShadow: "var(--shadow-pop)", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
          {top.map((t) => (
            <Line key={t.categoryId} dataKey={t.name} stroke={brandColor(t, t.categoryId)} strokeWidth={2} dot={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function TopicsPage() {
  const projectId = useProjectId();
  const { filters } = useFilters();
  const { data: me } = useMe();
  const mentionsHref = useMentionsHref(projectId);
  const { data, error } = useSWR<Topics>(`/api/projects/${projectId}/analytics/topics?${filterQuery(filters)}`, fetcher, {
    keepPreviousData: true,
  });
  const isAdmin = me?.role === "ADMIN" || me?.role === "SUPERADMIN";
  const setupHref = `/projects/${projectId}/categories`;
  const days = data ? Math.round((Date.parse(data.period.to) - Date.parse(data.period.from)) / 86_400_000) + 1 : 0;
  const max = Math.max(1, ...(data?.topics.map((t) => t.total) ?? [1]));
  const brands = data?.topics[0]?.brands.length
    ? [...new Map(data.topics.flatMap((t) => t.brands).map((b) => [b.brandId, b])).values()].sort((a, b) => Number(b.isOwn) - Number(a.isOwn))
    : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Topics"
        detail={
          data
            ? `${fmtPeriod(data.period)}. ${fmt(data.categorized)} of ${fmt(data.total)} mentions have a topic.`
            : undefined
        }
        actions={
          isAdmin ? (
            <Link href={setupHref} className="text-sm font-semibold text-ink underline underline-offset-2">
              Edit topic categories
            </Link>
          ) : undefined
        }
      />

      {error ? (
        <Notice tone="error">Couldn&apos;t load topics: {error.message}</Notice>
      ) : !data ? (
        <Skeleton className="h-96" />
      ) : data.topics.length === 0 ? (
        <Notice>
          No topic categories yet.{" "}
          {isAdmin ? (
            <Link href={setupHref} className="font-semibold text-ink underline">
              Set up topic categories
            </Link>
          ) : (
            "Ask an admin to set them up."
          )}
        </Notice>
      ) : (
        <>
          <Panel title="What people talk about" aside={<SentimentLegend />}>
            <ul className="divide-y divide-line">
              {data.topics.map((t) => (
                <li key={t.categoryId}>
                  <Link
                    href={mentionsHref(t.categoryId)}
                    className="pressable -mx-2 grid grid-cols-1 gap-2 rounded-lg px-2 py-3 hover:bg-surface sm:grid-cols-[minmax(9rem,13rem)_1fr_auto] sm:items-center sm:gap-4"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: brandColor(t, t.categoryId) }} />
                      <span className="truncate font-semibold">{t.name}</span>
                    </span>
                    <span className="block" style={{ width: `${Math.max((t.total / max) * 100, 2)}%` }}>
                      <SentimentBar counts={t} />
                    </span>
                    <span className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-sm sm:justify-end">
                      <span className="num font-semibold">{fmt(t.total)}</span>
                      <span className="num text-muted">{fmtPct(t.share)} of mentions</span>
                      <span className={`num ${tone(t.netSentiment)}`}>net {fmtSigned(t.netSentiment)}</span>
                      <span className="num t-caption basis-full sm:text-right">
                        <Change t={t} days={days} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {data.uncategorized > 0 && (
              <p className="mt-3 text-xs text-muted">
                {fmt(data.uncategorized)} mentions match no topic.{" "}
                <Link href={mentionsHref(0)} className="font-semibold text-ink underline">
                  See them
                </Link>
                {isAdmin ? " to find tags or keywords worth adding." : "."}
              </p>
            )}
            <p className="mt-1 text-xs text-muted">A mention can belong to more than one topic, so shares can add up to more than 100%.</p>
          </Panel>

          <Panel title="Daily trend, top 5 topics">
            <TopicTrend topics={data.topics} />
          </Panel>

          {brands.length > 0 && (
            <Panel title="Topics by brand" aside="Net sentiment, with mentions below">
              <div className="-mx-4 overflow-x-auto px-4 md:-mx-5 md:px-5">
                <table className="w-full min-w-[36rem] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th className="py-2 pr-3 font-semibold">Topic</th>
                      {brands.map((b) => (
                        <th key={b.brandId} className="px-3 py-2 text-right font-semibold">
                          <BrandName name={b.name} own={b.isOwn} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.topics.map((t) => (
                      <tr key={t.categoryId} className="border-b border-line last:border-0">
                        <td className="py-2.5 pr-3 font-semibold">{t.name}</td>
                        {brands.map((b) => {
                          const cell = t.brands.find((x) => x.brandId === b.brandId);
                          return (
                            <td key={b.brandId} className="px-3 py-2.5 text-right">
                              {cell ? (
                                <>
                                  <span className={`num block font-semibold ${tone(cell.netSentiment)}`}>{fmtSigned(cell.netSentiment)}</span>
                                  <span className="num t-caption block text-muted">{fmt(cell.total)}</span>
                                </>
                              ) : (
                                <span className="text-muted">–</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
