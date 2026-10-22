"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { apiSend, fetcher } from "@/lib/api";
import { useMe } from "@/lib/project";
import type { Project } from "@/lib/types";

type NavItem = { slug: string; label: string; keepFilters: boolean; superadminOnly?: boolean };

/** Grouped the way the project brief groups modules: monitor, analyze, AI, reports. */
const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Monitor",
    items: [
      { slug: "overview", label: "Summary", keepFilters: true },
      { slug: "mentions", label: "Mentions", keepFilters: true },
      { slug: "competitors", label: "Competitors", keepFilters: true },
    ],
  },
  {
    group: "Analyze",
    items: [
      { slug: "demographics", label: "Demographics", keepFilters: true },
      { slug: "influencers", label: "Influencers & sources", keepFilters: true },
      { slug: "hashtags", label: "Hashtags", keepFilters: true },
    ],
  },
  {
    group: "AI",
    items: [
      { slug: "insights", label: "Insights", keepFilters: true },
      { slug: "assistant", label: "Brand assistant", keepFilters: true },
    ],
  },
  {
    group: "Reports",
    items: [{ slug: "reports", label: "Export & email", keepFilters: true }],
  },
  {
    group: "Manage",
    items: [
      { slug: "upload", label: "Upload data", keepFilters: false },
      { slug: "credits", label: "Assistant credits", keepFilters: false, superadminOnly: true },
    ],
  },
];

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

  const groups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.superadminOnly || me?.role === "SUPERADMIN"),
  })).filter((g) => g.items.length);

  const link = (item: NavItem) => {
    const href = `/projects/${projectId}/${item.slug}`;
    const active = pathname === href;
    return (
      <Link
        key={item.slug}
        href={item.keepFilters && query ? `${href}?${query}` : href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-9 items-center whitespace-nowrap rounded-md px-2.5 text-sm ${
          active ? "bg-signal font-semibold text-ink" : "text-muted hover:bg-card hover:text-ink"
        }`}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="flex shrink-0 flex-col gap-4 md:sticky md:top-0 md:h-screen md:w-56 md:overflow-y-auto md:border-r md:border-line md:py-6 md:pl-5 md:pr-4">
      <div className="flex items-center gap-2 pt-4 md:pt-0">
        <span className="wide text-[1.05rem] font-extrabold leading-none">Social Listening</span>
        <button onClick={logout} className="ml-auto min-h-9 text-xs font-semibold text-muted hover:text-ink md:hidden">
          Sign out
        </button>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs text-muted">Project</span>
        <select
          value={projectId}
          onChange={(e) => router.push(`/projects/${e.target.value}/overview`)}
          className="min-h-10 w-full rounded-md border border-line bg-card px-2.5 text-sm font-semibold"
        >
          {(projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      {/* Phones: one scrollable row. Desktop: grouped column. */}
      <nav aria-label="Menu" className="-mx-1 flex gap-1 overflow-x-auto pb-1 md:hidden">
        {groups.flatMap((g) => g.items).map(link)}
      </nav>
      <nav aria-label="Menu" className="hidden space-y-4 md:block">
        {groups.map((g) => (
          <div key={g.group}>
            <p className="mb-1 px-2.5 text-xs text-muted">{g.group}</p>
            <div className="flex flex-col gap-0.5">{g.items.map(link)}</div>
          </div>
        ))}
      </nav>

      <div className="mt-auto hidden border-t border-line pt-4 text-sm md:block">
        <p className="font-semibold">{me?.name ?? " "}</p>
        <p className="truncate text-xs text-muted">{me?.email}</p>
        <button onClick={logout} className="mt-2 min-h-9 text-xs font-semibold text-muted hover:text-ink">
          Sign out
        </button>
      </div>
    </aside>
  );
}
