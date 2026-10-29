"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
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
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-[14px] bg-card p-8">
      <div>
        <div className="mb-7 flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- 7 KB static mark */}
          <img src="/creacon-mark.png" alt="" width={32} height={32} className="h-8 w-8" />
          <span className="leading-tight">
            <span className="block text-lg font-bold tracking-[-0.02em]">Social Listening</span>
            <span className="t-caption block text-muted">by Creacon</span>
          </span>
        </div>
        <h1 className="text-xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm text-muted">Use the account your team admin gave you.</p>
      </div>
      <label className="block text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="mt-1.5 w-full rounded-lg bg-surface ring-1 ring-line ring-inset px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </label>
      <label className="block text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1.5 w-full rounded-lg bg-surface ring-1 ring-line ring-inset px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-neg">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="min-h-11 w-full rounded-lg bg-ink px-4 text-sm font-semibold text-on-ink disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
