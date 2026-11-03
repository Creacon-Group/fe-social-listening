import { SENTIMENT_COLOR, SENTIMENT_LABEL, fmt } from "@/lib/format";
import type { Counts, Sentiment } from "@/lib/types";

/*
 * Shared control looks. One filled button (the action that moves work forward), one quiet.
 * Radii: pills on buttons, 8px on fields, 18px on glass panels. Press feedback comes from globals.css.
 */
export const btnPrimary =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-on-ink shadow-[0_8px_20px_-10px_rgb(15_23_42/0.6)] hover:opacity-90 disabled:opacity-40";
export const btnQuiet =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-card px-4 text-sm font-semibold ring-1 ring-line ring-inset hover:ring-ink/40 disabled:opacity-40";
export const inputBase =
  "rounded-lg bg-card px-3 py-2 text-sm outline-none ring-1 ring-line ring-inset focus:ring-2 focus:ring-accent disabled:opacity-60";

export function PageHeader({ title, detail, actions }: { title: string; detail?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pt-1">
      <div className="min-w-0">
        <h1 className="t-title">{title}</h1>
        {detail && <p className="mt-1.5 text-sm text-muted">{detail}</p>}
      </div>
      {actions}
    </header>
  );
}

export function Panel({
  title,
  aside,
  children,
  className = "",
}: {
  title?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass rounded-[18px] p-4 md:p-5 ${className}`}>
      {(title || aside) && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          {title && <h2 className="t-headline">{title}</h2>}
          {aside && <div className="text-xs text-muted">{aside}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Change vs the previous period: green up, orange down. `invert` for metrics where up is bad. */
export function Delta({ value, unit = "%", invert = false }: { value: number | null; unit?: "%" | "pts"; invert?: boolean }) {
  if (value === null) return <span className="text-xs text-muted">no earlier data</span>;
  const good = invert ? value < 0 : value > 0;
  const tone = value === 0 ? "text-muted" : good ? "text-pos" : "text-neg";
  const arrow = value > 0 ? "▲" : value < 0 ? "▼" : "";
  return (
    <span className={`num text-xs font-semibold ${tone}`}>
      {arrow} {Math.abs(value).toLocaleString("en-GB", { maximumFractionDigits: 1 })}
      {unit === "%" ? "%" : " pts"}
    </span>
  );
}

type Kpi = { label: string; value: string; hint?: string; delta?: React.ReactNode; detail?: React.ReactNode };

/** Headline numbers in one band split by hairlines, instead of a row of identical cards. */
export function KpiBand({ items }: { items: Kpi[] }) {
  const cols = items.length >= 4 ? "lg:grid-cols-4" : items.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2";
  return (
    <dl className={`glass grid grid-cols-2 overflow-hidden rounded-[18px] ${cols}`}>
      {items.map((k, i) => (
        <div
          key={k.label}
          className={`p-4 md:p-5 ${i % 2 === 1 ? "border-l border-line" : ""} ${i >= 2 ? "border-t border-line lg:border-t-0" : ""} ${
            i >= 2 ? "lg:border-l" : ""
          } ${items.length === 3 && i === 2 ? "col-span-2 lg:col-span-1" : ""}`}
        >
          <dt className="t-label text-muted">{k.label}</dt>
          <dd className="t-figure num mt-2.5">{k.value}</dd>
          {k.delta && <dd className="mt-1.5">{k.delta}</dd>}
          {k.hint && <dd className="t-caption mt-2 text-muted">{k.hint}</dd>}
          {k.detail && <dd className="mt-3">{k.detail}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** Brand name; our own brands carry the highlighter mark. */
export function BrandName({ name, own }: { name: string; own: boolean }) {
  return own ? (
    <span className="mark font-semibold" title={`${name} (your brand)`}>
      {name}
    </span>
  ) : (
    <span>{name}</span>
  );
}

export function Notice({ tone = "muted", children }: { tone?: "muted" | "error"; children: React.ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`rounded-[18px] px-4 py-4 text-sm ${tone === "error" ? "bg-neg/10 text-neg" : "glass text-muted"}`}
    >
      {children}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-[18px] bg-line/60 ${className}`} />;
}

const ORDER: Sentiment[] = ["POSITIVE", "NEUTRAL", "NEGATIVE"];

/** 100% stacked bar of positive / neutral / negative. */
export function SentimentBar({ counts, height = "h-2.5" }: { counts: Counts; height?: string }) {
  const values = { POSITIVE: counts.positive, NEUTRAL: counts.neutral, NEGATIVE: counts.negative };
  const label = ORDER.map((s) => `${SENTIMENT_LABEL[s]} ${fmt(values[s])}`).join(", ");
  return (
    <div role="img" aria-label={label} className={`flex w-full gap-px overflow-hidden rounded-full bg-line ${height}`}>
      {counts.total > 0 &&
        ORDER.map((s) => (
          <span
            key={s}
            style={{ width: `${(values[s] / counts.total) * 100}%`, background: SENTIMENT_COLOR[s] }}
            className="h-full"
          />
        ))}
    </div>
  );
}

export function SentimentLegend() {
  return (
    <span className="flex flex-wrap gap-3 text-xs text-muted">
      {ORDER.map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: SENTIMENT_COLOR[s] }} />
          {SENTIMENT_LABEL[s]}
        </span>
      ))}
    </span>
  );
}

export function SentimentChip({ s }: { s: Sentiment }) {
  const tone =
    s === "POSITIVE" ? "bg-pos/10 text-pos" : s === "NEGATIVE" ? "bg-neg/10 text-neg" : "bg-surface text-muted";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{SENTIMENT_LABEL[s]}</span>;
}
