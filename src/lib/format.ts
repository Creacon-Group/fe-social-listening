import type { Channel, Sentiment } from "./types";

const nf = new Intl.NumberFormat("en-GB");
const compact = new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 });
const dec1 = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const fmt = (n: number) => nf.format(n);
export const fmtCompact = (n: number) => compact.format(n);
export const fmtPct = (n: number) => `${dec1.format(n)}%`;
export const fmtSigned = (n: number) => (n > 0 ? `+${dec1.format(n)}` : dec1.format(n));

const monthShort = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

/** "2026-09-24" -> "24 Sep" (dates from the API are already WIB calendar days). */
export const fmtDay = (ymd: string) => monthShort.format(new Date(`${ymd}T00:00:00Z`));
export const fmtDayLong = (ymd: string) => fullDate.format(new Date(`${ymd}T00:00:00Z`));
export const fmtPeriod = (p: { from: string; to: string }) =>
  p.from === p.to ? fmtDayLong(p.from) : `${fmtDay(p.from)} to ${fmtDayLong(p.to)}`;
export const fmtDateTime = (iso: string) => `${dateTime.format(new Date(iso))} WIB`;

export const CHANNEL_LABEL: Record<Channel, string> = {
  X: "X",
  TIKTOK: "TikTok",
  INSTAGRAM: "Instagram",
  ONLINE_NEWS: "Online News",
  FACEBOOK: "Facebook",
  YOUTUBE: "YouTube",
  BLOG: "Blog",
};

export const SENTIMENT_LABEL: Record<Sentiment, string> = {
  POSITIVE: "Positive",
  NEUTRAL: "Neutral",
  NEGATIVE: "Negative",
};

export const SENTIMENT_COLOR: Record<Sentiment, string> = {
  POSITIVE: "var(--pos)",
  NEUTRAL: "var(--neu)",
  NEGATIVE: "var(--neg)",
};

/** Links from mention data (Excel, Zanroo): only http(s) is rendered, so javascript:/data: URLs can't run. */
export const webUrl = (u: string | null | undefined) => (u && /^https?:\/\//i.test(u.trim()) ? u.trim() : null);
