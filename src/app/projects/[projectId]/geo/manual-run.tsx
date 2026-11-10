"use client";

import { useState } from "react";
import useSWR from "swr";
import { Select } from "@/components/select";
import { btnPrimary, btnQuiet, inputBase, Notice } from "@/components/ui";
import { isBudgetError, notifyAiError } from "@/lib/ai-errors";
import { ApiError, apiSend, fetcher } from "@/lib/api";
import { ContactLink, creditLine, useCredits } from "@/lib/credits";
import { CATEGORY_LABEL, type GeoBatch, type GeoCategory, type GeoPrompt } from "@/lib/geo-types";

const MAX = 10;
const CATEGORIES = Object.keys(CATEGORY_LABEL) as GeoCategory[];

/**
 * Manual run outside the monthly schedule: pick prompts and/or write new ones. Each prompt costs
 * one AI credit and runs once on every model and mode. New prompts are saved as drafts.
 */
export function ManualRun({ projectId, onStarted, onClose }: { projectId: number; onStarted: (id: number) => void; onClose: () => void }) {
  const { data: prompts } = useSWR<GeoPrompt[]>(`/api/projects/${projectId}/geo/prompts`, fetcher);
  const credits = useCredits();
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [lines, setLines] = useState("");
  const [category, setCategory] = useState<GeoCategory>("BRAND_RECOMMENDATION");
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newTexts = lines
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= 5);
  const cost = picked.size + newTexts.length;
  const c = credits.data;
  const enough = !c || c.unlimited || (c.remaining ?? 0) >= cost;
  const active = (prompts ?? []).filter((p) => p.status !== "ARCHIVED");

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const b = await apiSend<GeoBatch>(`/api/projects/${projectId}/geo/adhoc-runs`, "POST", {
        promptIds: [...picked],
        newPrompts: newTexts.map((text) => ({ text, category, language })),
      });
      await credits.mutate();
      onStarted(b.id);
    } catch (e) {
      const msg = (e as Error).message;
      const outOfCredits = e instanceof ApiError && e.status === 429;
      if (outOfCredits) notifyAiError("AI_CREDITS_EXHAUSTED", { context: { Project: projectId, Feature: "GEO manual run" }, detail: msg });
      else if (isBudgetError(null, msg)) notifyAiError("AI_BUDGET_EXCEEDED", { context: { Project: projectId, Feature: "GEO manual run" }, detail: msg });
      setError(outOfCredits ? "Not enough AI credits left today." : msg);
      await credits.mutate();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass space-y-4 rounded-[18px] p-4 md:p-5">
      <div>
        <h2 className="t-headline">Manual run</h2>
        <p className="mt-1 text-sm text-muted">
          Runs outside the monthly schedule, for example to test new questions. Each prompt costs <b className="text-ink">1 AI credit</b> and is
          asked once to every model and mode. Results are kept apart from the monthly benchmark. Credits for prompts that get no answer at all are
          given back.
        </p>
      </div>

      <div>
        <p className="t-label mb-1.5 text-muted">Existing prompts</p>
        <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-lg ring-1 ring-line ring-inset">
          {active.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">No prompts yet.</li>
          ) : (
            active.map((p) => (
              <li key={p.id}>
                <label className="flex min-h-10 cursor-pointer items-center gap-3 px-3 py-1.5 text-sm hover:bg-surface">
                  <input
                    type="checkbox"
                    checked={picked.has(p.id)}
                    disabled={!picked.has(p.id) && cost >= MAX}
                    onChange={() =>
                      setPicked((s) => {
                        const n = new Set(s);
                        if (n.has(p.id)) n.delete(p.id);
                        else n.add(p.id);
                        return n;
                      })
                    }
                    className="h-4 w-4 accent-[var(--ink)]"
                  />
                  <span className="min-w-0 flex-1">{p.text}</span>
                  <span className="t-caption shrink-0 text-muted">{p.status === "APPROVED" ? "In benchmark" : "Draft"}</span>
                </label>
              </li>
            ))
          )}
        </ul>
      </div>

      <div>
        <p className="t-label mb-1.5 text-muted">New prompts, one per line</p>
        <textarea
          value={lines}
          onChange={(e) => setLines(e.target.value)}
          rows={3}
          placeholder={"Kartu apa yang paling hemat untuk streaming tiap hari?\nWhich operator is best for gaming in Jakarta?"}
          aria-label="New prompts, one per line"
          className={`${inputBase} w-full`}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <Select label="Category for new prompts" density="sm" value={category} onChange={(e) => setCategory(e.target.value as GeoCategory)}>
            {CATEGORIES.map((k) => (
              <option key={k} value={k}>
                {CATEGORY_LABEL[k]}
              </option>
            ))}
          </Select>
          <Select label="Language" density="sm" value={language} onChange={(e) => setLanguage(e.target.value as "id" | "en")}>
            <option value="id">Bahasa Indonesia</option>
            <option value="en">English</option>
          </Select>
        </div>
        <p className="mt-1 text-xs text-muted">New prompts are saved as drafts; approve them later to add them to the monthly benchmark.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <p className="text-sm">
          Cost: <b className="num">{cost}</b> credit{cost === 1 ? "" : "s"}
          {cost > MAX && <span className="text-neg"> (max {MAX} prompts per run)</span>}
          {c && <span className="block text-xs text-muted">{creditLine(c)}</span>}
          {c && !enough && (
            <span className="block text-xs text-neg">
              Not enough credits for this run.
              {c.contact && (
                <>
                  {" "}
                  Ask <ContactLink contact={c.contact} /> to add credits.
                </>
              )}
            </span>
          )}
        </p>
        <span className="ml-auto flex gap-2">
          <button className={btnQuiet} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className={btnPrimary} onClick={start} disabled={busy || cost === 0 || cost > MAX || !enough}>
            {busy ? "Starting…" : `Run ${cost || ""} prompt${cost === 1 ? "" : "s"}`}
          </button>
        </span>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
