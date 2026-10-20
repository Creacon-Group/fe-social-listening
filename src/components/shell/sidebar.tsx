"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { apiSend, fetcher } from "@/lib/api";
import { useMe } from "@/lib/project";
import type { Project } from "@/lib/types";

const NAV = [
  { slug: "overview", label: "Ringkasan", keepFilters: true },
  { slug: "mentions", label: "Mentions", keepFilters: true },
  { slug: "competitors", label: "Kompetitor", keepFilters: true },
  { slug: "assistant", label: "AI Assistant", keepFilters: true },
  { slug: "upload", label: "Upload data", keepFilters: false },
] as const;

export function Sidebar({ projectId }: { projectId: number }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const { data: projects } = useSWR<Project[]>("/api/projects", fetcher);
  const { data: me } = useMe();
  const query = params.toString();

  async function logout() {
    await apiSend("/api/auth/logout", "POST").catch(() => undefined);
    router.replace("/login");
  }

  return (
    <aside className="flex shrink-0 flex-col gap-4 border-line md:sticky md:top-0 md:h-screen md:w-60 md:border-r md:py-6 md:pl-5 md:pr-4">
      <div className="flex items-center gap-2 px-1 pt-4 md:pt-0">
        <span className="h-2.5 w-2.5 rounded-full bg-ruby" />
        <span className="h-2.5 w-2.5 rounded-full bg-violet" />
        <span className="ml-1 text-sm font-bold tracking-tight">Social Listening</span>
        <button onClick={logout} className="ml-auto text-xs font-semibold text-muted hover:text-ink md:hidden">
          Keluar
        </button>
      </div>

      <label className="block">
        <span className="sr-only">Project</span>
        <select
          value={projectId}
          onChange={(e) => router.push(`/projects/${e.target.value}/overview`)}
          className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold"
        >
          {(projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <nav aria-label="Menu" className="-mx-1 flex gap-1 overflow-x-auto pb-1 md:mx-0 md:flex-col md:overflow-visible md:pb-0">
        {NAV.map((item) => {
          const href = `/projects/${projectId}/${item.slug}`;
          const active = pathname === href;
          return (
            <Link
              key={item.slug}
              href={item.keepFilters && query ? `${href}?${query}` : href}
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm transition-colors ${
                active ? "bg-ink font-semibold text-white" : "text-muted hover:bg-card hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t border-line pt-4 text-sm md:block">
        <p className="font-semibold">{me?.name ?? " "}</p>
        <p className="truncate text-xs text-muted">{me?.email}</p>
        <button onClick={logout} className="mt-3 text-xs font-semibold text-muted hover:text-ink">
          Keluar
        </button>
      </div>
    </aside>
  );
}
