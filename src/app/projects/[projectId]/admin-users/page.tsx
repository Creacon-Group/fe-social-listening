"use client";

import { useState } from "react";
import { accessSummary, PermissionEditor } from "@/components/admin/permission-editor";
import { Sheet } from "@/components/overlay";
import { Select } from "@/components/select";
import { btnPrimary, btnQuiet, inputBase, Notice, PageHeader, Panel, Skeleton } from "@/components/ui";
import { apiSend } from "@/lib/api";
import { fullAccess, refreshAdmin, ROLE_LABEL, useAccessUsers, useAdminProjects, usePermissionCatalog } from "@/lib/admin";
import { useMe } from "@/lib/project";
import type { AccessUser, Role } from "@/lib/types";

const field = `${inputBase} w-full`;

// ───────── New user ─────────

function NewUserSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: projects } = useAdminProjects();
  const [form, setForm] = useState({ name: "", email: "", role: "VIEWER" as Role, password: "", dailyChatCredits: "5" });
  const [projectIds, setProjectIds] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiSend("/api/admin/users", "POST", {
        ...form,
        dailyChatCredits: Number(form.dailyChatCredits),
        projectIds: [...projectIds],
      });
      refreshAdmin();
      setForm({ name: "", email: "", role: "VIEWER", password: "", dailyChatCredits: "5" });
      setProjectIds(new Set());
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New user"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnQuiet}>
            Cancel
          </button>
          <button type="submit" form="new-user" disabled={busy} className={btnPrimary}>
            {busy ? "Creating…" : "Create user"}
          </button>
        </>
      }
    >
      <form id="new-user" onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Name</span>
          <input required data-autofocus maxLength={120} value={form.name} onChange={set("name")} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Email</span>
          <input required type="email" value={form.email} onChange={set("email")} className={field} />
        </label>
        <Select label="Role" value={form.role} onChange={set("role")}>
          <option value="VIEWER">Viewer: read-only defaults</option>
          <option value="ANALYST">Analyst: can upload, tag and send</option>
          <option value="ADMIN">Admin: full access to all projects</option>
        </Select>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">First password (10+ characters)</span>
          <input required type="password" minLength={10} autoComplete="new-password" value={form.password} onChange={set("password")} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Assistant credits per day</span>
          <input required type="number" min={0} max={1000} value={form.dailyChatCredits} onChange={set("dailyChatCredits")} className={`${field} num`} />
        </label>
        {form.role !== "ADMIN" && (
          <fieldset>
            <legend className="mb-1 text-xs text-muted">Projects (role default permissions; fine-tune after)</legend>
            <ul className="max-h-48 overflow-y-auto rounded-lg ring-1 ring-line ring-inset">
              {projects?.map((p) => (
                <li key={p.id}>
                  <label className="flex min-h-10 cursor-pointer items-center gap-3 px-3 text-sm hover:bg-surface">
                    <input
                      type="checkbox"
                      checked={projectIds.has(p.id)}
                      onChange={() =>
                        setProjectIds((s) => {
                          const n = new Set(s);
                          if (n.has(p.id)) n.delete(p.id);
                          else n.add(p.id);
                          return n;
                        })
                      }
                      className="h-4 w-4 accent-[var(--ink)]"
                    />
                    {p.name}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
        {error && (
          <p role="alert" className="text-sm text-neg">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
}

// ───────── Access of one user across projects ─────────

function UserAccessSheet({ user, onClose }: { user: AccessUser; onClose: () => void }) {
  const { data: projects } = useAdminProjects();
  const { data: catalog } = usePermissionCatalog();
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const total = catalog?.permissions.length ?? 0;
  const member = new Map(user.projects.map((p) => [p.projectId, p]));

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      refreshAdmin();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Sheet open onClose={onClose} title={`${user.name}'s projects`}>
      <p className="mb-3 text-sm text-muted">
        {user.email} · {ROLE_LABEL[user.role]}
      </p>
      {fullAccess(user.role) ? (
        <Notice>{ROLE_LABEL[user.role]}s have full access to every project.</Notice>
      ) : (
        <ul className="divide-y divide-line">
          {projects?.map((p) => {
            const m = member.get(p.id);
            return (
              <li key={p.id} className="py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={!!m}
                      onChange={() =>
                        void run(() =>
                          m
                            ? apiSend(`/api/admin/projects/${p.id}/members/${user.id}`, "DELETE")
                            : apiSend(`/api/admin/projects/${p.id}/members/${user.id}`, "PUT", { permissions: null }),
                        )
                      }
                      className="h-4 w-4 accent-[var(--ink)]"
                    />
                    <span className="truncate font-semibold">{p.name}</span>
                  </label>
                  {m && (
                    <>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.custom ? "bg-accent-soft text-accent" : "bg-surface text-muted"}`}>
                        {accessSummary(user.role, m.custom, m.permissions.length, total)}
                      </span>
                      <button
                        onClick={() => setEditing(editing === p.id ? null : p.id)}
                        aria-expanded={editing === p.id}
                        className="min-h-9 rounded-lg px-3 text-sm font-semibold hover:bg-surface"
                      >
                        {editing === p.id ? "Close" : "Permissions"}
                      </button>
                    </>
                  )}
                </div>
                {m && editing === p.id && (
                  <div className="mt-3 rounded-xl bg-surface/60 p-3">
                    <PermissionEditor
                      key={`${p.id}-${m.custom}-${m.permissions.join()}`}
                      role={user.role}
                      custom={m.custom}
                      permissions={m.permissions}
                      onCancel={() => setEditing(null)}
                      onSave={async (permissions) => {
                        await apiSend(`/api/admin/projects/${p.id}/members/${user.id}`, "PUT", { permissions });
                        refreshAdmin();
                        setEditing(null);
                      }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-neg">
          {error}
        </p>
      )}
    </Sheet>
  );
}

// ───────── Page ─────────

function UserRow({ user, self, onOpen }: { user: AccessUser; self: boolean; onOpen: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const locked = user.role === "SUPERADMIN" || self;

  async function changeRole(role: Role) {
    setError(null);
    try {
      await apiSend(`/api/admin/users/${user.id}`, "PATCH", { role });
      refreshAdmin();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <li className="grid gap-3 py-4 md:grid-cols-[minmax(0,1.1fr)_10rem_minmax(0,1.4fr)_auto] md:items-center">
      <div className="min-w-0">
        <p className="truncate font-semibold">
          {user.name} {self && <span className="text-xs font-normal text-muted">(you)</span>}
        </p>
        <p className="truncate text-xs text-muted">{user.email}</p>
      </div>
      {locked ? (
        <p className="text-sm font-semibold">{ROLE_LABEL[user.role]}</p>
      ) : (
        <Select label={`Role of ${user.name}`} hideLabel density="sm" value={user.role} onChange={(e) => void changeRole(e.target.value as Role)}>
          <option value="VIEWER">Viewer</option>
          <option value="ANALYST">Analyst</option>
          <option value="ADMIN">Admin</option>
        </Select>
      )}
      <div className="flex min-w-0 flex-wrap gap-1">
        {fullAccess(user.role) ? (
          <span className="text-sm text-muted">All projects</span>
        ) : user.projects.length ? (
          user.projects.map((p) => (
            <span
              key={p.projectId}
              title={p.custom ? "Custom permissions" : "Role default"}
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.custom ? "bg-accent-soft text-accent" : "bg-surface"}`}
            >
              {p.name}
              {p.custom && " ✦"}
            </span>
          ))
        ) : (
          <span className="text-sm text-neg">No project: sees nothing</span>
        )}
      </div>
      <button onClick={onOpen} disabled={fullAccess(user.role)} className={`${btnQuiet} justify-self-start`}>
        Manage access
      </button>
      {error && (
        <p role="alert" className="text-xs text-neg md:col-span-4">
          {error}
        </p>
      )}
    </li>
  );
}

export default function AdminUsersPage() {
  const { data: me } = useMe();
  const { data: users, error } = useAccessUsers();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const open = users?.find((u) => u.id === openId) ?? null;
  const shown = users?.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users & roles"
        detail="A role sets the default permissions; each project can override them. Role changes apply on the user's next request."
        actions={
          <button onClick={() => setCreating(true)} className={btnPrimary}>
            New user
          </button>
        }
      />
      <Panel
        title="Users"
        aside={
          <span>
            ✦ = custom permissions in that project
          </span>
        }
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email"
          aria-label="Search users"
          className={`${inputBase} mb-2 w-full sm:max-w-xs`}
        />
        {error ? (
          <Notice tone="error">Couldn&apos;t load users: {error.message}</Notice>
        ) : !shown ? (
          <Skeleton className="h-48" />
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((u) => (
              <UserRow key={u.id} user={u} self={u.id === me?.id} onOpen={() => setOpenId(u.id)} />
            ))}
          </ul>
        )}
      </Panel>
      <NewUserSheet open={creating} onClose={() => setCreating(false)} />
      {open && <UserAccessSheet user={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}
