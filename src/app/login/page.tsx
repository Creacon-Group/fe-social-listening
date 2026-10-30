"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { btnPrimary, inputBase } from "@/components/ui";
import { ApiError, apiSend } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await apiSend("/api/auth/login", "POST", { email: form.get("email"), password: form.get("password") });
      const next = params.get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "Wrong email or password." : "Sign-in failed. Check your connection and try again.");
      setBusy(false);
    }
  }

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
      <label className="block text-sm font-medium">
        Password
        <input name="password" type="password" required autoComplete="current-password" className={`${inputBase} mt-1.5 min-h-11 w-full`} />
      </label>
      {error && (
        <p role="alert" className="text-sm text-neg">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={`${btnPrimary} min-h-11 w-full`}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
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
