"use client";

import { useState } from "react";
import useSWR from "swr";
import { Select } from "@/components/select";
import { btnPrimary, btnQuiet, inputBase, Notice, PageHeader, Panel } from "@/components/ui";
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

// One look for controls across the app: the shared input and button styles.
const field = inputBase;
const button = btnPrimary;
const ghost = btnQuiet;

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
          {user.email}, {ROLE_LABEL[user.role]}
        </p>
      </div>

      <div>
        <p className="text-xs text-muted">Used today</p>
        <p className="num text-sm font-semibold">
          {superadmin ? (
            `${user.usedToday}, no limit`
          ) : (
            <>
              {user.usedToday} of {available}
              {user.bonusToday > 0 && <span className="font-normal text-muted"> (includes +{user.bonusToday} today)</span>}
            </>
          )}
        </p>
      </div>

      {superadmin ? (
        <p className="text-sm text-muted lg:col-span-2">Superadmins have no credit limit.</p>
      ) : (
        <>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () => apiSend(`/api/admin/users/${user.id}/credits`, "PUT", { dailyChatCredits: limitNum }),
                "Daily limit saved",
              );
            }}
          >
            <label className="flex-1">
              <span className="mb-1 block text-xs text-muted">Daily limit</span>
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
              Save
            </button>
          </form>

          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () => apiSend(`/api/admin/users/${user.id}/credits/bonus`, "POST", { amount: bonusNum }),
                `Added ${bonusNum} credits for today`,
              );
            }}
          >
            <label className="flex-1">
              <span className="mb-1 block text-xs text-muted">Extra credits for today</span>
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
              Add
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
        Add user
      </button>
    );

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label>
        <span className="mb-1 block text-xs text-muted">Name</span>
        <input required maxLength={120} value={form.name} onChange={set("name")} className={`${field} w-full`} />
      </label>
      <label>
        <span className="mb-1 block text-xs text-muted">Email</span>
        <input required type="email" value={form.email} onChange={set("email")} className={`${field} w-full`} />
      </label>
      <label>
        <span className="mb-1 block text-xs text-muted">Role</span>
        <Select label="Role" hideLabel value={form.role} onChange={set("role")}>
          <option value="VIEWER">Viewer: read only</option>
          <option value="ANALYST">Analyst: can upload data</option>
          <option value="ADMIN">Admin: all projects</option>
        </Select>
      </label>
      <label>
        <span className="mb-1 block text-xs text-muted">First password (10+ characters)</span>
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
        <span className="mb-1 block text-xs text-muted">Assistant credits per day</span>
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
          {busy ? "Saving…" : "Create user"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={ghost}>
          Cancel
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

  if (me && !isSuper) return <Notice>This page is for superadmins.</Notice>;

  return (
    <div className="space-y-5">
      <PageHeader title="Assistant credits" detail="One credit is one answered question. Credits reset at 00:00 WIB." />

      <Panel title="New user" aside="New users join every project.">
        <NewUserForm onCreated={() => void mutate()} />
      </Panel>

      <Panel title="Credits per user" aside="The daily limit applies every day. Extra credits expire at 00:00 WIB.">
        {error ? (
          <Notice tone="error">Couldn&apos;t load users.</Notice>
        ) : !users ? (
          <p className="text-sm text-muted">Loading…</p>
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
