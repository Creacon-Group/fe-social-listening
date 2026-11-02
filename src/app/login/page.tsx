"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { btnPrimary, btnQuiet, inputBase } from "@/components/ui";
import { ApiError, apiSend } from "@/lib/api";

/**
 * Only same-origin paths. "/\evil.com" passed the old startsWith("/") check, but browsers read the
 * backslash as "//", which sent users to another site after signing in.
 */
function safeNext(next: string | null) {
  if (!next) return "/";
  try {
    const url = new URL(next, window.location.origin);
    return url.origin === window.location.origin ? url.pathname + url.search + url.hash : "/";
  } catch {
    return "/";
  }
}

const TECH_EMAIL = "tech@creacon.id";
const TERMS_URL = "/terms-of-service";
const PRIVACY_URL = "/privacy-policy";

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {open ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          <path d="M1 1l22 22" />
        </>
      )}
    </svg>
  );
}

/** No self-serve reset yet: collect the email, then hand the user to Tech Creacon with a prefilled mail. */
function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState<string | null>(null);

  if (email) {
    const subject = encodeURIComponent("Social Listening - Password Reset Request");
    const body = encodeURIComponent(`Hi Tech Creacon,\n\nPlease help reset the password for my Social Listening account.\nRegistered email: ${email}\n\nThank you.`);
    const href = `mailto:${TECH_EMAIL}?subject=${subject}&body=${body}`;
    return (
      <div className="w-full max-w-sm space-y-5">
        <div>
          <h1 className="t-title">Contact Tech Creacon</h1>
          <p className="mt-2 text-sm text-muted">
            Password resets are handled by our team. Email <span className="font-semibold text-ink">{TECH_EMAIL}</span> from{" "}
            <span className="font-semibold text-ink break-all">{email}</span> and we&apos;ll help you reset it.
          </p>
        </div>
        <a href={href} className={`${btnPrimary} min-h-11 w-full`}>
          Email {TECH_EMAIL}
        </a>
        <button type="button" onClick={onBack} className={`${btnQuiet} min-h-11 w-full`}>
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setEmail(String(new FormData(e.currentTarget).get("email") ?? "").trim());
      }}
      className="w-full max-w-sm space-y-5"
    >
      <div>
        <h1 className="t-title">Forgot password</h1>
        <p className="mt-2 text-sm text-muted">Enter the email registered to your account.</p>
      </div>
      <label className="block text-sm font-medium">
        Email
        <input name="email" type="email" required autoFocus autoComplete="email" className={`${inputBase} mt-1.5 min-h-11 w-full`} />
      </label>
      <button type="submit" className={`${btnPrimary} min-h-11 w-full`}>
        Continue
      </button>
      <button type="button" onClick={onBack} className={`${btnQuiet} min-h-11 w-full`}>
        Back to sign in
      </button>
    </form>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [forgot, setForgot] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await apiSend("/api/auth/login", "POST", { email: form.get("email"), password: form.get("password") });
      const next = params.get("next");
      router.replace(safeNext(next));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "Wrong email or password." : "Sign-in failed. Check your connection and try again.");
      setBusy(false);
    }
  }

  if (forgot) return <ForgotPassword onBack={() => setForgot(false)} />;

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
      <div>
        {/* Phones have no brand panel, so the mark sits above the form. */}
        <div className="mb-8 flex items-center gap-2.5 md:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- 7 KB static mark */}
          <img src="/creacon-mark.png" alt="" width={32} height={32} className="h-8 w-8" />
          <span className="leading-tight">
            <span className="block text-lg font-bold tracking-[-0.02em]">Social Listening</span>
            <span className="t-caption block text-muted">by Creacon</span>
          </span>
        </div>
        <h1 className="t-title">Sign in</h1>
        <p className="mt-2 text-sm text-muted">Use the account your team admin gave you.</p>
      </div>
      <label className="block text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="username" className={`${inputBase} mt-1.5 min-h-11 w-full`} />
      </label>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <button type="button" onClick={() => setForgot(true)} className="text-sm font-semibold text-ink hover:underline">
            Forgot password?
          </button>
        </div>
        <div className="relative mt-1.5">
          <input
            id="password"
            name="password"
            type={showPw ? "text" : "password"}
            required
            autoComplete="current-password"
            className={`${inputBase} min-h-11 w-full pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Hide password" : "Show password"}
            aria-pressed={showPw}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted hover:text-ink"
          >
            <EyeIcon open={showPw} />
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-neg">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={`${btnPrimary} min-h-11 w-full`}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="t-caption text-center text-muted">
        By signing in, you agree to our{" "}
        <a href={TERMS_URL} target="_blank" rel="noreferrer noopener" className="font-semibold text-ink hover:underline">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href={PRIVACY_URL} target="_blank" rel="noreferrer noopener" className="font-semibold text-ink hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}

/**
 * Left: a quiet brand panel. One dark surface, the Creacon mark enlarged and cropped by the edge,
 * one line of copy. It stays dark in both themes. Right: the form on the page canvas, no card.
 */
function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden border-white/5 bg-[#121318] text-white md:flex md:border-r md:flex-col md:justify-between md:p-10 lg:p-14">
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative, 90 KB */}
      <img
        src="/creacon-mark-lg.png"
        alt=""
        aria-hidden
        width={720}
        height={720}
        className="pointer-events-none absolute -right-[26%] -top-[10%] w-[80%] max-w-[600px] select-none opacity-85"
      />
      <div className="relative flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- 7 KB static mark */}
        <img src="/creacon-mark.png" alt="" width={28} height={28} className="h-7 w-7" />
        <span className="leading-tight">
          <span className="block font-bold tracking-[-0.02em]">Social Listening</span>
          <span className="t-caption block text-white/60">by Creacon</span>
        </span>
      </div>
      <div className="relative max-w-[26rem]">
        <p className="text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.025em] lg:text-[2rem]">
          What people say about your brands, next to your competitors.
        </p>
        <p className="mt-4 text-sm text-white/60">Mentions, sentiment and share of voice from your social listening data.</p>
      </div>
    </aside>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <BrandPanel />
      <section className="flex items-center justify-center px-6 py-12 pb-[max(3rem,env(safe-area-inset-bottom))]">
        <Suspense>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
