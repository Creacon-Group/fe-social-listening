"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import type { Project } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const { data, error } = useSWR<Project[]>("/api/projects", fetcher);

  useEffect(() => {
    if (data?.length) router.replace(`/projects/${data[0].id}/overview`);
  }, [data, router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-sm text-muted">
      {error
        ? "Couldn't load your projects. Reload the page."
        : data && !data.length
          ? "Your account isn't in any project yet. Ask your admin to add you."
          : "Loading…"}
    </main>
  );
}
