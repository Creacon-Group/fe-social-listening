"use client";

import useSWR from "swr";
import { fetcher } from "./api";
import type { Role } from "./types";

/** Keep in sync with be-social-listening/src/common/permissions.ts. The backend enforces; this only hides. */
export type Permission =
  | "overview.view"
  | "insights.view"
  | "channels.view"
  | "topics.view"
  | "competitors.view"
  | "influencers.view"
  | "demographics.view"
  | "hashtags.view"
  | "mentions.view"
  | "geo.view"
  | "assistant.use"
  | "reports.export"
  | "insights.generate"
  | "accounts.tag"
  | "geo.manage"
  | "reports.email"
  | "data.upload"
  | "categories.manage"
  | "settings.manage";

/**
 * Menu slug → permissions that open it (any of). Slugs not listed are open to every member.
 * "superadmin" pages are checked by role instead.
 */
export const PAGE_PERMISSION: Record<string, Permission[] | "superadmin"> = {
  overview: ["overview.view"],
  insights: ["insights.view"],
  channels: ["channels.view"],
  topics: ["topics.view"],
  competitors: ["competitors.view"],
  influencers: ["influencers.view"],
  demographics: ["demographics.view"],
  hashtags: ["hashtags.view"],
  mentions: ["mentions.view"],
  geo: ["geo.view"],
  assistant: ["assistant.use"],
  reports: ["reports.export", "reports.email", "settings.manage"],
  upload: ["data.upload"],
  categories: ["categories.manage"],
  settings: ["settings.manage"],
  credits: "superadmin",
  "admin-projects": "superadmin",
  "admin-users": "superadmin",
};

export interface Access {
  role: Role;
  permissions: Permission[];
}

/** GET /projects/:id/access. A 404 means the user isn't in this project. */
export function useAccess(projectId: number) {
  const swr = useSWR<Access>(Number.isInteger(projectId) ? `/api/projects/${projectId}/access` : null, fetcher, {
    revalidateOnFocus: true,
  });
  const granted = new Set(swr.data?.permissions ?? []);
  const can = (...anyOf: Permission[]) => anyOf.some((p) => granted.has(p));
  return { ...swr, can };
}

/** Whether a menu slug is open for this access. */
export function canOpen(slug: string, access: Access | undefined) {
  const rule = PAGE_PERMISSION[slug];
  if (!rule) return true;
  if (!access) return false;
  if (rule === "superadmin") return access.role === "SUPERADMIN";
  return rule.some((p) => access.permissions.includes(p));
}
