/**
 * Dropdown built on the native <select>: phones get the system picker and keyboards work as
 * people expect, while the closed control matches the other inputs (same height, radius, ring)
 * with its own chevron instead of the browser's default arrow.
 */
export function Select({
  label,
  hideLabel = false,
  className = "",
  density = "md",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; hideLabel?: boolean; density?: "sm" | "md" }) {
  return (
    <label className={`block ${className}`}>
      <span className={hideLabel ? "sr-only" : "t-caption mb-1 block text-muted"}>{label}</span>
      <span className="relative block">
        <select
          {...props}
          className={`w-full cursor-pointer appearance-none rounded-lg bg-card pl-3 pr-9 font-semibold text-ink ring-1 ring-line ring-inset hover:ring-ink/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default disabled:opacity-60 ${
            density === "sm" ? "min-h-9 text-[0.8125rem]" : "min-h-10 text-sm"
          }`}
        >
          {children}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 4.5 6 7.5l3-3" />
        </svg>
      </span>
    </label>
  );
}
