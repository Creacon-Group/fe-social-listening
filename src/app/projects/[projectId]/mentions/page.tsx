"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Notice, PageHeader, SentimentChip, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { filterQuery, useFilters } from "@/lib/filters";
import { CHANNEL_LABEL, fmt, fmtCompact, fmtDateTime, fmtPeriod } from "@/lib/format";
import { useBrands, useProjectId } from "@/lib/project";
import type { Mention, MentionPage } from "@/lib/types";

const PAGE_SIZE = 20;

function MentionCard({ m }: { m: Mention }) {
  return (
    <article className="rounded-3xl border border-line bg-card p-5">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold">{m.authorName ?? m.authorHandle ?? "Tanpa nama"}</span>
        {m.authorHandle && m.authorName && <span className="text-muted">@{m.authorHandle}</span>}
        {m.authorVerified && <span className="text-xs font-semibold text-violet">Terverifikasi</span>}
        {m.authorFollowers ? <span className="text-xs text-muted">{fmtCompact(m.authorFollowers)} pengikut</span> : null}
        <span className="ml-auto flex items-center gap-2">
          <SentimentChip s={m.sentimentLabel} />
        </span>
      </header>
      <p className="mt-1 text-xs text-muted">
        {CHANNEL_LABEL[m.channel]}
        {m.postType ? `, ${m.postType}` : ""}, {fmtDateTime(m.publishedAt)}
      </p>
      {m.title && <h3 className="mt-3 font-semibold">{m.title}</h3>}
      <p className="mt-2 whitespace-pre-line break-words text-[0.95rem] leading-relaxed">
        {m.content || <span className="text-muted">Tidak ada teks (mis. komentar berisi stiker).</span>}
      </p>
      <footer className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        <span className="num">{fmt(m.engagements)} engagement</span>
        {m.reach > 0 && <span className="num">{fmtCompact(m.reach)} reach</span>}
        <span className="flex flex-wrap gap-1">
          {m.brands.map((b) => (
            <span
              key={b.id}
              className={`rounded-full px-2 py-0.5 font-semibold ${b.isOwn ? "bg-ruby-soft text-ruby" : "bg-surface text-ink"}`}
            >
              {b.name}
            </span>
          ))}
        </span>
        {m.url && (
          <a href={m.url} target="_blank" rel="noreferrer noopener" className="ml-auto font-semibold text-ink hover:underline">
            Buka postingan asli
          </a>
        )}
      </footer>
    </article>
  );
}

export default function MentionsPage() {
  const projectId = useProjectId();
  const { filters } = useFilters();
  const { data: brands } = useBrands(projectId);
  const [brandId, setBrandId] = useState("");
  const [sort, setSort] = useState("latest");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const query = filterQuery(filters, { brandIds: brandId, sort, q, page, pageSize: PAGE_SIZE });
  const { data, error, isLoading } = useSWR<MentionPage>(`/api/projects/${projectId}/mentions?${query}`, fetcher, {
    keepPreviousData: true,
  });

  // Back to page 1 whenever the result set changes.
  const resetKey = filterQuery(filters, { brandIds: brandId, sort, q });
  const [lastKey, setLastKey] = useState(resetKey);
  if (lastKey !== resetKey) {
    setLastKey(resetKey);
    setPage(1);
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mentions"
        detail={data ? `${fmt(data.total)} mention, ${fmtPeriod(data.period)}` : undefined}
      />

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari kata di isi mention"
          aria-label="Cari kata di isi mention"
          className="min-w-56 flex-1 rounded-xl border border-line bg-card px-3.5 py-2 text-sm"
        />
        <select
          aria-label="Brand"
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className="rounded-xl border border-line bg-card px-3 py-2 text-sm"
        >
          <option value="">Semua brand</option>
          {(brands ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Urutkan"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-xl border border-line bg-card px-3 py-2 text-sm"
        >
          <option value="latest">Terbaru</option>
          <option value="engagements">Engagement tertinggi</option>
          <option value="reach">Reach tertinggi</option>
        </select>
      </div>

      {error ? (
        <Notice tone="error">Mentions gagal dimuat: {error.message}</Notice>
      ) : !data && isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <Notice>Tidak ada mention yang cocok. Coba longgarkan filter atau hapus kata pencarian.</Notice>
      ) : (
        <>
          <div className={`space-y-3 ${isLoading ? "opacity-60" : ""}`}>
            {data?.items.map((m) => <MentionCard key={m.id} m={m} />)}
          </div>
          <nav aria-label="Halaman" className="flex items-center justify-between text-sm">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-xl border border-line bg-card px-4 py-2 font-semibold disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <span className="num text-muted">
              Halaman {fmt(page)} dari {fmt(pages)}
            </span>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-line bg-card px-4 py-2 font-semibold disabled:opacity-40"
            >
              Berikutnya
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
