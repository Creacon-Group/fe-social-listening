"use client";

import { useState } from "react";
import useSWR from "swr";
import { Notice, PageHeader, Panel } from "@/components/ui";
import { apiSend, fetcher } from "@/lib/api";
import { useMe } from "@/lib/project";
import type { AdminUser, Role } from "@/lib/types";

const KEY = "/api/admin/users";

const ROLE_LABEL: Record<Role, string> = {
  SUPERADMIN: "Superadmin",
  ADMIN: "Admin",
  ANALYST: "Analyst",
  VIEWER: "Viewer",
};

const field =
  "rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ruby disabled:opacity-50";
const button = "rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40";
const ghost = "rounded-xl border border-line px-3 py-2 text-sm font-semibold hover:border-ink disabled:opacity-40";

function UserRow({ user, onChanged }: { user: AdminUser; onChanged: () => void }) {
  const [limit, setLimit] = useState(String(user.dailyChatCredits));
  const [bonus, setBonus] = useState("5");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const superadmin = user.role === "SUPERADMIN";
  const available = user.dailyChatCredits + user.bonusToday;

  async function run(action: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      await action();
      setMsg({ tone: "ok", text: ok });
      onChanged();
    } catch (e) {
      setMsg({ tone: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const limitNum = Number(limit);
  const bonusNum = Number(bonus);

  return (
    <li className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
      <div className="min-w-0">
        <p className="truncate font-semibold">{user.name}</p>
        <p className="truncate text-xs text-muted">
          {user.email} · {ROLE_LABEL[user.role]}
        </p>
      </div>

      <div>
        <p className="text-xs text-muted">Pemakaian hari ini</p>
        <p className="num text-sm font-semibold">
          {superadmin ? (
            `${user.usedToday} · tanpa batas`
          ) : (
            <>
              {user.usedToday} dari {available}
              {user.bonusToday > 0 && <span className="font-normal text-muted"> (termasuk +{user.bonusToday} hari ini)</span>}
            </>
          )}
        </p>
      </div>

      {superadmin ? (
        <p className="text-sm text-muted lg:col-span-2">Superadmin tidak dibatasi kredit.</p>
      ) : (
        <>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () => apiSend(`/api/admin/users/${user.id}/credits`, "PUT", { dailyChatCredits: limitNum }),
                "Limit harian disimpan",
              );
            }}
          >
            <label className="flex-1">
              <span className="mb-1 block text-xs text-muted">Limit harian (tetap)</span>
              <input
                type="number"
                min={0}
                max={1000}
                inputMode="numeric"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className={`${field} num w-full`}
              />
            </label>
            <button
              type="submit"
              disabled={busy || !Number.isInteger(limitNum) || limitNum < 0 || limitNum === user.dailyChatCredits}
              className={ghost}
            >
              Simpan
            </button>
          </form>

          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () => apiSend(`/api/admin/users/${user.id}/credits/bonus`, "POST", { amount: bonusNum }),
                `+${bonusNum} kredit untuk hari ini`,
              );
            }}
          >
            <label className="flex-1">
              <span className="mb-1 block text-xs text-muted">Tambah untuk hari ini saja</span>
              <input
                type="number"
                min={1}
                max={1000}
                inputMode="numeric"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
                className={`${field} num w-full`}
              />
            </label>
            <button type="submit" disabled={busy || !Number.isInteger(bonusNum) || bonusNum < 1} className={button}>
              Tambah
            </button>
          </form>
        </>
      )}

      {msg && (
        <p role={msg.tone === "err" ? "alert" : "status"} className={`text-xs lg:col-span-4 ${msg.tone === "err" ? "text-neg" : "text-pos"}`}>
          {msg.text}
        </p>
      )}
    </li>
  );
}

function NewUserForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "VIEWER" as Role, password: "", dailyChatCredits: "5" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiSend("/api/admin/users", "POST", { ...form, dailyChatCredits: Number(form.dailyChatCredits) });
      setForm({ name: "", email: "", role: "VIEWER", password: "", dailyChatCredits: "5" });
      setOpen(false);
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className={ghost}>
        Tambah user
      </button>
    );

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label>
        <span className="mb-1 block text-xs text-muted">Nama</span>
        <input required maxLength={120} value={form.name} onChange={set("name")} className={`${field} w-full`} />
      </label>
      <label>
        <span className="mb-1 block text-xs text-muted">Email</span>
        <input required type="email" value={form.email} onChange={set("email")} className={`${field} w-full`} />
      </label>
      <label>
        <span className="mb-1 block text-xs text-muted">Peran</span>
        <select value={form.role} onChange={set("role")} className={`${field} w-full`}>
          <option value="VIEWER">Viewer: hanya melihat</option>
          <option value="ANALYST">Analyst: bisa upload data</option>
          <option value="ADMIN">Admin: semua project</option>
        </select>
      </label>
      <label>
        <span className="mb-1 block text-xs text-muted">Password awal (min. 10 karakter)</span>
        <input
          required
          type="password"
          minLength={10}
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          className={`${field} w-full`}
        />
      </label>
      <label>
        <span className="mb-1 block text-xs text-muted">Kredit AI per hari</span>
        <input
          required
          type="number"
          min={0}
          max={1000}
          value={form.dailyChatCredits}
          onChange={set("dailyChatCredits")}
          className={`${field} num w-full`}
        />
      </label>
      <div className="flex items-end gap-2">
        <button type="submit" disabled={busy} className={button}>
          {busy ? "Menyimpan…" : "Buat user"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={ghost}>
          Batal
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-neg sm:col-span-2 lg:col-span-3">
          {error}
        </p>
      )}
    </form>
  );
}

export default function CreditsPage() {
  const { data: me } = useMe();
  const isSuper = me?.role === "SUPERADMIN";
  const { data: users, error, mutate } = useSWR<AdminUser[]>(isSuper ? KEY : null, fetcher);

  if (me && !isSuper) return <Notice>Halaman ini hanya untuk superadmin.</Notice>;

  return (
    <div className="space-y-5">
      <PageHeader title="Kredit AI Assistant" detail="Satu kredit = satu pertanyaan terjawab. Reset setiap 00.00 WIB." />

      <Panel title="User baru" aside="User baru otomatis masuk ke semua project.">
        <NewUserForm onCreated={() => void mutate()} />
      </Panel>

      <Panel title="Kredit per user" aside="Limit harian berlaku setiap hari. Tambahan hari ini hangus pukul 00.00 WIB.">
        {error ? (
          <Notice tone="error">Daftar user gagal dimuat.</Notice>
        ) : !users ? (
          <p className="text-sm text-muted">Memuat…</p>
        ) : (
          <ul className="divide-y divide-line">
            {users.map((u) => (
              <UserRow key={u.id} user={u} onChanged={() => void mutate()} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
