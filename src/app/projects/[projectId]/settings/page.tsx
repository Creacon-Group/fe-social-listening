"use client";

import { useState } from "react";
import { Notice, PageHeader, Panel, Skeleton } from "@/components/ui";
import { apiSend } from "@/lib/api";
import { useMe, useProjectId, useSettings } from "@/lib/project";
import type { ProjectSettings } from "@/lib/types";

function Choice({
  name,
  checked,
  onChange,
  disabled,
  title,
  detail,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  title: string;
  detail: string;
}) {
  return (
    <label className={`flex gap-3 rounded-xl p-3 ring-1 ring-inset ${checked ? "ring-ink" : "ring-line"} ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} disabled={disabled} className="mt-1 accent-[var(--ink)]" />
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-sm text-muted">{detail}</span>
      </span>
    </label>
  );
}

export default function SettingsPage() {
  const projectId = useProjectId();
  const { data: me } = useMe();
  const { data, mutate } = useSettings(projectId);
  const [error, setError] = useState<string | null>(null);
  const canEdit = me?.role === "ADMIN" || me?.role === "SUPERADMIN";

  async function save(patch: Partial<ProjectSettings>) {
    setError(null);
    try {
      await mutate(apiSend<ProjectSettings>(`/api/projects/${projectId}/settings`, "PUT", patch), {
        optimisticData: data ? { ...data, ...patch } : undefined,
        rollbackOnError: true,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Project settings" />
      {!canEdit && me && <Notice>Only admins can change these settings.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {!data ? (
        <Skeleton className="h-64" />
      ) : (
        <Panel title="Net Sentiment">
          <p className="mb-4 text-sm text-muted">
            Clients count Net Sentiment differently. The choice applies to every page, export and AI answer for this project.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <Choice
              name="nss"
              checked={data.nssIncludeNeutral}
              onChange={() => save({ nssIncludeNeutral: true })}
              disabled={!canEdit}
              title="Include neutral mentions"
              detail="(positive − negative) ÷ all mentions × 100. Lower and steadier when most talk is neutral."
            />
            <Choice
              name="nss"
              checked={!data.nssIncludeNeutral}
              onChange={() => save({ nssIncludeNeutral: false })}
              disabled={!canEdit}
              title="Positive and negative only"
              detail="(positive − negative) ÷ (positive + negative) × 100. Neutral mentions are left out."
            />
          </div>
          <label className={`mt-5 flex items-center gap-3 text-sm ${canEdit ? "cursor-pointer" : "opacity-60"}`}>
            <input
              type="checkbox"
              checked={data.showNss}
              disabled={!canEdit}
              onChange={(e) => save({ showNss: e.target.checked })}
              className="h-4 w-4 accent-[var(--ink)]"
            />
            Show Net Sentiment on the Summary page
          </label>
        </Panel>
      )}
    </div>
  );
}
