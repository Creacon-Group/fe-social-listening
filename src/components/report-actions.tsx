"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Sheet, useMedia } from "@/components/overlay";
import useSWR from "swr";
import { btnPrimary, btnQuiet } from "@/components/ui";
import { apiSend, fetcher } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import { filterBody, filterQuery, periodFor, useFilters } from "@/lib/filters";
import { fmtPeriod } from "@/lib/format";
import { useDataAsOf, useMe } from "@/lib/project";
import type { ReportSettings } from "@/lib/types";

type Busy = "pdf" | "excel" | "email" | null;

/** Export PDF / Excel and send the summary e-mail for the active filter. */
export function ReportActions({
  projectId,
  compact = false,
}: {
  projectId: number;
  compact?: boolean;
}) {
  const { filters } = useFilters();
  const { data: me } = useMe();
  const { data: settings } = useSWR<ReportSettings>(
    `/api/projects/${projectId}/reports/settings`,
    fetcher,
  );
  const [busy, setBusy] = useState<Busy>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(
    null,
  );
  const [confirming, setConfirming] = useState(false);
  const closeConfirm = useCallback(() => setConfirming(false), []);
  const [menu, setMenu] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []);
  const phone = !useMedia("(min-width: 768px)");
  const { data: asOf } = useDataAsOf(projectId);
  const period = periodFor(filters, asOf?.dataAsOfWib);
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
      {compact && phone ? (
        // Phones: one button; the three choices live one level deeper in an action sheet.
        <>
          <button
            onClick={() => setMenu(true)}
            disabled={busy !== null}
            className={btnQuiet}
          >
            {busy === "pdf"
              ? "Building PDF…"
              : busy === "excel"
                ? "Building Excel…"
                : busy === "email"
                  ? "Sending…"
                  : "Export & share"}
          </button>
          <Sheet open={menu} onClose={closeMenu} title="Export & share">
            <div className="grid gap-2 pb-2">
              <button
                data-autofocus
                onClick={() => {
                  setMenu(false);
                  void run("pdf");
                }}
                className={btnQuiet}
              >
                Export PDF
              </button>
              <button
                onClick={() => {
                  setMenu(false);
                  void run("excel");
                }}
                className={btnQuiet}
              >
                Export Excel
              </button>
              {canSend && (
                <button
                  onClick={() => {
                    setMenu(false);
                    setConfirming(true);
                  }}
                  disabled={
                    !recipients.length || settings?.emailConfigured === false
                  }
                  className={btnPrimary}
                >
                  Email summary…
                </button>
              )}
            </div>
          </Sheet>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => run("pdf")}
            disabled={busy !== null}
            className={btnQuiet}
          >
            {busy === "pdf" ? "Building PDF…" : "Export PDF"}
          </button>
          <button
            onClick={() => run("excel")}
            disabled={busy !== null}
            className={btnQuiet}
          >
            {busy === "excel" ? "Building Excel…" : "Export Excel"}
          </button>
          {canSend && (
            <button
              onClick={() => setConfirming(true)}
              disabled={
                busy !== null ||
                !recipients.length ||
                settings?.emailConfigured === false
              }
              className={btnPrimary}
              title={
                recipients.length
                  ? `Send to ${recipients.join(", ")}`
                  : "Add recipients on the Export & email page"
              }
            >
              {busy === "email" ? "Sending…" : "Email summary…"}
            </button>
          )}
        </div>
      )}
      {busy === "pdf" || busy === "email" ? (
        <p className="text-xs text-muted">
          Drawing charts and writing the analysis. This usually takes 20 to 60
          seconds.
        </p>
      ) : null}
      {!compact && canSend && settings && !recipients.length && (
        <p className="text-xs text-muted">
          No recipients yet. Add them in the settings below.
        </p>
      )}
      {compact &&
        canSend &&
        settings &&
        (!recipients.length || !settings.emailConfigured) && (
          <p className="text-xs text-muted">
            {settings.emailConfigured
              ? "No email recipients yet."
              : "Email isn't set up on the server yet."}{" "}
            <Link
              href={`/projects/${projectId}/reports`}
              className="font-semibold text-ink underline"
            >
              Set up email
            </Link>
          </p>
        )}
      {/* Sending reaches the client's inbox and cannot be taken back, so show who gets it first. */}
      <Sheet
        open={confirming}
        onClose={closeConfirm}
        title="Send the summary email?"
        footer={
          <>
            <button type="button" onClick={closeConfirm} className={btnQuiet}>
              Cancel
            </button>
            <button
              type="button"
              data-autofocus
              onClick={() => {
                setConfirming(false);
                void run("email");
              }}
              className={btnPrimary}
            >
              Send to {recipients.length}{" "}
              {recipients.length === 1 ? "person" : "people"}
            </button>
          </>
        }
      >
        <p className="text-sm text-muted">
          The report covers <span className="font-semibold text-ink">{period ? fmtPeriod(period) : "the selected period"}</span>
          {filters.channels.length || filters.sentiments.length ? " with your filters" : ""}, and includes the AI analysis and a PDF.
        </p>
        <ul className="mt-3 divide-y divide-line rounded-lg bg-card text-sm ring-1 ring-line ring-inset">
          {recipients.map((r) => (
            <li key={r} className="truncate px-3 py-2">
              {r}
            </li>
          ))}
        </ul>
      </Sheet>
      {msg && (
        <p
          role={msg.tone === "err" ? "alert" : "status"}
          className={`text-sm ${msg.tone === "err" ? "text-neg" : "text-pos"}`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
