"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { btnPrimary, btnQuiet } from "@/components/ui";
import { apiSend, fetcher } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import { filterBody, filterQuery, useFilters } from "@/lib/filters";
import { useMe } from "@/lib/project";
import type { ReportSettings } from "@/lib/types";

type Busy = "pdf" | "excel" | "email" | null;

/** Export PDF / Excel and send the summary e-mail for the active filter. */
export function ReportActions({ projectId, compact = false }: { projectId: number; compact?: boolean }) {
  const { filters } = useFilters();
  const { data: me } = useMe();
  const { data: settings } = useSWR<ReportSettings>(`/api/projects/${projectId}/reports/settings`, fetcher);
  const [busy, setBusy] = useState<Busy>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const canSend = me && me.role !== "VIEWER";
  const q = filterQuery(filters);

  async function run(kind: Exclude<Busy, null>) {
    setBusy(kind);
    setMsg(null);
    try {
      if (kind === "email") {
        const r = await apiSend<{ sentTo: string[]; withAnalysis: boolean }>(
          `/api/projects/${projectId}/reports/email`,
          "POST",
          { filter: filterBody(filters) },
        );
        setMsg({
          tone: "ok",
          text: `Summary sent to ${r.sentTo.join(", ")}${r.withAnalysis ? "" : " (without the AI analysis)"}.`,
        });
      } else {
        await downloadFile(
          `/api/projects/${projectId}/reports/${kind}?${q}`,
          kind === "pdf" ? "summary-report.pdf" : "summary-report.xlsx",
        );
      }
    } catch (e) {
      setMsg({ tone: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const recipients = settings?.recipients ?? [];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => run("pdf")} disabled={busy !== null} className={btnQuiet}>
          {busy === "pdf" ? "Building PDF…" : "Export PDF"}
        </button>
        <button onClick={() => run("excel")} disabled={busy !== null} className={btnQuiet}>
          {busy === "excel" ? "Building Excel…" : "Export Excel"}
        </button>
        {canSend && (
          <button
            onClick={() => run("email")}
            disabled={busy !== null || !recipients.length || settings?.emailConfigured === false}
            className={btnPrimary}
            title={recipients.length ? `Send to ${recipients.join(", ")}` : "Add recipients on the Export & email page"}
          >
            {busy === "email" ? "Sending…" : "Email summary"}
          </button>
        )}
      </div>
      {busy === "pdf" || busy === "email" ? (
        <p className="text-xs text-muted">Drawing charts and writing the analysis. This usually takes 20 to 60 seconds.</p>
      ) : null}
      {!compact && canSend && settings && !recipients.length && (
        <p className="text-xs text-muted">No recipients yet. Add them in the settings below.</p>
      )}
      {compact && canSend && settings && (!recipients.length || !settings.emailConfigured) && (
        <p className="text-xs text-muted">
          {settings.emailConfigured ? "No email recipients yet." : "Email isn't set up on the server yet."}{" "}
          <Link href={`/projects/${projectId}/reports`} className="font-semibold text-ink underline">
            Set up email
          </Link>
        </p>
      )}
      {msg && (
        <p role={msg.tone === "err" ? "alert" : "status"} className={`text-sm ${msg.tone === "err" ? "text-neg" : "text-pos"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
