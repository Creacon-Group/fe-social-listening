"use client";

import useSWR from "swr";
import { fetcher } from "./api";
import type { CreditStatus } from "./types";

export const CREDITS_KEY = "/api/assistant/credits";

export function useCredits() {
  return useSWR<CreditStatus>(CREDITS_KEY, fetcher);
}

/** Account manager contact as a link when it is an e-mail, URL or WhatsApp number. */
export function ContactLink({ contact }: { contact: string }) {
  const c = contact.trim();
  const href = c.includes("@")
    ? `mailto:${c}`
    : /^https?:\/\//.test(c)
      ? c
      : /^\+?\d[\d\s-]{6,}$/.test(c)
        ? `https://wa.me/${c.replace(/\D/g, "").replace(/^0/, "62")}`
        : null;
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">
      {c}
    </a>
  ) : (
    <span className="font-semibold">{c}</span>
  );
}

export function CreditsExhausted({ credits }: { credits: CreditStatus }) {
  return (
    <div role="status" className="rounded-[10px] border border-signal bg-signal-soft/50 px-4 py-3 text-sm">
      <p className="font-semibold">You&apos;ve used today&apos;s assistant credits ({credits.used} of {credits.limit} questions).</p>
      <p className="mt-1 text-muted">
        Contact your account manager
        {credits.contact ? (
          <>
            {" "}
            (<ContactLink contact={credits.contact} />)
          </>
        ) : null}{" "}
        to add credits. Credits refill at 00:00 WIB.
      </p>
    </div>
  );
}

export function creditLine(c: CreditStatus) {
  if (c.unlimited) return "Unlimited credits (superadmin).";
  return `${c.remaining} of ${c.limit} questions left today. Refills at 00:00 WIB.`;
}
