"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Select } from "@/components/select";
import { BetaChip } from "@/components/ui";
import { apiSend, fetcher } from "@/lib/api";
import { type Access, canOpen, useAccess } from "@/lib/permissions";
import { useMe } from "@/lib/project";
import type { Project } from "@/lib/types";

/** Who sees an item is decided by PAGE_PERMISSION in lib/permissions. */
type NavItem = { slug: string; label: string; keepFilters: boolean; beta?: boolean };

/**
 * Order follows how clients read the dashboard: quick stats first (Summary, then AI Insights),
 * then where (channels), what (topics, campaigns) and versus whom (competitive insights).
 */
export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Overview",
    items: [
      { slug: "overview", label: "Summary", keepFilters: true },
      { slug: "insights", label: "AI insights", keepFilters: true },
    ],
  },
  {
    group: "Analyze",
    items: [
      { slug: "channels", label: "Channel analysis", keepFilters: true },
      { slug: "topics", label: "Topics & tagging", keepFilters: true },
      { slug: "competitors", label: "Competitive insights", keepFilters: true },
      { slug: "influencers", label: "Influencers & sources", keepFilters: true },
      { slug: "demographics", label: "Audience & timing", keepFilters: true },
      { slug: "hashtags", label: "Hashtags & keywords", keepFilters: true },
      { slug: "mentions", label: "Mentions", keepFilters: true },
    ],
  },
  {
    group: "AI",
    items: [
      { slug: "geo", label: "AI visibility", keepFilters: false, beta: true },
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
      { slug: "settings", label: "Project settings", keepFilters: false },
    ],
  },
  {
    group: "Admin",
    items: [
      { slug: "admin-projects", label: "Projects & access", keepFilters: false },
      { slug: "admin-users", label: "Users & roles", keepFilters: false },
      { slug: "credits", label: "Assistant credits", keepFilters: false },
    ],
  },
];

/** Menu groups this user may open, in display order. */
export function visibleNav(access: Access | undefined) {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => canOpen(i.slug, access)) })).filter((g) => g.items.length);
}

/** First page this user may open in the project (for redirects and the 403 screen). */
export function firstAllowed(access: Access | undefined) {
  return visibleNav(access)[0]?.items[0];
}

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
  const { data: access } = useAccess(projectId);
  const query = params.toString();

  async function logout() {
    await apiSend("/api/auth/logout", "POST").catch(() => undefined);
    router.replace("/login");
  }

  // Menus the user has no permission for are hidden; the backend still enforces every call.
  const groups = visibleNav(access);

  return (
    <>
      <div className="flex items-center gap-2.5 px-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- 7 KB static mark */}
        <img src="/creacon-mark.png" alt="" width={28} height={28} className="h-7 w-7" />
        <span className="leading-tight">
          <span className="block text-[1.0625rem] font-bold tracking-[-0.02em]">Social Listening</span>
          <span className="t-caption block text-muted">by Creacon</span>
        </span>
      </div>

      {/* Picker only when the user can see more than one project; otherwise a static label. */}
      <div className="mt-5 px-2.5">
        {projects && projects.length > 1 ? (
          <Select
            label="Project"
            value={projectId}
            onChange={(e) => {
              // Same page in the other project; filters are dropped because brands differ per project.
              // A page they can't open there shows the 403 screen with a way out.
              const slug = pathname.split("/")[3] ?? "overview";
              onNavigate?.();
              router.push(`/projects/${e.target.value}/${slug}`);
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        ) : (
          <>
            <span className="t-caption mb-1 block text-muted">Project</span>
            <p className="flex min-h-10 items-center truncate rounded-lg bg-card px-3 text-sm font-semibold text-ink ring-1 ring-line ring-inset">
              {projects?.find((p) => p.id === projectId)?.name ?? "\u00a0"}
            </p>
          </>
        )}
      </div>

      <nav aria-label="Menu" className="mt-5 space-y-4">
        {groups.map((g) => (
          <div key={g.group}>
            <p className="t-label mb-1.5 px-2.5 text-muted">{g.group}</p>
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
                      className={`pressable flex min-h-10 items-center rounded-full px-3 text-sm md:min-h-9 ${
                        active ? "bg-accent-soft font-semibold text-accent" : "text-ink/80 hover:bg-white/50 hover:text-ink dark:hover:bg-white/5"
                      }`}
                    >
                      {item.label}
                      {item.beta && <BetaChip className="ml-2" />}
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
    <aside className="glass sticky top-3 m-3 mr-0 hidden h-[calc(100vh-1.5rem)] w-60 shrink-0 flex-col overflow-y-auto rounded-[22px] px-3 py-6 md:flex">
      <NavContent projectId={projectId} />
    </aside>
  );
}
