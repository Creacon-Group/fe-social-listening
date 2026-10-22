// Response shapes of be-social-listening (see docs/architecture.md in that repo).

export type Channel = "X" | "TIKTOK" | "INSTAGRAM" | "ONLINE_NEWS" | "FACEBOOK" | "YOUTUBE" | "BLOG";
export type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";
export type RangePreset = "today" | "7d" | "30d" | "custom";
export type Role = "SUPERADMIN" | "ADMIN" | "ANALYST" | "VIEWER";

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
}

/** GET /assistant/credits. Credits reset at 00:00 WIB. */
export interface CreditStatus {
  unlimited: boolean;
  limit: number;
  used: number;
  remaining: number | null;
  resetsAt: string;
  contact: string | null;
}

/** GET /admin/users (superadmin). */
export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  dailyChatCredits: number;
  usedToday: number;
  bonusToday: number;
}

export interface Project {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

export interface Brand {
  id: number;
  name: string;
  isOwn: boolean;
  color: string | null;
}

export interface Period {
  from: string; // YYYY-MM-DD, WIB
  to: string; // inclusive
}

export interface Counts {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  netSentiment: number;
}

export interface Overview extends Counts {
  period: Period;
  engagements: number;
  reach: number;
  channels: (Counts & { channel: Channel })[];
}

export interface BrandStat extends Counts {
  brandId: number;
  name: string;
  isOwn: boolean;
  sov: number;
  ratioToOwn: number | null;
}

export interface Competitors {
  period: Period;
  totalBrandMentions: number;
  own: Counts & { sov: number };
  brands: BrandStat[];
  trend: (Counts & { day: string; brandId: number })[];
}

export interface Mention {
  id: number;
  externalId: string;
  channel: Channel;
  postType: string | null;
  title: string | null;
  content: string | null;
  url: string | null;
  publishedAt: string;
  authorHandle: string | null;
  authorName: string | null;
  authorFollowers: number | null;
  authorVerified: boolean;
  likes: number;
  shares: number;
  comments: number;
  views: number;
  reach: number;
  engagements: number;
  sentimentLabel: Sentiment;
  tags: string[] | null;
  brands: { id: number; name: string; isOwn: boolean }[];
  /** Card extras from the export. `where` = account whose post a comment replies to. */
  preview: { where: string | null; images: string[]; userLink: string | null; bookmarks: number };
}

export interface MentionPage {
  period: Period;
  items: Mention[];
  page: number;
  pageSize: number;
  total: number;
}

export type BatchStatus = "PENDING" | "PROCESSING" | "PAUSED" | "COMPLETED" | "COMPLETED_WITH_ERRORS" | "FAILED";

export interface Batch {
  id: number;
  fileName: string | null;
  status: BatchStatus;
  processedRows: number;
  insertedRows: number;
  skippedRows: number;
  failedRows: number;
  unmappedKeywords: Record<string, number> | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

export interface ChatSession {
  id: string;
  title: string | null;
  updatedAt: string;
}

export interface StoredChatMessage {
  id: number;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
}

// ───────── Analysis modules ─────────
export interface TrendDay extends Counts {
  day: string;
  netSentiment: number;
  reach: number;
  engagements: number;
}
export interface Trend {
  period: Period;
  days: TrendDay[];
}

export interface Influencer extends Counts {
  channel: Channel;
  handle: string;
  name: string | null;
  followers: number;
  verified: boolean;
  userLink: string | null;
  netSentiment: number;
  reach: number;
  engagements: number;
}
export interface Source extends Counts {
  host: string;
  channel: Channel;
  netSentiment: number;
  reach: number;
  engagements: number;
}
export interface Influencers {
  period: Period;
  authors: Influencer[];
  sources: Source[];
}

export interface Demographics {
  period: Period;
  total: number;
  gender: (Counts & { label: string; netSentiment: number })[];
  located: number;
  provinces: (Counts & { code: string; name: string; netSentiment: number; reach: number })[];
  countries: (Counts & { code: string; netSentiment: number })[];
}

export interface Hashtag extends Counts {
  tag: string;
  netSentiment: number;
  engagements: number;
  reach: number;
  topChannel: Channel | null;
}
export interface Hashtags {
  period: Period;
  mentionsWithHashtag: number;
  uniqueHashtags: number;
  hashtags: Hashtag[];
}

export interface InsightSummary {
  id: number;
  periodFrom: string;
  periodTo: string;
  headline: string;
  model: string | null;
  createdAt: string;
}
export interface Insight {
  id: number;
  period: Period;
  headline: string;
  findings: { title: string; body: string; citations: number[]; refs: number[] }[];
  sources: {
    ref: number;
    id: number;
    url: string | null;
    channel: Channel;
    author: string | null;
    text: string;
    publishedAt: string;
    sentiment: Sentiment;
  }[];
  model: string | null;
  createdAt: string;
}

export interface ReportSettings {
  clientName: string | null;
  recipients: string[];
  monthlyEnabled: boolean;
  monthlyDay: number;
  lastMonthlyReport: string | null;
  emailConfigured: boolean;
}
