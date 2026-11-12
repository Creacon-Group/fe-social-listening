"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { accessSummary, PermissionEditor } from "@/components/admin/permission-editor";
import { Sheet } from "@/components/overlay";
import { Segmented } from "@/components/segmented";
import { Select } from "@/components/select";
import { btnPrimary, btnQuiet, inputBase, Notice, PageHeader, Panel, Skeleton } from "@/components/ui";
import { apiSend } from "@/lib/api";
import {
  fullAccess,
  refreshAdmin,
  ROLE_LABEL,
  slugify,
  useAccessUsers,
  useAdminProject,
  useAdminProjects,
  usePermissionCatalog,
} from "@/lib/admin";
import { fmt } from "@/lib/format";
import { brandColor, useProjectId } from "@/lib/project";
import type { AdminBrand, AdminMember, AdminProject } from "@/lib/types";

const SWATCHES = ["#e11d48", "#f59e0b", "#7c3aed", "#0ea5e9", "#10b981", "#6c8ebf", "#8b95a7", "#c9a35b"];
const field = `${inputBase} w-full`;
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      {children}
      {hint && <span className="t-caption mt-1 block text-muted">{hint}</span>}
    </label>
  );
}

function ErrorText({ text }: { text: string | null }) {
  return text ? (
    <p role="alert" className="text-sm text-neg">
      {text}
    </p>
  ) : null;
}

// ───────── New project ─────────

type BrandDraft = { name: string; isOwn: boolean; color: string; aliases: string };
const emptyBrand = (i: number, isOwn = false): BrandDraft => ({ name: "", isOwn, color: SWATCHES[i % SWATCHES.length], aliases: "" });

function NewProjectSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const { data: users } = useAccessUsers();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [brands, setBrands] = useState<BrandDraft[]>([emptyBrand(0, true)]);
  const [memberIds, setMemberIds] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setBrand = (i: number, patch: Partial<BrandDraft>) => setBrands((bs) => bs.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const limitedUsers = users?.filter((u) => !fullAccess(u.role)) ?? [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await apiSend<AdminProject>("/api/admin/projects", "POST", {
        name,
        slug,
        clientName: clientName || null,
        description: description || null,
        brands: brands
          .filter((b) => b.name.trim())
          .map((b) => ({ name: b.name, isOwn: b.isOwn, color: b.color, aliases: lines(b.aliases) })),
        memberIds: [...memberIds],
      });
      refreshAdmin();
      onCreated(created.id);
      setName("");
      setSlug("");
      setSlugTouched(false);
      setClientName("");
      setDescription("");
      setBrands([emptyBrand(0, true)]);
      setMemberIds(new Set());
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
      title="New project"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnQuiet}>
            Cancel
          </button>
          <button type="submit" form="new-project" disabled={busy || !name.trim() || !slug} className={btnPrimary}>
            {busy ? "Creating…" : "Create project"}
          </button>
        </>
      }
    >
      <form id="new-project" onSubmit={submit} className="space-y-4">
        <Field label="Project name">
          <input
            required
            data-autofocus
            maxLength={200}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="e.g. CIMB Niaga"
            className={field}
          />
        </Field>
        <Field label="Slug" hint="Lowercase letters, numbers and dashes. Used in URLs and exports.">
          <input
            required
            maxLength={120}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className={`${field} font-mono`}
          />
        </Field>
        <Field label="Client name in reports (optional)">
          <input maxLength={200} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Defaults to the project name" className={field} />
        </Field>
        <Field label="Description (optional)">
          <textarea maxLength={500} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={`${field} resize-y`} />
        </Field>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Brands</legend>
          <p className="t-caption text-muted">At least one of your own; add competitors for share of voice. Keywords can be added later.</p>
          {brands.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Brand colour"
                value={b.color}
                onChange={(e) => setBrand(i, { color: e.target.value })}
                className="h-9 w-9 shrink-0 cursor-pointer rounded-md bg-transparent"
              />
              <input
                aria-label="Brand name"
                maxLength={120}
                value={b.name}
                onChange={(e) => setBrand(i, { name: e.target.value })}
                placeholder={b.isOwn ? "Your brand" : "Competitor"}
                className={`${inputBase} min-w-0 flex-1`}
              />
              <label className="flex shrink-0 items-center gap-1.5 text-xs">
                <input type="checkbox" checked={b.isOwn} onChange={(e) => setBrand(i, { isOwn: e.target.checked })} className="h-4 w-4 accent-[var(--ink)]" />
                Own
              </label>
              <button
                type="button"
                aria-label="Remove brand"
                onClick={() => setBrands((bs) => bs.filter((_, j) => j !== i))}
                className="min-h-9 shrink-0 rounded-md px-2 text-muted hover:text-neg"
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setBrands((bs) => [...bs, emptyBrand(bs.length)])} className="text-sm font-semibold hover:underline">
            + Add brand
          </button>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold">Members</legend>
          <p className="t-caption mb-1.5 text-muted">They join with their role&apos;s default permissions; fine-tune later. Admins see every project already.</p>
          {!users ? (
            <p className="text-sm text-muted">Loading users…</p>
          ) : !limitedUsers.length ? (
            <p className="text-sm text-muted">No analyst or viewer accounts yet.</p>
          ) : (
            <ul className="max-h-48 overflow-y-auto rounded-lg ring-1 ring-line ring-inset">
              {limitedUsers.map((u) => (
                <li key={u.id}>
                  <label className="flex min-h-10 cursor-pointer items-center gap-3 px-3 text-sm hover:bg-surface">
                    <input
                      type="checkbox"
                      checked={memberIds.has(u.id)}
                      onChange={() =>
                        setMemberIds((s) => {
                          const n = new Set(s);
                          if (n.has(u.id)) n.delete(u.id);
                          else n.add(u.id);
                          return n;
                        })
                      }
                      className="h-4 w-4 accent-[var(--ink)]"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {u.name} <span className="text-muted">· {u.email}</span>
                    </span>
                    <span className="t-caption text-muted">{ROLE_LABEL[u.role]}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
        <ErrorText text={error} />
      </form>
    </Sheet>
  );
}

// ───────── Details tab ─────────

function DetailsTab({ project }: { project: AdminProject }) {
  const [form, setForm] = useState({
    name: project.name,
    slug: project.slug,
    clientName: project.clientName ?? "",
    description: project.description ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const webhook = typeof window === "undefined" ? "" : `${window.location.origin}/api/webhooks/zanroo/${project.id}`;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await apiSend(`/api/admin/projects/${project.id}`, "PATCH", {
        ...form,
        clientName: form.clientName || null,
        description: form.description || null,
      });
      refreshAdmin();
      setMsg({ ok: true, text: "Saved" });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Project name">
          <input required maxLength={200} value={form.name} onChange={set("name")} className={field} />
        </Field>
        <Field label="Slug">
          <input required maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={set("slug")} className={`${field} font-mono`} />
        </Field>
        <Field label="Client name in reports">
          <input maxLength={200} value={form.clientName} onChange={set("clientName")} placeholder={form.name} className={field} />
        </Field>
        <Field label="Description">
          <input maxLength={500} value={form.description} onChange={set("description")} className={field} />
        </Field>
      </div>
      <div className="rounded-lg bg-surface p-3 text-sm">
        <p className="text-xs text-muted">Zanroo webhook URL for this project (secret goes in the x-webhook-secret header)</p>
        <div className="mt-1 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate text-xs">{webhook}</code>
          <button
            type="button"
            className="shrink-0 text-xs font-semibold hover:underline"
            onClick={() => {
              void navigator.clipboard.writeText(webhook).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? "Saving…" : "Save details"}
        </button>
        <Link href={`/projects/${project.id}`} className="text-sm font-semibold hover:underline">
          Open dashboard →
        </Link>
        {msg && <span className={`text-sm ${msg.ok ? "text-pos" : "text-neg"}`}>{msg.text}</span>}
      </div>
    </form>
  );
}

// ───────── Brands tab ─────────

function BrandSheet({
  projectId,
  brand,
  open,
  onClose,
}: {
  projectId: number;
  brand: AdminBrand | null; // null = new
  open: boolean;
  onClose: () => void;
}) {
  const [d, setD] = useState<BrandDraft>(() =>
    brand
      ? { name: brand.name, isOwn: brand.isOwn, color: brand.color ?? SWATCHES[0], aliases: (brand.aliases ?? []).join("\n") }
      : emptyBrand(0),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = { name: d.name, isOwn: d.isOwn, color: d.color, aliases: lines(d.aliases) };
      if (brand) await apiSend(`/api/admin/projects/${projectId}/brands/${brand.id}`, "PATCH", body);
      else await apiSend(`/api/admin/projects/${projectId}/brands`, "POST", body);
      refreshAdmin();
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
      title={brand ? `Edit ${brand.name}` : "Add brand"}
      footer={
        <>
          <button type="button" onClick={onClose} className={btnQuiet}>
            Cancel
          </button>
          <button type="submit" form="brand-form" disabled={busy || !d.name.trim()} className={btnPrimary}>
            {busy ? "Saving…" : "Save brand"}
          </button>
        </>
      }
    >
      <form id="brand-form" onSubmit={save} className="space-y-4">
        <Field label="Name">
          <input required data-autofocus maxLength={120} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} className={field} />
        </Field>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={d.isOwn} onChange={(e) => setD({ ...d, isOwn: e.target.checked })} className="h-4 w-4 accent-[var(--ink)]" />
            Our own brand (unticked = competitor)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="color" value={d.color} onChange={(e) => setD({ ...d, color: e.target.value })} className="h-8 w-8 cursor-pointer rounded-md bg-transparent" />
            Colour
          </label>
        </div>
        <Field label="Keywords, one per line" hint="Matched exactly (case-insensitive) against Zanroo's Keyword column. Applies to new data; existing mentions keep their brand.">
          <textarea rows={6} value={d.aliases} onChange={(e) => setD({ ...d, aliases: e.target.value })} className={`${field} resize-y font-mono text-xs`} />
        </Field>
        <ErrorText text={error} />
      </form>
    </Sheet>
  );
}

function BrandsTab({ project }: { project: AdminProject }) {
  const [editing, setEditing] = useState<AdminBrand | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(b: AdminBrand) {
    setError(null);
    try {
      await apiSend(`/api/admin/projects/${project.id}/brands/${b.id}`, "DELETE");
      refreshAdmin();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      {!project.brands.some((b) => b.isOwn) && (
        <Notice tone="error">This project has no own brand yet. Share of voice and Net Sentiment need one.</Notice>
      )}
      <ul className="divide-y divide-line">
        {project.brands.map((b, i) => (
          <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
            <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ background: brandColor(b, i) }} />
            <span className="min-w-0 flex-1">
              <span className={`font-semibold ${b.isOwn ? "mark" : ""}`}>{b.name}</span>
              <span className="t-caption block text-muted">
                {b.isOwn ? "Own brand" : "Competitor"} · {(b.aliases ?? []).length} keywords · {fmt(b.mentionCount)} mentions
              </span>
            </span>
            <span className="flex gap-1">
              <button onClick={() => setEditing(b)} className="min-h-9 rounded-lg px-3 text-sm font-semibold hover:bg-surface">
                Edit
              </button>
              <button
                onClick={() => void remove(b)}
                disabled={b.mentionCount > 0}
                title={b.mentionCount > 0 ? "Brands with mentions can't be deleted" : undefined}
                className="min-h-9 rounded-lg px-3 text-sm font-semibold text-muted hover:bg-surface hover:text-neg disabled:opacity-40 disabled:hover:text-muted"
              >
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
      <ErrorText text={error} />
      <button onClick={() => setEditing("new")} className={btnQuiet}>
        Add brand
      </button>
      {editing && (
        <BrandSheet
          key={editing === "new" ? "new" : editing.id}
          projectId={project.id}
          brand={editing === "new" ? null : editing}
          open
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ───────── Members tab ─────────

function MembersTab({ project }: { project: AdminProject }) {
  const { data: users } = useAccessUsers();
  const { data: catalog } = usePermissionCatalog();
  const [adding, setAdding] = useState("");
  const [editing, setEditing] = useState<AdminMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const total = catalog?.permissions.length ?? 0;
  const memberIds = new Set(project.members.map((m) => m.id));
  const candidates = users?.filter((u) => !memberIds.has(u.id) && !fullAccess(u.role)) ?? [];
  const admins = users?.filter((u) => fullAccess(u.role)) ?? [];

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
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!adding) return;
          void run(() => apiSend(`/api/admin/projects/${project.id}/members/${adding}`, "PUT", { permissions: null })).then(() => setAdding(""));
        }}
      >
        <Select label="Add a member" className="min-w-56 flex-1" value={adding} onChange={(e) => setAdding(e.target.value)}>
          <option value="">{candidates.length ? "Choose a user…" : "Everyone is already a member"}</option>
          {candidates.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email}) · {ROLE_LABEL[u.role]}
            </option>
          ))}
        </Select>
        <button type="submit" disabled={!adding} className={btnPrimary}>
          Add
        </button>
      </form>
      <ErrorText text={error} />

      {!project.members.length ? (
        <p className="text-sm text-muted">No members yet. Add the client team above.</p>
      ) : (
        <ul className="divide-y divide-line">
          {project.members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{m.name}</span>
                <span className="block truncate text-xs text-muted">
                  {m.email} · {ROLE_LABEL[m.role]}
                </span>
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.custom ? "bg-accent-soft text-accent" : "bg-surface text-muted"}`}
              >
                {accessSummary(m.role, m.custom, m.permissions.length, total)}
              </span>
              <span className="flex gap-1">
                {!fullAccess(m.role) && (
                  <button onClick={() => setEditing(m)} className="min-h-9 rounded-lg px-3 text-sm font-semibold hover:bg-surface">
                    Permissions
                  </button>
                )}
                <button
                  onClick={() => void run(() => apiSend(`/api/admin/projects/${project.id}/members/${m.id}`, "DELETE"))}
                  className="min-h-9 rounded-lg px-3 text-sm font-semibold text-muted hover:bg-surface hover:text-neg"
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {admins.length > 0 && (
        <p className="t-caption text-muted">
          Also full access through their role: {admins.map((a) => a.name).join(", ")}.
        </p>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing ? `${editing.name} in ${project.name}` : "Permissions"}>
        {editing && (
          <PermissionEditor
            key={editing.id}
            role={editing.role}
            custom={editing.custom}
            permissions={editing.permissions}
            onCancel={() => setEditing(null)}
            onSave={async (permissions) => {
              await apiSend(`/api/admin/projects/${project.id}/members/${editing.id}`, "PUT", { permissions });
              refreshAdmin();
              setEditing(null);
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

// ───────── Page ─────────

type Tab = "details" | "brands" | "members";

function ProjectDetail({ id }: { id: number }) {
  const { data: project, error } = useAdminProject(id);
  const [tab, setTab] = useState<Tab>("members");

  if (error) return <Notice tone="error">Couldn&apos;t load the project: {error.message}</Notice>;
  if (!project) return <Skeleton className="h-80" />;

  return (
    <Panel
      title={project.name}
      aside={
        <span className="font-mono">
          {project.slug} · #{project.id}
        </span>
      }
    >
      <div className="mb-5 -mx-1 max-w-full overflow-x-auto px-1 py-0.5">
        <Segmented
          label="Section"
          value={tab}
          onChange={setTab}
          options={[
            { value: "members", label: `Members (${project.members.length})` },
            { value: "brands", label: `Brands (${project.brands.length})` },
            { value: "details", label: "Details" },
          ]}
        />
      </div>
      {tab === "details" && <DetailsTab key={project.id} project={project} />}
      {tab === "brands" && <BrandsTab project={project} />}
      {tab === "members" && <MembersTab project={project} />}
    </Panel>
  );
}

export default function AdminProjectsPage() {
  const projectId = useProjectId();
  const router = useRouter();
  const params = useSearchParams();
  const { data: projects, error } = useAdminProjects();
  const [creating, setCreating] = useState(false);
  const selected = Number(params.get("project")) || projects?.[0]?.id || null;
  const select = (id: number) => router.replace(`/projects/${projectId}/admin-projects?project=${id}`, { scroll: false });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projects & access"
        detail="Create client projects, set their brands, and choose who can open which menus."
        actions={
          <button onClick={() => setCreating(true)} className={btnPrimary}>
            New project
          </button>
        }
      />

      {error ? (
        <Notice tone="error">Couldn&apos;t load projects: {error.message}</Notice>
      ) : !projects ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
          <nav aria-label="Projects" className="glass rounded-[18px] p-2">
            <ul className="flex flex-col gap-0.5">
              {projects.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => select(p.id)}
                    aria-current={p.id === selected ? "true" : undefined}
                    className={`pressable w-full rounded-xl px-3 py-2.5 text-left ${p.id === selected ? "bg-accent-soft" : "hover:bg-surface"}`}
                  >
                    <span className={`block truncate text-sm font-semibold ${p.id === selected ? "text-accent" : ""}`}>{p.name}</span>
                    <span className="t-caption block text-muted">
                      {p._count.brands} brands · {p._count.members} members
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          {selected ? <ProjectDetail key={selected} id={selected} /> : <Notice>No projects yet. Create the first one.</Notice>}
        </div>
      )}

      <NewProjectSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setCreating(false);
          select(id);
        }}
      />
    </div>
  );
}
