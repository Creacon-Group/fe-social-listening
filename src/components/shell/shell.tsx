"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Forbidden } from "@/components/forbidden";
import { Drawer, useMedia } from "@/components/overlay";
import { Skeleton } from "@/components/ui";
import { ApiError, fetcher } from "@/lib/api";
import { useBusy } from "@/lib/busy";
import { canOpen, useAccess } from "@/lib/permissions";
import { useProjectId } from "@/lib/project";
import type { Project } from "@/lib/types";
import useSWR from "swr";
import { BottomNav } from "./bottom-nav";
import { FilterBar, Status } from "./filter-bar";
import { firstAllowed, NavContent, Sidebar, useCurrentPageLabel } from "./sidebar";

function MenuIcon() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M3 5h12M3 9h12M3 13h12" />
    </svg>
  );
}

/** True once the page has scrolled, so the toolbar can show its scroll-edge shadow. */
function useScrolled(threshold = 4) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > threshold);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [threshold]);
  return scrolled;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const projectId = useProjectId();
  const pathname = usePathname();
  const pageLabel = useCurrentPageLabel();
  const slug = pathname.split("/")[3] ?? "";
  const { data: access, error: accessError } = useAccess(projectId);
  const notMember = accessError instanceof ApiError && (accessError.status === 404 || accessError.status === 403);
  const home = firstAllowed(access);
  // The project index redirects to `home`; with nothing to open it shows 403 instead.
  const denied = notMember || (!!access && (!canOpen(slug, access) || (!slug && !home)));
  const showFilters =
    !!access &&
    !denied &&
    !["/upload", "/credits", "/categories", "/settings", "/geo", "/admin-projects", "/admin-users"].some((p) => pathname.endsWith(p));
  const scrolled = useScrolled();
  const pastTitle = useScrolled(56);
  const busy = useBusy(250);
  const desktop = useMedia("(min-width: 768px)");
  const { data: projects } = useSWR<Project[]>("/api/projects", fetcher);
  const projectName = projects?.find((p) => p.id === projectId)?.name ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="mx-auto flex min-h-screen max-w-[1500px]">
      <Sidebar projectId={projectId} />

      <div className="min-w-0 flex-1">
        {/* One floating, translucent layer: phone top bar plus the filters. Content scrolls under it. */}
        <div data-scrolled={scrolled} className={`toolbar sticky top-0 z-30 px-4 pt-[env(safe-area-inset-top)] md:top-3 md:mx-5 md:mt-3 md:rounded-[22px] md:px-3 ${showFilters ? "" : "md:hidden"}`}>
          {/* Phone: one row. Menu, where you are, then period and filters. Everything else lives in the sheet. */}
          <div className="flex min-h-14 items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="-ml-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-ink"
            >
              <MenuIcon />
            </button>
            {/* Project name until the page title scrolls away, then the page name (iOS large-title pattern). */}
            <span className="t-headline min-w-0 flex-1 truncate">{pastTitle ? pageLabel : projectName}</span>
            {showFilters && !desktop && (
              <>
                <Status compact />
                <FilterBar projectId={projectId} />
              </>
            )}
          </div>
          {showFilters && desktop && (
            <div className="py-2.5">
              <FilterBar projectId={projectId} />
            </div>
          )}
        </div>

        <main data-busy={busy && showFilters} className="busy-fade space-y-5 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 md:px-8 md:pb-10 md:pt-4">
          {denied ? (
            <Forbidden
              kind={notMember ? "project" : "page"}
              homeHref={!notMember && home ? `/projects/${projectId}/${home.slug}` : undefined}
              homeLabel={home ? `Go to ${home.label}` : undefined}
            />
          ) : access ? (
            children
          ) : accessError ? (
            <p className="text-sm text-muted">Couldn&apos;t check your access. Reload the page.</p>
          ) : (
            // Pages mount only after access is known, so they never fire calls the user can't make.
            <div className="space-y-5">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-40" />
            </div>
          )}
        </main>
      </div>

      {access && !notMember && <BottomNav projectId={projectId} onMore={() => setMenuOpen(true)} />}

      <Drawer open={menuOpen} onClose={closeMenu} label="Menu">
        <div className="flex min-h-full flex-col pb-4">
          <NavContent projectId={projectId} onNavigate={closeMenu} />
        </div>
      </Drawer>
    </div>
  );
}
