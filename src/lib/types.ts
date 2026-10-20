// Response shapes of be-social-listening (see docs/architecture.md in that repo).

export type Channel = "X" | "TIKTOK" | "INSTAGRAM" | "ONLINE_NEWS" | "FACEBOOK" | "YOUTUBE" | "BLOG";
export type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";
export type RangePreset = "today" | "7d" | "30d" | "custom";
export type Role = "ADMIN" | "ANALYST" | "VIEWER";

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
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
