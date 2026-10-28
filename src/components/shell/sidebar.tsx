"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { apiSend, fetcher } from "@/lib/api";
import { useMe } from "@/lib/project";
import type { Project } from "@/lib/types";

type NavItem = { slug: string; label: string; keepFilters: boolean; superadminOnly?: boolean };

/** Grouped the way the project brief groups modules: monitor, analyze, AI, reports. */
export const NAV: { group: string; items: NavItem[] }[] = [
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
      { slug: "topics", label: "Topics", keepFilters: true },
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
      { slug: "categories", label: "Topic categories", keepFilters: false },
      { slug: "credits", label: "Assistant credits", keepFilters: false, superadminOnly: true },
    ],
  },
];

/** Label of the page the user is on, for the phone top bar. */
export function useCurrentPageLabel() {
  const pathname = usePathname();
  const slug = pathname.split("/")[3];
  return NAV.flatMap((g) => g.items).find((i) => i.slug === slug)?.label ?? "";
}

/** Project picker, grouped navigation and account. Shared by the desktop sidebar and the phone drawer. */
export function NavContent({ projectId, onNavigate }: { projectId: number; onNavigate?: () => void }) {
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

  return (
    <>
      <p className="px-2.5 text-[1.0625rem] font-bold tracking-[-0.02em]">Social Listening</p>

      <label className="mt-5 block px-2.5">
        <span className="t-caption mb-1 block text-muted">Project</span>
        <select
          value={projectId}
          onChange={(e) => {
            onNavigate?.();
            router.push(`/projects/${e.target.value}/overview`);
          }}
          className="min-h-10 w-full rounded-lg bg-card px-2.5 text-sm font-semibold ring-1 ring-line ring-inset"
        >
          {(projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <nav aria-label="Menu" className="mt-5 space-y-4">
        {groups.map((g) => (
          <div key={g.group}>
            <p className="t-caption mb-1 px-2.5 font-medium text-muted">{g.group}</p>
            <ul className="flex flex-col gap-0.5">
              {g.items.map((item) => {
                const href = `/projects/${projectId}/${item.slug}`;
                const active = pathname === href;
                return (
                  <li key={item.slug}>
                    <Link
                      href={item.keepFilters && query ? `${href}?${query}` : href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`pressable flex min-h-10 items-center rounded-lg px-2.5 text-sm md:min-h-9 ${
                        active ? "bg-signal font-semibold text-on-signal" : "text-ink/80 hover:bg-line/50 hover:text-ink"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-line px-2.5 pt-4 text-sm">
        <p className="font-semibold">{me?.name ?? " "}</p>
        <p className="truncate text-xs text-muted">{me?.email}</p>
        <button onClick={logout} className="mt-2 min-h-9 text-xs font-semibold text-muted hover:text-ink">
          Sign out
        </button>
      </div>
    </>
  );
}

export function Sidebar({ projectId }: { projectId: number }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-line px-3 py-6 md:flex">
      <NavContent projectId={projectId} />
    </aside>
  );
}
