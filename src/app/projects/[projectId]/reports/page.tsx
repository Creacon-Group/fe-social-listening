"use client";

import { useState } from "react";
import useSWR from "swr";
import { ReportActions } from "@/components/report-actions";
import { Notice, PageHeader, Panel, Skeleton } from "@/components/ui";
import { apiSend, fetcher } from "@/lib/api";
import { useFilters } from "@/lib/filters";
import { useMe, useProjectId } from "@/lib/project";
import type { ReportSettings } from "@/lib/types";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const field = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ruby disabled:opacity-60";

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
      setMsg({ tone: "ok", text: "Pengaturan disimpan." });
    } catch (err) {
      setMsg({ tone: "err", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-4 lg:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Nama klien di judul email</span>
        <input value={clientName} onChange={(e) => setClientName(e.target.value)} maxLength={200} disabled={!canEdit} placeholder="Nama project dipakai jika kosong" className={field} />
        <span className="mt-1 block text-xs text-muted">Judul: Summary Report Social Listening {clientName || "{Nama klien}"} - {"{Rentang tanggal}"}</span>
      </label>
      <label className="block lg:row-span-2">
        <span className="mb-1 block text-sm font-medium">Penerima email</span>
        <textarea value={recipients} onChange={(e) => setRecipients(e.target.value)} rows={5} disabled={!canEdit} placeholder={"satu email per baris\nbrand@klien.com"} className={`${field} resize-y`} />
        <span className="mt-1 block text-xs text-muted">Dipakai untuk kirim manual dan laporan bulanan.</span>
      </label>
      <fieldset className="rounded-2xl border border-line p-4">
        <legend className="px-1 text-sm font-medium">Laporan bulanan otomatis</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={monthlyEnabled} onChange={(e) => setMonthlyEnabled(e.target.checked)} disabled={!canEdit} className="h-4 w-4 accent-[var(--ruby)]" />
          Kirim laporan bulan sebelumnya setiap bulan
        </label>
        <label className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          Dikirim tanggal
          <select value={monthlyDay} onChange={(e) => setMonthlyDay(Number(e.target.value))} disabled={!canEdit || !monthlyEnabled} className="rounded-xl border border-line bg-surface px-2 py-1.5 text-sm disabled:opacity-60">
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          setiap bulan, pukul 08.00 WIB
        </label>
        <p className="mt-2 text-xs text-muted">
          Laporan berisi data satu bulan kalender penuh. Kalau data bulan itu belum diunggah, sistem mencoba lagi keesokan harinya.
          {settings.lastMonthlyReport ? ` Terakhir terkirim: ${monthLabel(settings.lastMonthlyReport)}.` : ""}
        </p>
      </fieldset>
      {canEdit ? (
        <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
          <button type="submit" disabled={busy} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            {busy ? "Menyimpan…" : "Simpan pengaturan"}
          </button>
          {msg && (
            <p role={msg.tone === "err" ? "alert" : "status"} className={`text-sm ${msg.tone === "err" ? "text-neg" : "text-pos"}`}>
              {msg.text}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted lg:col-span-2">Hanya admin yang bisa mengubah pengaturan ini.</p>
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

  return (
    <div className="space-y-5">
      <PageHeader title="Laporan" detail="Export dan email summary untuk filter aktif" />

      <Panel title="Export & kirim">
        <p className="mb-4 text-sm text-muted">
          Memakai rentang tanggal dan filter di atas
          {filters.range === "custom" && filters.from && filters.to ? ` (${filters.from} s.d. ${filters.to})` : ""}. PDF dan email
          berisi grafik, ringkasan angka, perbandingan brand, dan analisis AI. Excel berisi angka lengkap per bagian plus daftar
          mention.
        </p>
        <ReportActions projectId={projectId} />
      </Panel>

      <Panel title="Pengaturan email">
        {error ? (
          <Notice tone="error">Pengaturan gagal dimuat: {error.message}</Notice>
        ) : !settings ? (
          <Skeleton className="h-48" />
        ) : (
          <>
            {!settings.emailConfigured && (
              <div className="mb-4">
                <Notice>Email belum dikonfigurasi di server (SMTP). Tombol kirim email aktif setelah kredensial SMTP diisi.</Notice>
              </div>
            )}
            <SettingsForm projectId={projectId} settings={settings} canEdit={canEdit} />
          </>
        )}
      </Panel>
    </div>
  );
}
