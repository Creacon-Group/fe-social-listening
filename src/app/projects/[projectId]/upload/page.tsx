"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Notice, PageHeader, Panel } from "@/components/ui";
import { apiSend, fetcher } from "@/lib/api";
import { fmt, fmtDateTime } from "@/lib/format";
import { useMe, useProjectId } from "@/lib/project";
import type { Batch, BatchStatus } from "@/lib/types";

// "blob": browser -> Vercel Blob -> API reads the URL (Vercel). "direct": multipart to the API (local / VPS).
const MODE = process.env.NEXT_PUBLIC_UPLOAD_MODE === "blob" ? "blob" : "direct";

const STATUS: Record<BatchStatus, { label: string; tone: string }> = {
  PENDING: { label: "Menunggu", tone: "bg-surface text-muted" },
  PROCESSING: { label: "Diproses", tone: "bg-violet/10 text-violet" },
  PAUSED: { label: "Dilanjutkan otomatis", tone: "bg-violet/10 text-violet" },
  COMPLETED: { label: "Selesai", tone: "bg-pos/10 text-pos" },
  COMPLETED_WITH_ERRORS: { label: "Selesai, ada baris gagal", tone: "bg-neg/10 text-neg" },
  FAILED: { label: "Gagal", tone: "bg-neg/10 text-neg" },
};
const ACTIVE: BatchStatus[] = ["PENDING", "PROCESSING", "PAUSED"];

function uploadDirect(url: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<Batch>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100);
    xhr.onload = () => {
      let body: { message?: string | string[] } & Partial<Batch> = {};
      try {
        body = JSON.parse(xhr.responseText || "{}");
      } catch {
        body = { message: `Server membalas HTTP ${xhr.status}. Cek terminal backend.` };
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as Batch);
      else reject(new Error(Array.isArray(body.message) ? body.message.join(", ") : (body.message ?? `HTTP ${xhr.status}`)));
    };
    xhr.onerror = () => reject(new Error("Koneksi terputus saat mengunggah"));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

function BatchRow({ projectId, batch }: { projectId: number; batch: Batch }) {
  const [open, setOpen] = useState(false);
  const { data: errors } = useSWR<{ items: { id: number; rowRef: string; message: string }[]; total: number }>(
    open ? `/api/projects/${projectId}/ingestion/batches/${batch.id}/errors?pageSize=50` : null,
    fetcher,
  );
  const status = STATUS[batch.status];
  const unmapped = Object.entries(batch.unmappedKeywords ?? {}).slice(0, 8);

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="font-semibold">{batch.fileName ?? `Batch ${batch.id}`}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.tone}`}>{status.label}</span>
        <span className="text-xs text-muted">{fmtDateTime(batch.createdAt)}</span>
      </div>
      <p className="num mt-1.5 text-sm text-muted">
        {fmt(batch.processedRows)} baris dibaca: {fmt(batch.insertedRows)} baru, {fmt(batch.skippedRows)} duplikat
        dilewati, {fmt(batch.failedRows)} gagal
      </p>
      {batch.errorMessage && <p className="mt-1 text-sm text-neg">{batch.errorMessage}</p>}
      {unmapped.length > 0 && (
        <p className="mt-1 text-xs text-muted">
          Keyword tanpa brand: {unmapped.map(([k, n]) => `${k} (${fmt(n)})`).join(", ")}. Tambahkan sebagai alias brand bila
          perlu.
        </p>
      )}
      {batch.failedRows > 0 && (
        <button onClick={() => setOpen((v) => !v)} className="mt-2 text-xs font-semibold text-ink hover:underline">
          {open ? "Sembunyikan baris gagal" : "Lihat baris gagal"}
        </button>
      )}
      {open && errors && (
        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl bg-surface p-3 text-xs">
          {errors.items.map((e) => (
            <li key={e.id}>
              <span className="font-semibold">{e.rowRef}</span>: {e.message}
            </li>
          ))}
          {errors.total > errors.items.length && (
            <li className="text-muted">dan {fmt(errors.total - errors.items.length)} baris lainnya</li>
          )}
        </ul>
      )}
    </li>
  );
}

export default function UploadPage() {
  const projectId = useProjectId();
  const { data: me } = useMe();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const batchesKey = `/api/projects/${projectId}/ingestion/batches`;
  const { data: batches, mutate } = useSWR<Batch[]>(batchesKey, fetcher, {
    refreshInterval: (latest) => (latest?.some((b) => ACTIVE.includes(b.status)) ? 3000 : 0),
  });

  // A batch pauses near the platform time limit; continue it automatically.
  const resumed = useRef(new Set<string>());
  useEffect(() => {
    for (const b of batches ?? []) {
      const key = `${b.id}:${b.processedRows}`;
      if (b.status === "PAUSED" && !resumed.current.has(key)) {
        resumed.current.add(key);
        apiSend(`/api/projects/${projectId}/ingestion/batches/${b.id}/resume`, "POST")
          .then(() => mutate())
          .catch(() => undefined);
      }
    }
  }, [batches, projectId, mutate]);

  async function start() {
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      if (MODE === "blob") {
        const blob = await upload(`uploads/${file.name}`, file, {
          access: "private",
          handleUploadUrl: "/api/blob/upload",
          multipart: true,
          onUploadProgress: (e) => setProgress(e.percentage),
        });
        await apiSend(`/api/projects/${projectId}/ingestion/excel`, "POST", { fileUrl: blob.url, fileName: file.name });
      } else {
        await uploadDirect(`/api/projects/${projectId}/ingestion/excel/upload`, file, setProgress);
      }
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await mutate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  }

  const canUpload = me && me.role !== "VIEWER";

  return (
    <div className="space-y-5">
      <PageHeader title="Upload data" detail="Ekspor Excel dari Zanroo (.xlsx)" />

      {me && !canUpload ? (
        <Notice>Akun viewer hanya bisa melihat data. Minta admin untuk mengunggah file.</Notice>
      ) : (
        <Panel>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex-1 cursor-pointer rounded-2xl border-2 border-dashed border-line px-5 py-8 text-center text-sm hover:border-ruby">
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <span>
                  <span className="font-semibold">{file.name}</span>{" "}
                  <span className="text-muted">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                </span>
              ) : (
                <span className="text-muted">Pilih file Excel. Baris dengan MID yang sudah ada akan dilewati.</span>
              )}
            </label>
            <button
              onClick={start}
              disabled={!file || progress !== null}
              className="rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {progress !== null ? `Mengunggah ${Math.round(progress)}%` : "Unggah dan proses"}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-neg">
              {error}
            </p>
          )}
        </Panel>
      )}

      <Panel title="Riwayat upload">
        {!batches ? (
          <p className="text-sm text-muted">Memuat…</p>
        ) : batches.length === 0 ? (
          <p className="text-sm text-muted">Belum ada file yang diunggah ke project ini.</p>
        ) : (
          <ul className="divide-y divide-line">
            {batches.map((b) => (
              <BatchRow key={b.id} projectId={projectId} batch={b} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
