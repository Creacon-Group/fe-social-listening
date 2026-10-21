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
    <div role="status" className="rounded-2xl border border-ruby/30 bg-ruby/5 px-4 py-3 text-sm">
      <p className="font-semibold">Kredit AI Assistant hari ini sudah habis ({credits.used} dari {credits.limit} pertanyaan).</p>
      <p className="mt-1 text-muted">
        Hubungi Account Manager Anda
        {credits.contact ? (
          <>
            {" "}
            (<ContactLink contact={credits.contact} />)
          </>
        ) : null}{" "}
        untuk menambah kredit. Kredit otomatis terisi lagi pukul 00.00 WIB.
      </p>
    </div>
  );
}

export function creditLine(c: CreditStatus) {
  if (c.unlimited) return "Kredit tanpa batas (superadmin).";
  return `Sisa kredit hari ini: ${c.remaining} dari ${c.limit} pertanyaan. Terisi lagi pukul 00.00 WIB.`;
}
