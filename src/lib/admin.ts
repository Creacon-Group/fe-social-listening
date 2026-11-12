"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "./api";
import type { AccessUser, AdminProject, AdminProjectRow, KeywordRow, PermissionCatalog, Role } from "./types";

export const ROLE_LABEL: Record<Role, string> = {
  SUPERADMIN: "Superadmin",
  ADMIN: "Admin",
  ANALYST: "Analyst",
  VIEWER: "Viewer",
};

/** ADMIN and SUPERADMIN have every permission in every project; per-project settings don't apply. */
export const fullAccess = (role: Role) => role === "ADMIN" || role === "SUPERADMIN";

export const usePermissionCatalog = () => useSWR<PermissionCatalog>("/api/admin/permissions", fetcher);
export const useAdminProjects = () => useSWR<AdminProjectRow[]>("/api/admin/projects", fetcher);
export const useAdminProject = (id: number | null) => useSWR<AdminProject>(id ? `/api/admin/projects/${id}` : null, fetcher);
export const useProjectKeywords = (id: number) => useSWR<KeywordRow[]>(`/api/admin/projects/${id}/keywords`, fetcher);
export const useAccessUsers = () => useSWR<AccessUser[]>("/api/admin/users/access", fetcher);

/** After any membership/project change: refresh admin lists, the project picker and the user's own access. */
export function refreshAdmin() {
  void globalMutate((key) => typeof key === "string" && (key.startsWith("/api/admin/") || key === "/api/projects" || key.endsWith("/access")));
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
