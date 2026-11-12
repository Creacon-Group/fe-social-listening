"use client";

import { useState } from "react";
import { Segmented } from "@/components/segmented";
import { btnPrimary, btnQuiet } from "@/components/ui";
import { fullAccess, ROLE_LABEL, usePermissionCatalog } from "@/lib/admin";
import type { Permission } from "@/lib/permissions";
import type { Role } from "@/lib/types";

type Mode = "preset" | "custom";

/**
 * Permissions of one user in one project. "Role default" stores null so the member follows
 * their role's preset; "Custom" stores an explicit list.
 */
export function PermissionEditor({
  role,
  custom,
  permissions,
  onSave,
  onCancel,
  saveLabel = "Save permissions",
}: {
  role: Role;
  custom: boolean;
  permissions: Permission[];
  onSave: (permissions: Permission[] | null) => Promise<void>;
  onCancel?: () => void;
  saveLabel?: string;
}) {
  const { data: catalog } = usePermissionCatalog();
  const [mode, setMode] = useState<Mode>(custom ? "custom" : "preset");
  const [picked, setPicked] = useState<Set<Permission>>(new Set(permissions));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (fullAccess(role))
    return <p className="text-sm text-muted">{ROLE_LABEL[role]}s have full access to every project. Change the role to limit it.</p>;
  if (!catalog) return <p className="text-sm text-muted">Loading…</p>;

  const preset = catalog.presets[role as "ANALYST" | "VIEWER"];
  const shown = mode === "preset" ? new Set(preset) : picked;
  const groups = (["Pages", "Actions"] as const).map((g) => ({ g, items: catalog.permissions.filter((p) => p.group === g) }));

  const toggle = (key: Permission) => {
    setMode("custom");
    setPicked((prev) => {
      const base = mode === "preset" ? new Set(preset) : new Set(prev);
      if (base.has(key)) base.delete(key);
      else base.add(key);
      return base;
    });
  };
  const fill = (keys: Permission[]) => {
    setMode("custom");
    setPicked(new Set(keys));
  };

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await onSave(mode === "preset" ? null : [...picked]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const all = catalog.permissions.map((p) => p.key);
  const pagesOn = [...shown].filter((k) => catalog.permissions.find((p) => p.key === k)?.group === "Pages").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Permission mode"
          size="sm"
          value={mode}
          onChange={(m) => {
            if (m === "custom") setPicked(new Set(mode === "preset" ? preset : picked));
            setMode(m);
          }}
          options={[
            { value: "preset", label: `${ROLE_LABEL[role]} default` },
            { value: "custom", label: "Custom" },
          ]}
        />
        <span className="flex flex-wrap gap-1 text-xs">
          <span className="text-muted">Quick fill:</span>
          <button type="button" className="font-semibold underline-offset-2 hover:underline" onClick={() => fill(catalog.presets.VIEWER)}>
            Viewer
          </button>
          <span className="text-muted">·</span>
          <button type="button" className="font-semibold underline-offset-2 hover:underline" onClick={() => fill(catalog.presets.ANALYST)}>
            Analyst
          </button>
          <span className="text-muted">·</span>
          <button type="button" className="font-semibold underline-offset-2 hover:underline" onClick={() => fill(all)}>
            All
          </button>
          <span className="text-muted">·</span>
          <button type="button" className="font-semibold underline-offset-2 hover:underline" onClick={() => fill([])}>
            None
          </button>
        </span>
      </div>

      {mode === "preset" && (
        <p className="text-xs text-muted">Follows the {ROLE_LABEL[role].toLowerCase()} role. Tick or untick anything to customise it for this project.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map(({ g, items }) => (
          <fieldset key={g}>
            <legend className="t-label mb-1.5 text-muted">{g === "Pages" ? "Menus they can open" : "What they can change"}</legend>
            <ul className="space-y-0.5">
              {items.map((p) => (
                <li key={p.key}>
                  <label className="flex min-h-9 cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-surface">
                    <input
                      type="checkbox"
                      checked={shown.has(p.key)}
                      onChange={() => toggle(p.key)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--ink)]"
                    />
                    <span className={shown.has(p.key) ? "" : "text-muted"}>{p.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
      </div>

      {pagesOn === 0 && (
        <p className="text-xs text-neg">No menus selected: this user will see the 403 screen in this project.</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-neg">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={busy} className={btnPrimary}>
          {busy ? "Saving…" : saveLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={btnQuiet}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

/** Short label for a member's access, e.g. "Analyst default" or "Custom · 8 of 19". */
export function accessSummary(role: Role, custom: boolean, count: number, total: number) {
  if (fullAccess(role)) return "Full access";
  return custom ? `Custom · ${count} of ${total}` : `${ROLE_LABEL[role]} default`;
}
