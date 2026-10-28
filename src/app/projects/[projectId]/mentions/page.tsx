"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { MentionCard } from "@/components/mention-card";
import { Notice, PageHeader, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { filterQuery, useFilters } from "@/lib/filters";
import { fmt, fmtPeriod } from "@/lib/format";
import { useBrands, useProjectId } from "@/lib/project";
import type { MentionPage } from "@/lib/types";

const PAGE_SIZE = 20;

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
        detail={data ? `${fmt(data.total)} mentions, ${fmtPeriod(data.period)}` : undefined}
      />

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search mention text"
          aria-label="Search mention text"
          className="min-h-10 min-w-56 flex-1 rounded-lg bg-card ring-1 ring-line ring-inset px-3 text-sm outline-none focus:ring-2 focus:ring-ink"
        />
        <select
          aria-label="Brand"
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className="min-h-10 rounded-lg bg-card ring-1 ring-line ring-inset px-2.5 text-sm"
        >
          <option value="">All brands</option>
          {(brands ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="min-h-10 rounded-lg bg-card ring-1 ring-line ring-inset px-2.5 text-sm"
        >
          <option value="latest">Newest</option>
          <option value="engagements">Most engagement</option>
          <option value="reach">Most reach</option>
        </select>
      </div>

      {error ? (
        <Notice tone="error">Couldn&apos;t load mentions: {error.message}</Notice>
      ) : !data && isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <Notice>No mentions match. Widen the filters or clear the search.</Notice>
      ) : (
        <>
          <div className={`space-y-3 ${isLoading ? "opacity-60" : ""}`}>
            {data?.items.map((m) => <MentionCard key={m.id} m={m} />)}
          </div>
          <nav aria-label="Pages" className="flex items-center justify-between text-sm">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="min-h-10 rounded-lg bg-card ring-1 ring-line ring-inset px-4 font-semibold hover:ring-ink/40 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="num text-muted">
              Page {fmt(page)} of {fmt(pages)}
            </span>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="min-h-10 rounded-lg bg-card ring-1 ring-line ring-inset px-4 font-semibold hover:ring-ink/40 disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
