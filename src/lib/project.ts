"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "./api";
import type { Brand, User } from "./types";

export function useProjectId() {
  return Number(useParams<{ projectId: string }>().projectId);
}

export function useBrands(projectId: number) {
  return useSWR<Brand[]>(`/api/projects/${projectId}/brands`, fetcher);
}

export function useDataAsOf(projectId: number) {
  return useSWR<{ dataAsOf: string | null; dataAsOfWib: string | null }>(
    `/api/projects/${projectId}/analytics/data-as-of`,
    fetcher,
  );
}

export function useMe() {
  return useSWR<User>("/api/auth/me", fetcher);
}

const FALLBACK = ["#e11d48", "#7c3aed", "#8b95a7", "#6c8ebf", "#c9a35b", "#9ca3af"];
export const brandColor = (b: { color?: string | null }, i = 0) => b.color ?? FALLBACK[i % FALLBACK.length];
