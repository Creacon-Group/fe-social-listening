"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
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
          text: `Email terkirim ke ${r.sentTo.join(", ")}${r.withAnalysis ? "" : " (tanpa analisis AI)"}.`,
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

  const btn = "rounded-xl border border-line bg-card px-3.5 py-2 text-sm font-semibold hover:border-ink disabled:opacity-40";
  const recipients = settings?.recipients ?? [];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => run("pdf")} disabled={busy !== null} className={btn}>
          {busy === "pdf" ? "Menyiapkan PDF…" : "Export PDF"}
        </button>
        <button onClick={() => run("excel")} disabled={busy !== null} className={btn}>
          {busy === "excel" ? "Menyiapkan Excel…" : "Export Excel"}
        </button>
        {canSend && (
          <button
            onClick={() => run("email")}
            disabled={busy !== null || !recipients.length || settings?.emailConfigured === false}
            className="rounded-xl bg-ink px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-40"
            title={recipients.length ? `Kirim ke ${recipients.join(", ")}` : "Isi penerima di halaman Laporan"}
          >
            {busy === "email" ? "Mengirim email…" : "Kirim email summary"}
          </button>
        )}
      </div>
      {busy === "pdf" || busy === "email" ? (
        <p className="text-xs text-muted">Membuat grafik dan analisis AI, biasanya 20–60 detik.</p>
      ) : null}
      {!compact && canSend && settings && !recipients.length && (
        <p className="text-xs text-muted">Belum ada penerima email. Isi di pengaturan di bawah.</p>
      )}
      {compact && canSend && settings && (!recipients.length || !settings.emailConfigured) && (
        <p className="text-xs text-muted">
          {settings.emailConfigured ? "Belum ada penerima email." : "Email belum dikonfigurasi di server."}{" "}
          <Link href={`/projects/${projectId}/reports`} className="font-semibold text-ink underline">
            Atur di halaman Laporan
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
