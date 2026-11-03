// GEO Intelligence response shapes (be-social-listening src/modules/geo).

export type GeoMode = "KNOWLEDGE" | "SEARCH";
export type GeoCategory =
  | "CATEGORY_DISCOVERY"
  | "BRAND_RECOMMENDATION"
  | "PROBLEM_SOLUTION"
  | "BRAND_COMPARISON"
  | "BRAND_AWARENESS"
  | "BRAND_REPUTATION";
export type GeoRecommendation = "RECOMMENDED" | "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "NOT_MENTIONED" | "UNCLEAR";
export type GeoBatchStatus = "RUNNING" | "PAUSED" | "COMPLETED" | "PARTIAL" | "FAILED";

export const CATEGORY_LABEL: Record<GeoCategory, string> = {
  CATEGORY_DISCOVERY: "Category discovery",
  BRAND_RECOMMENDATION: "Brand recommendation",
  PROBLEM_SOLUTION: "Problem / solution",
  BRAND_COMPARISON: "Brand comparison",
  BRAND_AWARENESS: "Brand awareness",
  BRAND_REPUTATION: "Brand reputation",
};
export const MODE_LABEL: Record<GeoMode, string> = { KNOWLEDGE: "Knowledge", SEARCH: "Search" };
export const REC_LABEL: Record<GeoRecommendation, string> = {
  RECOMMENDED: "Recommended",
  POSITIVE: "Positive, not recommended",
  NEUTRAL: "Neutral mention",
  NEGATIVE: "Discouraged",
  NOT_MENTIONED: "Not mentioned",
  UNCLEAR: "Unclear",
};

export interface GeoModel {
  key: "gemini" | "gpt";
  label: string;
  id: string;
  configured: boolean;
  modes: GeoMode[];
  capabilities: { search: boolean; citations: boolean; tokenUsage: boolean };
}

export interface GeoSettings {
  enabled: boolean;
  runDay: number;
  runsPerPrompt: number;
  profile: { targetName?: string; industry?: string; market?: string; language?: string; description?: string };
  brands: { id: number; name: string; isOwn: boolean; domains: string[] }[];
  models: GeoModel[];
  evaluator: string;
  maxPrompts: number;
}

export interface GeoPrompt {
  id: number;
  category: GeoCategory;
  branded: boolean;
  language: string;
  status: "DRAFT" | "APPROVED" | "ARCHIVED";
  source: string;
  text: string;
  version: number;
  versionId: number | null;
}

export interface GeoEstimate {
  period: string;
  prompts: number;
  combos: { model: string; mode: GeoMode }[];
  runsPerPrompt: number;
  generations: number;
  evaluationsAtMost: number;
  maxTokensPerCall: number;
  alreadyRan: { id: number; status: GeoBatchStatus } | null;
}

export interface GeoBatchSummary {
  id: number;
  /** YYYY-MM for monthly runs; null for manual runs. */
  period: string | null;
  kind: "monthly" | "adhoc";
  label: string | null;
  status: GeoBatchStatus;
  trigger: string;
  total: number;
  succeeded: number;
  failed: number;
  startedAt: string;
  finishedAt: string | null;
}

export interface GeoBatch extends GeoBatchSummary {
  pending: number;
  tokens: { prompt: number; completion: number };
}

export interface GeoBrandKpi {
  isTarget: boolean;
  brandId: number | null;
  name: string;
  mentions: number;
  mentionRate: number | null;
  recommendations: number;
  recommendationRate: number | null;
  avgPosition: number | null;
  normalizedPosition: number | null;
  rankedResponses: number;
  sov: number | null;
}

export interface GeoGroup {
  model: string;
  key: "gemini" | "gpt";
  mode: GeoMode;
  citationsSupported: boolean;
  validResponses: number;
  mentionRate: number | null;
  recommendationRate: number | null;
  avgPosition: number | null;
  normalizedPosition: number | null;
  rankedResponses: number;
  sov: number | null;
  anyCitationRate: number | null;
  ownedCitationRate: number | null;
  sentiment: Record<string, number>;
  brands: GeoBrandKpi[];
  domains: { domain: string; citations: number; responses: number; ownedBy: string | null }[];
}

export interface GeoOverview {
  batch: {
    id: number;
    period: string | null;
    kind: "monthly" | "adhoc";
    label: string | null;
    status: GeoBatchStatus;
    total: number;
    evaluator: string;
    evaluationVersion: string;
    runsPerPrompt: number;
    prompts: number;
  } | null;
  groups: GeoGroup[];
  previous: {
    period: string;
    comparable: boolean;
    groups: { model: string; mode: GeoMode; mentionRate: number | null; recommendationRate: number | null; sov: number | null; validResponses: number }[];
  } | null;
}

export interface GeoRunRow {
  id: number;
  model: string;
  mode: GeoMode;
  runNo: number;
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  errorType: string | null;
  errorMessage: string | null;
  latencyMs: number | null;
  citations: number;
  prompt: { id: number; version: number; text: string; category: GeoCategory; branded: boolean };
  target: { mentioned: boolean; recommendation: GeoRecommendation; position: number | null; listSize: number | null; sentiment: string | null } | null;
}

export interface GeoRunDetail {
  id: number;
  model: string;
  mode: GeoMode;
  runNo: number;
  status: string;
  text: string | null;
  latencyMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  reasoningTokens: number | null;
  errorType: string | null;
  errorMessage: string | null;
  executedAt: string | null;
  promptVersion: { version: number; text: string; prompt: { category: GeoCategory; branded: boolean } };
  citations: { id: number; domain: string; url: string; ownedBy: string | null }[];
  evaluations: {
    id: number;
    version: string;
    evaluatorModel: string | null;
    status: string;
    error: string | null;
    createdAt: string;
    results: {
      id: number;
      isTarget: boolean;
      name: string;
      mentioned: boolean;
      matches: string[] | null;
      recommendation: GeoRecommendation;
      position: number | null;
      listSize: number | null;
      sentiment: string | null;
      evidence: string | null;
      manual: boolean;
    }[];
  }[];
}

/** "gemini/gemini-3.8-flash" + SEARCH -> "Gemini · Search". */
export const groupLabel = (model: string, mode: GeoMode) =>
  `${model.toLowerCase().includes("gemini") ? "Gemini" : model.toLowerCase().includes("gpt") ? "GPT" : model} · ${MODE_LABEL[mode]}`;
