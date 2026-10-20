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
      setError(err instanceof ApiError && err.status === 401 ? "Email atau password salah." : "Tidak bisa masuk. Coba lagi.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-3xl border border-line bg-card p-8">
      <div>
        <div className="mb-6 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-ruby" />
          <span className="h-3 w-3 rounded-full bg-violet" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Masuk ke Social Listening</h1>
        <p className="mt-1 text-sm text-muted">Pakai akun yang diberikan admin tim Anda.</p>
      </div>
      <label className="block text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-ruby"
        />
      </label>
      <label className="block text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-ruby"
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
        className="w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Memeriksa…" : "Masuk"}
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
