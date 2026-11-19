"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { canOpen, useAccess } from "@/lib/permissions";

/** The four pages people open most on a phone. Everything else stays one tap away under "More". */
const TABS: { slug: string; label: string; icon: React.ReactNode }[] = [
  {
    slug: "overview",
    label: "Summary",
    icon: <path d="M3 10.5 10 4l7 6.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1z" />,
  },
  {
    slug: "mentions",
    label: "Mentions",
    icon: <path d="M4 4.5h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z" />,
  },
  {
    slug: "competitors",
    label: "Competitors",
    icon: <path d="M4 16V9m4 7V5m4 11v-5m4 5V7" />,
  },
  {
    slug: "assistant",
    label: "Assistant",
    icon: <path d="M10 3.5l1.6 3.9 3.9 1.6-3.9 1.6L10 14.5l-1.6-3.9L4.5 9l3.9-1.6zM15.5 13.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z" />,
  },
];

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg aria-hidden width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

/** Phone tab bar. Keeps the current filters when switching tabs, like the menu does. */
export function BottomNav({ projectId, onMore }: { projectId: number; onMore: () => void }) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const { data: access } = useAccess(projectId);
  const tabs = TABS.filter((t) => canOpen(t.slug, access));
  const onTab = tabs.some((t) => pathname === `/projects/${projectId}/${t.slug}`);
  const item = "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-semibold";

  return (
    <nav
      aria-label="Main"
      className="toolbar fixed inset-x-0 bottom-0 z-30 flex border-t border-line px-1 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {tabs.map((t) => {
        const href = `/projects/${projectId}/${t.slug}`;
        const active = pathname === href;
        return (
          <Link
            key={t.slug}
            href={query ? `${href}?${query}` : href}
            aria-current={active ? "page" : undefined}
            className={`${item} ${active ? "text-accent" : "text-muted"}`}
          >
            <Icon>{t.icon}</Icon>
            {t.label}
          </Link>
        );
      })}
      <button type="button" onClick={onMore} className={`${item} ${onTab ? "text-muted" : "text-accent"}`}>
        <Icon>
          <path d="M4.5 10h.01M10 10h.01M15.5 10h.01" strokeWidth="2.6" />
        </Icon>
        More
      </button>
    </nav>
  );
}
