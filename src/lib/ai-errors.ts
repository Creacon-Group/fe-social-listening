import { toast } from "@/components/toast";

/*
 * AI errors the user can't fix themselves: the provider/gateway budget is used up
 * (e.g. LiteLLM "ExceededBudget ... over budget") or the user's AI credits ran out.
 * Both show a toast asking the user to send an error code to their admin.
 */

export type AiErrorCode = "AI_BUDGET_EXCEEDED" | "AI_CREDITS_EXHAUSTED";

const BUDGET_RE = /ExceededBudget|over budget|budget[_ ]exceeded|insufficient_quota|exceeded your current quota/i;

export function isBudgetError(type?: string | null, message?: string | null) {
  return type === "budget_exceeded" || BUDGET_RE.test(message ?? "");
}

const TITLE: Record<AiErrorCode, string> = {
  AI_BUDGET_EXCEEDED: "AI usage limit reached",
  AI_CREDITS_EXHAUSTED: "AI credits used up",
};

/**
 * Show the "ask your admin" toast. `context` and `detail` go into the copied text so the
 * admin can find the cause (e.g. which key or user hit the budget).
 */
export function notifyAiError(
  code: AiErrorCode,
  opts: { context?: Record<string, string | number | null | undefined>; detail?: string | null; dedupeKey?: string } = {},
) {
  const lines = [`Error code: ${code}`];
  for (const [k, v] of Object.entries(opts.context ?? {})) if (v !== undefined && v !== null && v !== "") lines.push(`${k}: ${v}`);
  lines.push(`Time: ${new Date().toISOString()}`);
  if (typeof window !== "undefined") lines.push(`Page: ${location.href}`);
  if (opts.detail) lines.push(`Detail: ${opts.detail}`);

  toast.error({
    title: TITLE[code],
    description: "Please ask your admin and copy this error code to the admin.",
    code,
    copyText: lines.join("\n"),
    dedupeKey: opts.dedupeKey,
  });
}
