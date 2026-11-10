"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/*
 * Minimal toast store. Call `toast.error({...})` from anywhere (no provider needed);
 * <Toaster /> in the root layout renders them. Toasts with a `dedupeKey` show once per page load.
 */

export interface ToastInput {
  title: string;
  description?: string;
  /** Short code shown on the toast, e.g. AI_BUDGET_EXCEEDED. */
  code?: string;
  /** Text put on the clipboard by the "Copy error code" button. */
  copyText?: string;
  dedupeKey?: string;
  /** Auto-dismiss after ms. Default: stays until closed. */
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
}

let items: ToastItem[] = [];
let nextId = 1;
const seen = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  error(input: ToastInput) {
    if (input.dedupeKey) {
      if (seen.has(input.dedupeKey)) return;
      seen.add(input.dedupeKey);
    }
    const id = nextId++;
    items = [...items.slice(-2), { ...input, id }]; // keep at most 3 on screen
    emit();
    if (input.duration) setTimeout(() => dismiss(id), input.duration);
  },
  dismiss,
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getItems = () => items;
const getServerItems = (): ToastItem[] => [];

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API blocked (non-secure context, permissions): fall back to a hidden textarea.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

function ToastCard({ t }: { t: ToastItem }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  return (
    <div role="alert" className="pointer-events-auto w-full rounded-[18px] bg-card p-4 text-sm shadow-[0_14px_40px_-12px_rgb(15_23_42/0.35)] ring-1 ring-neg/30 ring-inset">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neg/10 text-xs font-bold text-neg">
          !
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{t.title}</p>
          {t.description && <p className="mt-1 text-muted">{t.description}</p>}
          {t.code && <p className="mt-2 inline-block rounded-md bg-surface px-2 py-0.5 font-mono text-xs text-ink">{t.code}</p>}
          {t.copyText && (
            <div className="mt-3">
              <button
                type="button"
                onClick={async () => setCopied(await copy(t.copyText!))}
                className="inline-flex min-h-9 items-center rounded-full bg-ink px-4 text-xs font-semibold text-on-ink hover:opacity-90"
              >
                {copied ? "Copied" : "Copy error code"}
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => dismiss(t.id)}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function Toaster() {
  const list = useSyncExternalStore(subscribe, getItems, getServerItems);
  if (list.length === 0) return null;
  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:inset-x-auto md:right-4 md:w-[380px] md:items-end"
    >
      {list.map((t) => (
        <ToastCard key={t.id} t={t} />
      ))}
    </div>
  );
}
