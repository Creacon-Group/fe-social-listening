"use client";

import { useState } from "react";
import useSWR from "swr";
import { TrendCharts } from "@/components/trend-charts";
import { Notice, PageHeader, Panel, SentimentChip, Skeleton } from "@/components/ui";
import { apiSend, fetcher } from "@/lib/api";
import { filterBody, filterQuery, useFilters } from "@/lib/filters";
import { CHANNEL_LABEL, fmtDateTime, fmtPeriod } from "@/lib/format";
import { useMe, useProjectId } from "@/lib/project";
import type { Insight, InsightSummary, Trend } from "@/lib/types";

const ymd = (iso: string) => iso.slice(0, 10);

function InsightBody({ insight }: { insight: Insight }) {
  return (
    <article className="space-y-5">
      <div>
        <p className="text-xs text-muted">
          {fmtPeriod(insight.period)} · dibuat {fmtDateTime(insight.createdAt)}
          {insight.model ? ` · ${insight.model}` : ""}
        </p>
        <h2 className="mt-2 text-xl font-bold leading-snug tracking-tight">{insight.headline}</h2>
      </div>
      <ol className="space-y-4">
        {insight.findings.map((f, i) => (
          <li key={i} className="text-[0.95rem] leading-relaxed">
            <p className="font-semibold">
              {i + 1}. {f.title}
            </p>
            <p className="mt-1">
              {f.body}{" "}
              {f.refs.map((r) => (
                <a key={r} href={`#src-${r}`} className="font-semibold text-violet hover:underline">
                  [{r}]
                </a>
              ))}
            </p>
          </li>
        ))}
      </ol>
      {insight.sources.length > 0 && (
        <div className="border-t border-line pt-4">
          <p className="mb-2 text-xs font-semibold text-muted">Sumber</p>
          <ul className="space-y-2">
            {insight.sources.map((s) => (
              <li key={s.ref} id={`src-${s.ref}`} className="flex gap-2 text-sm">
                <span className="num font-semibold text-violet">[{s.ref}]</span>
                <span className="min-w-0">
                  <span className="text-xs text-muted">
                    {s.author ?? "–"} · {CHANNEL_LABEL[s.channel]} · {fmtDateTime(s.publishedAt)}
                  </span>{" "}
                  <SentimentChip s={s.sentiment} />
                  <span className="mt-0.5 block break-words">
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer noopener" className="hover:underline">
                        {s.text || "Buka postingan"}
                      </a>
                    ) : (
                      s.text
                    )}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted">Dibuat AI dari data yang sudah diunggah. Periksa angka penting sebelum dipakai.</p>
    </article>
  );
}

export default function InsightsPage() {
  const projectId = useProjectId();
  const { filters } = useFilters();
  const { data: me } = useMe();
  const trend = useSWR<Trend>(`/api/projects/${projectId}/analytics/trend?${filterQuery(filters)}`, fetcher, {
    keepPreviousData: true,
  });
  const listKey = `/api/projects/${projectId}/insights`;
  const list = useSWR<InsightSummary[]>(listKey, fetcher);
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const period = trend.data?.period;
  const forPeriod = period
    ? list.data?.find((i) => ymd(i.periodFrom) === period.from && ymd(i.periodTo) === period.to)
    : undefined;
  const selectedId = picked ?? forPeriod?.id ?? null;
  const detail = useSWR<Insight>(selectedId ? `${listKey}/${selectedId}` : null, fetcher);
  const canGenerate = me && me.role !== "VIEWER";

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const created = await apiSend<Insight>(listKey, "POST", { filter: filterBody(filters) });
      await list.mutate();
      setPicked(created.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="AI Insights" detail={period ? fmtPeriod(period) : undefined} />

      {canGenerate && (
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={generate} disabled={busy || !period} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            {busy ? "Menyusun insight…" : forPeriod ? "Buat ulang insight periode ini" : "Buat insight periode ini"}
          </button>
          <span className="text-xs text-muted">Pakai filter aktif. Biasanya 20–60 detik.</span>
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Insights">
          {busy ? (
            <div className="space-y-3">
              <Skeleton className="h-8" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : selectedId && detail.data ? (
            <InsightBody insight={detail.data} />
          ) : selectedId && !detail.error ? (
            <Skeleton className="h-64" />
          ) : (
            <p className="text-sm text-muted">
              Belum ada insight untuk {period ? fmtPeriod(period) : "periode ini"}.{" "}
              {canGenerate ? "Klik tombol di atas untuk membuatnya." : "Minta admin atau analyst membuatnya."}
            </p>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="Mentions dan reach">
            {trend.data ? <TrendCharts days={trend.data.days} stacked /> : <Skeleton className="h-96" />}
          </Panel>
          <Panel title="Riwayat insight">
            {!list.data?.length ? (
              <p className="text-sm text-muted">Belum ada insight.</p>
            ) : (
              <ul className="space-y-1">
                {list.data.map((i) => (
                  <li key={i.id}>
                    <button
                      onClick={() => setPicked(i.id)}
                      aria-current={selectedId === i.id ? "true" : undefined}
                      className={`w-full rounded-xl px-3 py-2 text-left text-sm ${selectedId === i.id ? "bg-ink text-white" : "hover:bg-surface"}`}
                    >
                      <span className="block truncate font-semibold">{i.headline}</span>
                      <span className={`block text-xs ${selectedId === i.id ? "text-white/70" : "text-muted"}`}>
                        {fmtPeriod({ from: ymd(i.periodFrom), to: ymd(i.periodTo) })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
