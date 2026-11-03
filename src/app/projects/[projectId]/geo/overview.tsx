"use client";

import { useState } from "react";
import useSWR from "swr";
import { Segmented } from "@/components/segmented";
import { Notice, Panel, Skeleton } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { fmtPct } from "@/lib/format";
import { type GeoGroup, type GeoOverview, groupLabel } from "@/lib/geo-types";

const pct = (v: number | null) => (v === null ? "–" : fmtPct(v));

/** KPI definitions shown under the numbers (PRD section 6). */
const DEFS: [string, string][] = [
  ["Mention rate", "Answers that name your brand ÷ valid answers."],
  ["Recommendation rate", "Answers that explicitly recommend your brand ÷ valid answers. A positive mention is not a recommendation."],
  ["Position", "Rank in a numbered list in the answer (1 = first). Only when the answer has a numbered list; never guessed from prose. Score: first = 100, last = 0."],
  ["AI share of voice", "Your brand's mentions ÷ mentions of all tracked brands. Each brand counts once per answer."],
  ["Citation rate", "Answers citing at least one source / citing a domain you own. Only Gemini Search returns sources; elsewhere it shows Unavailable, not 0%."],
];

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="t-label text-muted">{label}</p>
      <p className={value === "Unavailable" ? "mt-3 text-base font-semibold text-muted" : "t-figure num mt-1.5 text-[1.75rem]"}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function GroupCard({ g, prev }: { g: GeoGroup; prev?: { mentionRate: number | null; recommendationRate: number | null } }) {
  const change = (now: number | null, before?: number | null) =>
    now === null || before === null || before === undefined ? undefined : `${now - before >= 0 ? "+" : ""}${(now - before).toFixed(1)} pts vs last month`;
  return (
    <Panel title={groupLabel(g.model, g.mode)} aside={`${g.validResponses} valid answers · ${g.model}`}>
      {g.validResponses === 0 ? (
        <p className="text-sm text-muted">No valid answers for this model and mode yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">
          <Kpi label="Mention rate" value={pct(g.mentionRate)} hint={change(g.mentionRate, prev?.mentionRate)} />
          <Kpi label="Recommendation" value={pct(g.recommendationRate)} hint={change(g.recommendationRate, prev?.recommendationRate)} />
          <Kpi
            label="Avg position"
            value={g.avgPosition === null ? "–" : `#${g.avgPosition}`}
            hint={g.rankedResponses ? `in ${g.rankedResponses} ranked answers · score ${g.normalizedPosition ?? "–"}` : "no numbered lists"}
          />
          <Kpi label="AI share of voice" value={pct(g.sov)} />
          <Kpi
            label="Citations"
            value={g.citationsSupported ? pct(g.ownedCitationRate) : "Unavailable"}
            hint={g.citationsSupported ? `owned domains · any source ${pct(g.anyCitationRate)}` : "this model/mode returns no sources"}
          />
        </div>
      )}
    </Panel>
  );
}

export function GeoOverviewTab({ projectId, batchId }: { projectId: number; batchId: number | null }) {
  const { data, error } = useSWR<GeoOverview>(
    `/api/projects/${projectId}/geo/overview${batchId ? `?batchId=${batchId}` : ""}`,
    fetcher,
    { refreshInterval: (d) => (d?.batch?.status === "RUNNING" || d?.batch?.status === "PAUSED" ? 5000 : 0), keepPreviousData: true },
  );
  const [groupKey, setGroupKey] = useState<string>("");

  if (error) return <Notice tone="error">Couldn&apos;t load AI visibility: {error.message}</Notice>;
  if (!data) return <Skeleton className="h-96" />;
  if (!data.batch)
    return (
      <Notice>
        No GEO run yet. Add and approve prompts in the Prompts tab, then start this month&apos;s run (admins). After that it runs
        automatically once a month.
      </Notice>
    );

  const key = (g: GeoGroup) => `${g.model}|${g.mode}`;
  const selected = data.groups.find((g) => key(g) === groupKey) ?? data.groups[0];
  const prevOf = (g: GeoGroup) =>
    data.previous?.comparable ? data.previous.groups.find((p) => p.model === g.model && p.mode === g.mode) : undefined;
  const searchGroups = data.groups.filter((g) => g.citationsSupported && g.domains.length);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        {data.batch.prompts} prompts · {data.batch.runsPerPrompt} run{data.batch.runsPerPrompt > 1 ? "s" : ""} per prompt and model · evaluated by{" "}
        {data.batch.evaluator} (rules {data.batch.evaluationVersion}). Knowledge = the model&apos;s own knowledge; Search = with live web search.
        The two are shown separately and never combined.
        {data.previous && !data.previous.comparable && (
          <span className="mt-1 block text-neg">
            Not compared with {data.previous.period}: prompts, models or evaluation rules changed between the two runs.
          </span>
        )}
      </p>

      {data.groups.map((g) => (
        <GroupCard key={key(g)} g={g} prev={prevOf(g)} />
      ))}

      {selected && (
        <Panel
          title="Competitors"
          aside={
            <div className="max-w-full overflow-x-auto">
              <Segmented
                label="Model and mode"
                size="sm"
                value={key(selected)}
                onChange={setGroupKey}
                options={data.groups.map((g) => ({ value: key(g), label: groupLabel(g.model, g.mode) }))}
              />
            </div>
          }
        >
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-2 py-2 font-medium">Brand</th>
                  <th className="px-2 py-2 text-right font-medium">Mention rate</th>
                  <th className="px-2 py-2 text-right font-medium">Recommendation</th>
                  <th className="px-2 py-2 text-right font-medium">Avg position</th>
                  <th className="px-2 py-2 text-right font-medium">AI share of voice</th>
                  <th className="w-[28%] px-2 py-2 font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {selected.brands.map((b) => (
                  <tr key={b.isTarget ? "target" : b.brandId} className="border-b border-line last:border-0">
                    <td className="px-2 py-3">{b.isTarget ? <span className="mark font-semibold">{b.name}</span> : b.name}</td>
                    <td className="num px-2 py-3 text-right">{pct(b.mentionRate)}</td>
                    <td className="num px-2 py-3 text-right font-semibold">{pct(b.recommendationRate)}</td>
                    <td className="num px-2 py-3 text-right">{b.avgPosition === null ? "–" : `#${b.avgPosition}`}</td>
                    <td className="num px-2 py-3 text-right">{pct(b.sov)}</td>
                    <td className="px-2 py-3">
                      <span className="block h-2 rounded-full bg-line">
                        <span className={`block h-2 rounded-full ${b.isTarget ? "bg-ink" : "bg-accent"}`} style={{ width: `${b.sov ?? 0}%` }} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">
            Based on {selected.validResponses} valid answers. One answer can mention several brands, so mention rates do not add up to 100%.
          </p>
        </Panel>
      )}

      {searchGroups.map((g) => (
        <Panel key={`d-${key(g)}`} title={`Sources cited · ${groupLabel(g.model, g.mode)}`} aside="Domains returned by the model">
          <ul className="space-y-2 text-sm">
            {g.domains.map((d) => (
              <li key={d.domain} className="flex items-baseline justify-between gap-3">
                <span className="truncate">
                  <span className="font-semibold">{d.domain}</span>
                  {d.ownedBy === "TARGET" && <span className="ml-2 rounded-full bg-pos/10 px-2 py-0.5 text-xs font-semibold text-pos">Owned</span>}
                  {d.ownedBy === "COMPETITOR" && <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted">Competitor</span>}
                </span>
                <span className="num shrink-0 text-muted">
                  in {d.responses} of {g.validResponses} answers
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Appearing as a source shows where the model looked, not why it recommended a brand. Gemini returns the site name and a Google
            redirect link, so sources are counted per domain.
          </p>
        </Panel>
      ))}

      <Panel title="How the numbers are calculated">
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          {DEFS.map(([t, d]) => (
            <div key={t}>
              <dt className="font-semibold">{t}</dt>
              <dd className="text-muted">{d}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted">
          These are Creacon&apos;s definitions, measured on the configured models through SumoPod. They do not cover every answer consumer AI apps
          show to every user, and they cannot guarantee that a brand will be recommended.
        </p>
      </Panel>
    </div>
  );
}
