import Link from "next/link";
import { btnPrimary, btnQuiet } from "@/components/ui";

/**
 * 403 screen. `page`: the user is in the project but lacks the permission for this menu.
 * `project`: the user isn't a member of the project at all (the backend answers 404 so it
 * doesn't reveal the project exists; we still show "no access" rather than "not found").
 */
export function Forbidden({
  kind = "page",
  homeHref,
  homeLabel,
}: {
  kind?: "page" | "project";
  /** First page this user can open, if any. */
  homeHref?: string;
  homeLabel?: string;
}) {
  const title = kind === "project" ? "You don't have access to this project" : "You don't have access to this page";
  const detail =
    kind === "project"
      ? "Your account isn't a member of this project, or the project no longer exists."
      : "Your role in this project doesn't include this feature. If you need it, ask your admin to update your permissions.";

  return (
    <section
      aria-labelledby="forbidden-title"
      className="glass mx-auto mt-6 flex max-w-xl flex-col items-center rounded-[22px] px-6 py-12 text-center md:mt-16 md:px-10"
    >
      <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-neg/10 text-neg">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
      <p className="num mt-5 text-xs font-semibold tracking-[0.18em] text-muted">ERROR 403</p>
      <h1 id="forbidden-title" className="t-title mt-1.5">
        {title}
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted">{detail}</p>

      <div className="mt-7 flex flex-wrap justify-center gap-2">
        {homeHref ? (
          <Link href={homeHref} className={btnPrimary}>
            {homeLabel ?? "Go to an available page"}
          </Link>
        ) : (
          <Link href="/" className={btnPrimary}>
            Back to my projects
          </Link>
        )}
        <a href="mailto:tech@creacon.id?subject=Social%20Listening%20access%20request" className={btnQuiet}>
          Request access
        </a>
      </div>
    </section>
  );
}
