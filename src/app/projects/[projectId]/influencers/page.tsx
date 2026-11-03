"use client";

import { useState } from "react";
import useSWR from "swr";
import { Segmented } from "@/components/segmented";
import { Select } from "@/components/select";
import { Notice, PageHeader, Panel, SentimentBar, SentimentLegend, Skeleton } from "@/components/ui";
import { apiSend, fetcher } from "@/lib/api";
import { filterQuery, useFilters } from "@/lib/filters";
import { CHANNEL_LABEL, fmt, fmtCompact, fmtPeriod, fmtSigned, TYPE_LABEL, webUrl } from "@/lib/format";
import { useMe, useProjectId } from "@/lib/project";
import type { AccountType, Channel, Influencer, Influencers } from "@/lib/types";

const SORTS = [
  ["engagements", "Most engagement"],
  ["reach", "Most reach"],
  ["mentions", "Most mentions"],
] as const;

type Tab = "KOL" | "MEDIA" | "OFFICIAL" | "OTHER" | "ALL";
const TABS: { value: Tab; label: string }[] = [
  { value: "KOL", label: "KOL & creators" },
  { value: "MEDIA", label: "Media & news" },
  { value: "OFFICIAL", label: "Official accounts" },
  { value: "OTHER", label: "Public" },
  { value: "ALL", label: "All" },
];
const CHANNELS: Channel[] = ["TIKTOK", "X", "INSTAGRAM", "YOUTUBE", "FACEBOOK", "ONLINE_NEWS"];
const TYPES: AccountType[] = ["KOL", "MEDIA", "OFFICIAL", "OTHER"];

const th = "px-3 py-2 text-left text-xs font-semibold text-muted";
const td = "px-3 py-2.5 align-middle";
const keyOf = (a: { channel: Channel; handle: string }) => `${a.channel}|${a.handle}`;

function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "accent" | "warn" }) {
  const cls = tone === "accent" ? "bg-accent-soft text-accent" : tone === "warn" ? "bg-neg/10 text-neg" : "bg-surface text-muted";
  return <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${cls}`}>{children}</span>;
}

/** Bulk classification bar: account type and paid/organic for the selected accounts. */
function BulkBar({
  count,
  onApply,
  onClear,
  busy,
}: {
  count: number;
  onApply: (patch: { accountType?: AccountType | null; isPaid?: boolean | null }) => void;
  onClear: () => void;
  busy: boolean;
}) {
  return (
    <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-[14px] bg-ink px-3 py-2 text-sm text-on-ink shadow-lg">
      <span className="font-semibold">{count} selected</span>
      <span className="mx-1 opacity-40">|</span>
      <span className="opacity-70">Type:</span>
      {TYPES.map((t) => (
        <button key={t} disabled={busy} onClick={() => onApply({ accountType: t })} className="rounded-full px-2.5 py-1 font-semibold hover:bg-white/15">
          {TYPE_LABEL[t]}
        </button>
      ))}
      <button disabled={busy} onClick={() => onApply({ accountType: null })} className="rounded-full px-2.5 py-1 opacity-70 hover:bg-white/15">
        Auto
      </button>
      <span className="mx-1 opacity-40">|</span>
      <button disabled={busy} onClick={() => onApply({ isPaid: true })} className="rounded-full px-2.5 py-1 font-semibold hover:bg-white/15">
        Paid
      </button>
      <button disabled={busy} onClick={() => onApply({ isPaid: false })} className="rounded-full px-2.5 py-1 font-semibold hover:bg-white/15">
        Organic
      </button>
      <button disabled={busy} onClick={() => onApply({ isPaid: null })} className="rounded-full px-2.5 py-1 opacity-70 hover:bg-white/15">
        Untag
      </button>
      <button onClick={onClear} className="ml-auto rounded-full px-2.5 py-1 opacity-70 hover:bg-white/15">
        Clear selection
      </button>
    </div>
  );
}

function AuthorTable({
  authors,
  selected,
  toggle,
  toggleAll,
  canTag,
}: {
  authors: Influencer[];
  selected: Set<string>;
  toggle: (k: string) => void;
  toggleAll: () => void;
  canTag: boolean;
}) {
  const allOn = authors.length > 0 && authors.every((a) => selected.has(keyOf(a)));
  return (
    <div className="-mx-3 overflow-x-auto">
      <table className="w-full min-w-[52rem] text-sm">
        <thead>
          <tr className="border-b border-line">
            {canTag && (
              <th className={`${th} w-8`}>
                <input type="checkbox" aria-label="Select all" checked={allOn} onChange={toggleAll} className="h-4 w-4 accent-[var(--ink)]" />
              </th>
            )}
            <th className={th}>#</th>
            <th className={th}>Account</th>
            <th className={`${th} text-right`}>Followers</th>
            <th className={`${th} text-right`}>Mentions</th>
            <th className={`${th} text-right`}>Engagement</th>
            <th className={`${th} text-right`}>Reach</th>
            <th className={`${th} w-40`}>Sentiment</th>
          </tr>
        </thead>
        <tbody>
          {authors.map((a, i) => {
            const handle = a.handle.replace(/^@/, "");
            const k = keyOf(a);
            return (
              <tr key={k} className={`border-b border-line last:border-0 ${selected.has(k) ? "bg-accent-soft/50" : ""}`}>
                {canTag && (
                  <td className={td}>
                    <input
                      type="checkbox"
                      aria-label={`Select @${handle}`}
                      checked={selected.has(k)}
                      onChange={() => toggle(k)}
                      className="h-4 w-4 accent-[var(--ink)]"
                    />
                  </td>
                )}
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
                  <span className="mt-1 flex flex-wrap gap-1">
                    <Badge tone={a.typeSource === "manual" ? "accent" : "muted"}>
                      {TYPE_LABEL[a.accountType]}
                      {a.tier ? ` · ${a.tier}` : ""}
                      {a.typeSource === "manual" ? " · set by analyst" : ""}
                    </Badge>
                    {a.isPaid === true && <Badge tone="warn">Paid</Badge>}
                    {a.isPaid === false && <Badge>Organic</Badge>}
                  </span>
                </td>
                <td className={`${td} num text-right`}>{a.followers ? fmtCompact(a.followers) : "–"}</td>
                <td className={`${td} num text-right`}>{fmt(a.total)}</td>
                <td className={`${td} num text-right font-semibold`}>{fmtCompact(a.engagements)}</td>
                <td className={`${td} num text-right`}>{fmtCompact(a.reach)}</td>
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
  );
}

export default function InfluencersPage() {
  const projectId = useProjectId();
  const { filters } = useFilters();
  const { data: me } = useMe();
  const [tab, setTab] = useState<Tab>("KOL");
  const [sort, setSort] = useState<(typeof SORTS)[number][0]>("engagements");
  const [channel, setChannel] = useState<"" | Channel>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const extra = { sort, limit: 50, ...(tab !== "ALL" && { types: tab }) };
  const query = filterQuery(channel ? { ...filters, channels: [channel] } : filters, extra);
  const { data, error, isLoading, mutate } = useSWR<Influencers>(`/api/projects/${projectId}/analytics/influencers?${query}`, fetcher, {
    keepPreviousData: true,
  });
  const canTag = !!me && me.role !== "VIEWER";

  const toggle = (k: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const toggleAll = () =>
    setSelected((s) => {
      const keys = (data?.authors ?? []).map(keyOf);
      return keys.every((k) => s.has(k)) ? new Set() : new Set(keys);
    });

  async function apply(patch: { accountType?: AccountType | null; isPaid?: boolean | null }) {
    setBusy(true);
    setMessage(null);
    try {
      const accounts = [...selected].map((k) => {
        const [ch, ...rest] = k.split("|");
        return { channel: ch as Channel, handle: rest.join("|") };
      });
      const r = await apiSend<{ updated: number }>(`/api/projects/${projectId}/accounts`, "PUT", { accounts, ...patch });
      setMessage(`${r.updated} account${r.updated === 1 ? "" : "s"} updated. All their mentions follow the new label.`);
      setSelected(new Set());
      await mutate();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Influencers & sources" detail={data ? fmtPeriod(data.period) : undefined} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="-mx-1 max-w-full overflow-x-auto px-1 py-0.5">
        <Segmented
          label="Account type"
          value={tab}
          onChange={(t) => {
            setTab(t);
            setSelected(new Set());
          }}
          options={TABS}
        />
        </div>
        <Select label="Channel" hideLabel density="sm" value={channel} onChange={(e) => setChannel(e.target.value as "" | Channel)}>
          <option value="">All channels</option>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {CHANNEL_LABEL[c]}
            </option>
          ))}
        </Select>
        <Select label="Sort influencers" hideLabel density="sm" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          {SORTS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </div>

      <p className="text-xs text-muted">
        Type comes from Zanroo tags (Brand Voice = Official, influencer tiers = KOL, news sites = Media) unless an analyst set it.
        {canTag ? " Select accounts to set their type or mark them paid or organic; the label applies to all their mentions." : ""}
      </p>

      {message && <Notice>{message}</Notice>}
      {canTag && selected.size > 0 && <BulkBar count={selected.size} onApply={apply} onClear={() => setSelected(new Set())} busy={busy} />}

      {error ? (
        <Notice tone="error">Couldn&apos;t load influencers: {error.message}</Notice>
      ) : !data ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          <Panel title={TABS.find((t) => t.value === tab)!.label} aside={<SentimentLegend />}>
            <div className={isLoading ? "opacity-60" : ""}>
              {data.authors.length === 0 ? (
                <p className="text-sm text-muted">
                  No {tab === "ALL" ? "" : `${TYPE_LABEL[tab as AccountType]} `}accounts match these filters.
                  {tab === "MEDIA" ? " News sites are listed under Top sources below." : ""}
                </p>
              ) : (
                <AuthorTable authors={data.authors} selected={selected} toggle={toggle} toggleAll={toggleAll} canTag={canTag} />
              )}
            </div>
          </Panel>

          {(tab === "MEDIA" || tab === "ALL") && (
            <Panel title="Top sources" aside={<SentimentLegend />}>
              <p className="mb-3 text-sm text-muted">
                Sites and platforms, from the link on each mention. &ldquo;Online News&rdquo; is articles Zanroo collected from news
                portals: editorial coverage and paid placements are not told apart.
              </p>
              <div className="-mx-3 overflow-x-auto">
                <table className="w-full min-w-[36rem] text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th className={th}>Site or platform</th>
                      <th className={`${th} text-right`}>Mentions</th>
                      <th className={`${th} text-right`}>Engagement</th>
                      <th className={`${th} text-right`}>Reach</th>
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
                        <td className={`${td} num text-right`}>{fmtCompact(s.engagements)}</td>
                        <td className={`${td} num text-right`}>{fmtCompact(s.reach)}</td>
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
          )}
        </>
      )}
    </div>
  );
}
