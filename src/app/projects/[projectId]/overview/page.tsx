"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { ReportActions } from "@/components/report-actions";
import { Segmented } from "@/components/segmented";
import { SovRibbon } from "@/components/sov-ribbon";
import { TrendPanelBody } from "@/components/trend-charts";
import { Delta, KpiBand, Notice, PageHeader, Panel, SentimentBar, SentimentLegend, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { filterQuery, useFilters } from "@/lib/filters";
import { CHANNEL_LABEL, fmt, fmtCompact, fmtPct, fmtPeriod, fmtSigned, TYPE_LABEL } from "@/lib/format";
import { nssHint, useBrands, useProjectId, useSettings } from "@/lib/project";
import type { Competitors, Influencers, Keywords, Overview, Topics } from "@/lib/types";

type Metric = "mentions" | "engagements" | "reach";

/** Likes, comments, shares... under the Engagement figure. Zero parts are left out. */
function EngagementParts({ o }: { o: Overview }) {
  const b = o.engagementBreakdown;
  const parts: [string, number][] = [
    ["Views", b.views],
    ["Likes", b.likes],
    ["Comments", b.comments],
    ["Shares", b.shares],
    ["Saves", b.bookmarks],
    ["Love", b.reactions.love],
    ["Haha", b.reactions.haha],
    ["Wow", b.reactions.wow],
    ["Sad", b.reactions.sad],
    ["Angry", b.reactions.angry],
  ];
  return (
    <ul className="grid grid-cols-1 gap-x-3 gap-y-0.5 text-xs text-muted sm:grid-cols-2">
      {parts
        .filter(([, v]) => v > 0)
        .map(([label, v]) => (
          <li key={label} className="flex justify-between gap-2">
            <span>{label}</span>
            <span className="num font-semibold text-ink">{fmtCompact(v)}</span>
          </li>
        ))}
    </ul>
  );
}

/** Owned (brand accounts) vs earned, on mentions, engagement and reach. */
function OwnedEarned({ o }: { o: Overview }) {
  const { owned, earned } = o.ownedEarned;
  const rows: [string, number, number][] = [
    ["Mentions", owned.total, earned.total],
    ["Engagement", owned.engagements, earned.engagements],
    ["Estimated reach", owned.reach, earned.reach],
  ];
  return (
    <div className="space-y-4">
      {rows.map(([label, a, b]) => {
        const sum = a + b || 1;
        return (
          <div key={label}>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="font-medium">{label}</span>
              <span className="num text-muted">
                {fmtPct((a / sum) * 100)} owned · {fmtPct((b / sum) * 100)} earned
              </span>
            </div>
            <div className="flex h-2.5 w-full gap-px overflow-hidden rounded-full bg-line" role="img" aria-label={`${label}: owned ${fmt(a)}, earned ${fmt(b)}`}>
              <span style={{ width: `${(a / sum) * 100}%` }} className="h-full bg-ink" />
              <span style={{ width: `${(b / sum) * 100}%` }} className="h-full bg-accent" />
            </div>
            <div className="num mt-1 flex justify-between text-xs text-muted">
              <span>{fmtCompact(a)}</span>
              <span>{fmtCompact(b)}</span>
            </div>
          </div>
        );
      })}
      <p className="flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-ink" /> Owned: posts by brand accounts (Zanroo &ldquo;Brand Voice&rdquo; or marked Official)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" /> Earned: public, media and KOL
        </span>
      </p>
    </div>
  );
}

export default function OverviewPage() {
  const projectId = useProjectId();
  const { filters } = useFilters();
  const q = filterQuery(filters);
  const [metric, setMetric] = useState<Metric>("engagements");
  const overview = useSWR<Overview>(`/api/projects/${projectId}/analytics/overview?${q}`, fetcher, { keepPreviousData: true });
  const comp = useSWR<Competitors>(`/api/projects/${projectId}/analytics/competitors?${q}`, fetcher, { keepPreviousData: true });
  const top = useSWR<Influencers>(
    `/api/projects/${projectId}/analytics/influencers?${filterQuery(filters, { sort: metric, limit: 5 })}`,
    fetcher,
    { keepPreviousData: true },
  );
  const topics = useSWR<Topics>(`/api/projects/${projectId}/analytics/topics?${q}`, fetcher, { keepPreviousData: true });
  const keywords = useSWR<Keywords>(`/api/projects/${projectId}/analytics/keywords?${q}`, fetcher, { keepPreviousData: true });
  const { data: brands } = useBrands(projectId);
  const { data: settings } = useSettings(projectId);

  const o = overview.data;
  const c = comp.data;
  const ownNames = (brands ?? []).filter((b) => b.isOwn).map((b) => b.name);
  const showNss = settings?.showNss ?? true;
  const topTopics = (topics.data?.topics ?? []).filter((t) => t.total > 0).slice(0, 5);

  return (
    <div className="space-y-5">
      <PageHeader title="Summary" detail={o ? fmtPeriod(o.period) : undefined} actions={<ReportActions projectId={projectId} compact />} />

      {overview.error ? (
        <Notice tone="error">Couldn&apos;t load the summary: {overview.error.message}</Notice>
      ) : !o ? (
        <Skeleton className="h-36" />
      ) : o.total === 0 ? (
        <Notice>
          No mentions match these filters. Widen the period or{" "}
          <Link className="font-semibold text-ink underline" href={`/projects/${projectId}/upload`}>
            upload data
          </Link>
          .
        </Notice>
      ) : (
        <>
          <KpiBand
            items={[
              { label: "Mentions", value: fmt(o.total), delta: <Delta value={o.growth.total} /> },
              ...(showNss
                ? [
                    {
                      label: "Net sentiment",
                      value: fmtSigned(o.netSentiment),
                      delta: <Delta value={o.growth.netSentiment} unit="pts" />,
                      hint: nssHint(settings),
                    },
                  ]
                : []),
              {
                label: "Engagement",
                value: fmtCompact(o.engagements),
                delta: <Delta value={o.growth.engagements} />,
                detail: <EngagementParts o={o} />,
              },
              { label: "Estimated reach", value: fmtCompact(o.reach), delta: <Delta value={o.growth.reach} /> },
            ]}
          />
          <p className="-mt-2 text-xs text-muted">
            Change is against {fmtPeriod(o.previousPeriod)}. Engagement is Zanroo&apos;s total and includes video views.
          </p>

          <Panel title="Trend">
            <TrendPanelBody projectId={projectId} filters={filters} />
          </Panel>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Panel title="Owned vs earned">
              <OwnedEarned o={o} />
            </Panel>

            <Panel title="Sentiment" aside={<SentimentLegend />}>
              <SentimentBar counts={o} height="h-3" />
              <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
                {(
                  [
                    ["Positive", o.positive, "text-pos", o.growth.positive, false],
                    ["Neutral", o.neutral, "text-muted", o.growth.neutral, false],
                    ["Negative", o.negative, "text-neg", o.growth.negative, true],
                  ] as const
                ).map(([label, v, tone, g, invert]) => (
                  <div key={label}>
                    <dt className="text-muted">{label}</dt>
                    <dd className={`num mt-0.5 text-[1.375rem] font-semibold tracking-[-0.02em] ${tone}`}>{fmt(v)}</dd>
                    <dd className="num text-xs text-muted">{fmtPct((v / o.total) * 100)}</dd>
                    <dd className="mt-1">
                      <Delta value={g} invert={invert} />
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs text-muted">
                Neutral includes news and media placements. Filter by Online News or by a campaign keyword to see where it comes from.
              </p>
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
            <Panel
              title="Top contributors"
              className="xl:col-span-3"
              aside={
                <Segmented
                  label="Rank by"
                  size="sm"
                  value={metric}
                  onChange={setMetric}
                  options={[
                    { value: "engagements", label: "Engagement" },
                    { value: "reach", label: "Reach" },
                    { value: "mentions", label: "Mentions" },
                  ]}
                />
              }
            >
              {!top.data ? (
                <Skeleton className="h-48" />
              ) : (
                <ol className="space-y-2.5">
                  {top.data.authors.map((a, i) => (
                    <li key={`${a.channel}-${a.handle}`} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 text-sm">
                      <span className="num text-muted">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{a.name ?? `@${a.handle}`}</span>
                        <span className="block truncate text-xs text-muted">
                          @{a.handle.replace(/^@/, "")} · {CHANNEL_LABEL[a.channel]} · {TYPE_LABEL[a.accountType]}
                          {a.tier ? ` (${a.tier})` : ""}
                        </span>
                      </span>
                      <span className="num text-right font-semibold">
                        {metric === "mentions" ? fmt(a.total) : fmtCompact(metric === "reach" ? a.reach : a.engagements)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              <Link
                href={`/projects/${projectId}/influencers?${q}`}
                className="mt-4 inline-block text-sm font-semibold underline underline-offset-2"
              >
                All influencers and sources
              </Link>
            </Panel>

            <Panel
              title="Mentions by channel"
              className="xl:col-span-2"
              aside={
                <Link className="font-semibold text-ink underline underline-offset-2" href={`/projects/${projectId}/channels?${q}`}>
                  Channel analysis
                </Link>
              }
            >
              <ul className="space-y-3">
                {o.channels.map((ch) => (
                  <li key={ch.channel} className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-3 text-sm">
                    <span className="font-medium">{CHANNEL_LABEL[ch.channel]}</span>
                    <span className="block">
                      <span className="block" style={{ width: `${Math.max((ch.total / o.channels[0].total) * 100, 2)}%` }}>
                        <SentimentBar counts={ch} />
                      </span>
                    </span>
                    <span className="num text-right text-muted">{fmt(ch.total)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {c && c.brands.length > 0 && (
              <Panel
                title="Share of voice"
                aside={
                  <Link className="font-semibold text-ink underline underline-offset-2" href={`/projects/${projectId}/competitors?${q}`}>
                    Competitive insights
                  </Link>
                }
              >
                <p className="text-sm text-muted">
                  <span className="mark font-semibold text-ink">{ownNames.join(" + ")}</span> hold{" "}
                  <span className="num font-bold text-ink">{fmtPct(c.own.sov)}</span> of brand mentions ({fmt(c.own.total)} unique
                  mentions).
                </p>
                <SovRibbon competitors={c} brandColors={brands} />
              </Panel>
            )}

            <Panel
              title={topTopics.length ? "Top topics" : "Top keywords"}
              aside={
                <Link
                  className="font-semibold text-ink underline underline-offset-2"
                  href={`/projects/${projectId}/${topTopics.length ? "topics" : "hashtags"}?${q}`}
                >
                  See all
                </Link>
              }
            >
              <ul className="space-y-2.5 text-sm">
                {(topTopics.length
                  ? topTopics.map((t) => ({ key: `t${t.categoryId}`, label: t.name, total: t.total, share: t.share }))
                  : (keywords.data?.keywords ?? []).slice(0, 5).map((k) => ({ key: k.keyword, label: k.keyword, total: k.total, share: k.share }))
                ).map((r) => (
                  <li key={r.key} className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-medium">{r.label}</span>
                    <span className="num shrink-0 text-muted">
                      {fmt(r.total)} <span className="text-xs">({fmtPct(r.share)})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
