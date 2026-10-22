"use client";

import { useState } from "react";
import useSWR from "swr";
import { ReportActions } from "@/components/report-actions";
import { btnPrimary, inputBase, Notice, PageHeader, Panel, Skeleton } from "@/components/ui";
import { apiSend, fetcher } from "@/lib/api";
import { useFilters } from "@/lib/filters";
import { fmtPeriod } from "@/lib/format";
import { useMe, useProjectId } from "@/lib/project";
import type { ReportSettings } from "@/lib/types";

const monthLabel = (ym: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${ym}-01T00:00:00Z`));

function SettingsForm({ projectId, settings, canEdit }: { projectId: number; settings: ReportSettings; canEdit: boolean }) {
  const { mutate } = useSWR<ReportSettings>(`/api/projects/${projectId}/reports/settings`);
  const [clientName, setClientName] = useState(settings.clientName ?? "");
  const [recipients, setRecipients] = useState(settings.recipients.join("\n"));
  const [monthlyEnabled, setMonthlyEnabled] = useState(settings.monthlyEnabled);
  const [monthlyDay, setMonthlyDay] = useState(settings.monthlyDay);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const saved = await apiSend<ReportSettings>(`/api/projects/${projectId}/reports/settings`, "PUT", {
        clientName: clientName.trim() || null,
        recipients: recipients.split(/[\s,;]+/).filter(Boolean),
        monthlyEnabled,
        monthlyDay,
      });
      await mutate(saved, { revalidate: false });
      setRecipients(saved.recipients.join("\n"));
      setMsg({ tone: "ok", text: "Settings saved." });
    } catch (err) {
      setMsg({ tone: "err", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Client name in the email title</span>
        <input
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          maxLength={200}
          disabled={!canEdit}
          placeholder="Uses the project name when empty"
          className={`${inputBase} w-full`}
        />
        <span className="mt-1.5 block text-xs text-muted">
          Title: Summary Report Social Listening {clientName || "[client name]"} - [date range]
        </span>
      </label>
      <label className="block lg:row-span-2">
        <span className="mb-1 block text-sm font-semibold">Recipients</span>
        <textarea
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
          rows={5}
          disabled={!canEdit}
          placeholder={"One address per line\nbrand@client.com"}
          className={`${inputBase} w-full resize-y`}
        />
        <span className="mt-1.5 block text-xs text-muted">Used for the email button and the monthly report.</span>
      </label>
      <fieldset className="rounded-[10px] border border-line p-4">
        <legend className="px-1 text-sm font-semibold">Monthly report</legend>
        <label className="flex min-h-9 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={monthlyEnabled}
            onChange={(e) => setMonthlyEnabled(e.target.checked)}
            disabled={!canEdit}
            className="h-4 w-4 accent-[var(--ink)]"
          />
          Email last month&apos;s report every month
        </label>
        <label className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          Send on day
          <select
            value={monthlyDay}
            onChange={(e) => setMonthlyDay(Number(e.target.value))}
            disabled={!canEdit || !monthlyEnabled}
            className={`${inputBase} min-h-9 py-1`}
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          of the month, at 08:00 WIB
        </label>
        <p className="mt-3 text-xs text-muted">
          The report covers one full calendar month. If that month&apos;s data isn&apos;t uploaded yet, it tries again the next
          day.
          {settings.lastMonthlyReport ? ` Last sent: ${monthLabel(settings.lastMonthlyReport)}.` : ""}
        </p>
      </fieldset>
      {canEdit ? (
        <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? "Saving…" : "Save settings"}
          </button>
          {msg && (
            <p role={msg.tone === "err" ? "alert" : "status"} className={`text-sm ${msg.tone === "err" ? "text-neg" : "text-pos"}`}>
              {msg.text}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted lg:col-span-2">Only admins can change these settings.</p>
      )}
    </form>
  );
}

export default function ReportsPage() {
  const projectId = useProjectId();
  const { data: me } = useMe();
  const { filters } = useFilters();
  const { data: settings, error } = useSWR<ReportSettings>(`/api/projects/${projectId}/reports/settings`, fetcher);
  const canEdit = me?.role === "ADMIN" || me?.role === "SUPERADMIN";
  const custom = filters.range === "custom" && filters.from && filters.to;

  return (
    <div className="space-y-5">
      <PageHeader title="Export & email" detail="Share the numbers for the period and filters above" />

      <Panel title="Export or send now">
        <p className="mb-4 max-w-[70ch] text-sm text-muted">
          {custom ? `Covers ${fmtPeriod({ from: filters.from!, to: filters.to! })} with the filters above. ` : "Covers the period and filters above. "}
          The PDF and email hold the charts, headline numbers, brand comparison and the AI analysis. The Excel file holds every
          number by section plus the raw mentions.
        </p>
        <ReportActions projectId={projectId} />
      </Panel>

      <Panel title="Email settings">
        {error ? (
          <Notice tone="error">Couldn&apos;t load email settings: {error.message}</Notice>
        ) : !settings ? (
          <Skeleton className="h-48" />
        ) : (
          <>
            {!settings.emailConfigured && (
              <div className="mb-4">
                <Notice>Email isn&apos;t set up on the server yet (SMTP). The email button works once the SMTP details are added.</Notice>
              </div>
            )}
            <SettingsForm projectId={projectId} settings={settings} canEdit={canEdit} />
          </>
        )}
      </Panel>
    </div>
  );
}
