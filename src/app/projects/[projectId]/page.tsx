"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { firstAllowed } from "@/components/shell/sidebar";
import { useAccess } from "@/lib/permissions";
import { useProjectId } from "@/lib/project";

/** Opens the first page this user may see in the project (Summary for most). The shell shows 403 if none. */
export default function ProjectIndex() {
  const projectId = useProjectId();
  const router = useRouter();
  const { data: access } = useAccess(projectId);

  useEffect(() => {
    if (!access) return;
    const home = firstAllowed(access);
    if (home) router.replace(`/projects/${projectId}/${home.slug}`);
  }, [access, projectId, router]);

  return null;
}
