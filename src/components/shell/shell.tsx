"use client";

import { usePathname } from "next/navigation";
import { useProjectId } from "@/lib/project";
import { FilterBar } from "./filter-bar";
import { Sidebar } from "./sidebar";

export function Shell({ children }: { children: React.ReactNode }) {
  const projectId = useProjectId();
  const pathname = usePathname();
  const showFilters = !pathname.endsWith("/upload") && !pathname.endsWith("/credits");

  return (
    <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col px-4 md:flex-row md:px-0">
      <Sidebar projectId={projectId} />
      <main className="min-w-0 flex-1 space-y-5 py-5 md:px-8 md:py-6">
        {showFilters && (
          <div className="z-20 -mx-1 bg-surface/90 px-1 py-1 backdrop-blur md:sticky md:top-0">
            <FilterBar projectId={projectId} />
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
