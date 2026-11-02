import Link from "next/link";

export type LegalSection = { id: string; title: string; body: React.ReactNode };

export const COMPANY = {
  name: "PT Solusi Pelanggan Jitu",
  address: [
    "AD PREMIER 17th Floor, Suite 04 B",
    "Jl. TB. Simatupang No. 5, Ragunan",
    "Pasar Minggu, South Jakarta 12550, Indonesia",
  ],
  email: "tech@creacon.id",
};

/** Shared shell for /terms-of-service and /privacy-policy. Public pages: excluded from the auth proxy. */
export function LegalPage({
  title,
  updated,
  sections,
  other,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
  other: { href: string; label: string };
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 pb-[max(3rem,env(safe-area-inset-bottom))]">
      <Link href="/login" className="mb-10 inline-flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- 7 KB static mark */}
        <img src="/creacon-mark.png" alt="" width={28} height={28} className="h-7 w-7" />
        <span className="leading-tight">
          <span className="block font-bold tracking-[-0.02em]">Social Listening</span>
          <span className="t-caption block text-muted">by Creacon</span>
        </span>
      </Link>

      <h1 className="t-title">{title}</h1>
      <p className="mt-2 text-sm text-muted">
        Last updated: {updated} · Effective: {updated}
      </p>

      <nav aria-label="On this page" className="mt-8 rounded-lg bg-card p-5 ring-1 ring-line ring-inset">
        <p className="t-caption mb-2 font-semibold uppercase tracking-wide text-muted">On this page</p>
        <ol className="grid gap-1 text-sm sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="hover:underline">
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="legal mt-10 space-y-10 text-[0.95rem] leading-relaxed">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-6">
            <h2 className="mb-3 text-lg font-semibold tracking-[-0.01em]">
              {i + 1}. {s.title}
            </h2>
            <div className="space-y-3 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1 [&_h3]:mt-4 [&_h3]:font-semibold">
              {s.body}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-14 border-t border-line pt-6 text-sm text-muted">
        <p>© 2026 {COMPANY.name}. All rights reserved.</p>
        <p className="mt-1">
          See also our{" "}
          <Link href={other.href} className="font-semibold text-ink hover:underline">
            {other.label}
          </Link>
          .
        </p>
      </footer>
    </main>
  );
}

export function ContactBlock({ extra }: { extra?: React.ReactNode }) {
  return (
    <address className="not-italic">
      {COMPANY.name}
      {COMPANY.address.map((l) => (
        <span key={l} className="block">
          {l}
        </span>
      ))}
      <span className="block">
        Email:{" "}
        <a href={`mailto:${COMPANY.email}`} className="font-semibold text-ink hover:underline">
          {COMPANY.email}
        </a>
      </span>
      {extra}
    </address>
  );
}
