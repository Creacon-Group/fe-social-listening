import { SENTIMENT_COLOR, SENTIMENT_LABEL, fmt } from "@/lib/format";
import type { Counts, Sentiment } from "@/lib/types";

export function PageHeader({ title, detail }: { title: string; detail?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {detail && <p className="text-sm text-muted">{detail}</p>}
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
    <section className={`rounded-3xl border border-line bg-card p-5 md:p-6 ${className}`}>
      {(title || aside) && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          {title && <h2 className="text-base font-bold tracking-tight">{title}</h2>}
          {aside && <div className="text-xs text-muted">{aside}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Notice({ tone = "muted", children }: { tone?: "muted" | "error"; children: React.ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`rounded-2xl border px-4 py-6 text-center text-sm ${
        tone === "error" ? "border-neg/30 bg-neg/5 text-neg" : "border-line bg-card text-muted"
      }`}
    >
      {children}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-line/60 ${className}`} />;
}

const ORDER: Sentiment[] = ["POSITIVE", "NEUTRAL", "NEGATIVE"];

/** 100% stacked bar of positive / neutral / negative. */
export function SentimentBar({ counts, height = "h-2.5" }: { counts: Counts; height?: string }) {
  const values = { POSITIVE: counts.positive, NEUTRAL: counts.neutral, NEGATIVE: counts.negative };
  const label = ORDER.map((s) => `${SENTIMENT_LABEL[s]} ${fmt(values[s])}`).join(", ");
  return (
    <div role="img" aria-label={label} className={`flex w-full overflow-hidden rounded-full bg-line ${height}`}>
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
