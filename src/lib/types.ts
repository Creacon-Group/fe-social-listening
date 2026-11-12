// Response shapes of be-social-listening (see docs/architecture.md in that repo).

export type Channel = "X" | "TIKTOK" | "INSTAGRAM" | "ONLINE_NEWS" | "FACEBOOK" | "YOUTUBE" | "BLOG";
export type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";
export type RangePreset = "today" | "7d" | "30d" | "90d" | "365d" | "custom";
export type Voice = "owned" | "earned";
export type PaidFilter = "paid" | "organic";
export type Interval = "hour" | "day" | "week" | "month" | "quarter" | "year";
export type AccountType = "KOL" | "MEDIA" | "OFFICIAL" | "OTHER";
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

export interface OwnedEarnedPart {
  total: number;
  engagements: number;
  reach: number;
}

export interface Overview extends Counts {
  period: Period;
  previousPeriod: Period;
  engagements: number;
  reach: number;
  previous: Counts & { engagements: number; reach: number };
  /** % change vs the previous period (null when the previous period was zero); netSentiment in points. */
  growth: {
    total: number | null;
    positive: number | null;
    neutral: number | null;
    negative: number | null;
    engagements: number | null;
    reach: number | null;
    netSentiment: number | null;
  };
  engagementBreakdown: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    bookmarks: number;
    reactions: { love: number; wow: number; haha: number; sad: number; angry: number; favorites: number };
  };
  ownedEarned: { owned: OwnedEarnedPart; earned: OwnedEarnedPart };
  channels: (Counts & { channel: Channel })[];
}

export interface ChannelStat extends Counts {
  channel: Channel;
  engagements: number;
  reach: number;
  views: number;
  owned: number;
  earned: number;
  engagementPerMention: number;
  share: number;
}
export interface Channels {
  period: Period;
  total: number;
  engagements: number;
  reach: number;
  engagementPerMention: number;
  channels: ChannelStat[];
}

export interface Heatmap {
  period: Period;
  cells: { dow: number; hour: number; total: number; engagements: number }[];
  peak: { dow: number; hour: number; total: number; engagements: number } | null;
}

export interface KeywordStat extends Counts {
  keyword: string;
  engagements: number;
  reach: number;
  share: number;
}
export interface Keywords {
  period: Period;
  mentionsWithKeyword: number;
  keywords: KeywordStat[];
}

export interface ProjectSettings {
  nssIncludeNeutral: boolean;
  showNss: boolean;
}

export interface BrandStat extends Counts {
  brandId: number;
  name: string;
  isOwn: boolean;
  engagements: number;
  reach: number;
  sov: number;
  engagementShare: number;
  reachShare: number;
  ratioToOwn: number | null;
}

export interface Competitors {
  period: Period;
  interval: Interval;
  buckets: string[];
  totalBrandMentions: number;
  own: Counts & { sov: number };
  brands: BrandStat[];
  trend: (Counts & { day: string; brandId: number; engagements: number; reach: number })[];
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
  categories: { id: number; name: string; color: string | null }[];
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
  sourceType: "EXCEL_UPLOAD" | "API_PULL" | "API_WEBHOOK";
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
  interval: Interval;
  /** One item per bucket; `day` is the bucket key (e.g. "2026-09-24", "2026-09-24 13:00", "2026-09", "2026-Q3"). */
  days: TrendDay[];
}

export interface Influencer extends Counts {
  channel: Channel;
  handle: string;
  name: string | null;
  followers: number;
  verified: boolean;
  userLink: string | null;
  accountType: AccountType;
  /** manual = set by an analyst; zanroo = derived from Zanroo tags and channel. */
  typeSource: "manual" | "zanroo";
  tier: string | null;
  isPaid: boolean | null;
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

/** Topic category set up by an admin: Zanroo tags it maps from, and keywords. */
export interface Category {
  id: number;
  name: string;
  color: string | null;
  zanrooTags: string[];
  keywords: string[];
  sortOrder: number;
  mentionCount: number;
}

export interface ZanrooTagSuggestions {
  sampled: number;
  items: { name: string; kind: "tag" | "category" | "keyword"; count: number }[];
}

export interface CategoryPreview {
  total: number;
  samples: { id: number; channel: Channel; content: string | null }[];
}

export interface Topic extends Counts {
  categoryId: number;
  name: string;
  color: string | null;
  netSentiment: number;
  engagements: number;
  share: number;
  previousTotal: number;
  change: number | null;
  days: { day: string; total: number }[];
  brands: (Counts & { brandId: number; name: string; isOwn: boolean; color: string | null; netSentiment: number })[];
}

export interface Topics {
  period: Period;
  total: number;
  categorized: number;
  uncategorized: number;
  topics: Topic[];
}

// ───────── Admin: projects, members, permissions (superadmin) ─────────

/** GET /admin/permissions */
export interface PermissionCatalog {
  permissions: { key: import("./permissions").Permission; group: "Pages" | "Actions"; label: string }[];
  presets: Record<"ANALYST" | "VIEWER", import("./permissions").Permission[]>;
}

/** GET /admin/projects */
export interface AdminProjectRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  clientName: string | null;
  createdAt: string;
  _count: { members: number; brands: number };
}

export interface AdminBrand {
  id: number;
  name: string;
  isOwn: boolean;
  color: string | null;
  aliases: string[] | null;
  mentionCount: number;
}

export interface AdminMember {
  id: number;
  name: string;
  email: string;
  role: Role;
  /** false = following the role preset */
  custom: boolean;
  permissions: import("./permissions").Permission[];
}

/** GET /admin/projects/:id */
export interface AdminProject extends Omit<AdminProjectRow, "_count"> {
  brands: AdminBrand[];
  members: AdminMember[];
}

/** GET /admin/users/access */
export interface AccessUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  projects: { projectId: number; name: string; custom: boolean; permissions: import("./permissions").Permission[] }[];
}

/** GET /admin/projects/:id/keywords: keywords seen in the data and the brands they map to. */
export interface KeywordRow {
  keyword: string; // lowercased match key
  label: string; // as Zanroo sent it
  mentions: number;
  brands: { id: number; name: string }[];
  ignored: boolean;
}
