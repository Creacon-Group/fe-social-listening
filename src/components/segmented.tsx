"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";

/**
 * Segmented control. The selection is a pill that slides to the chosen segment on a critically
 * damped spring, so the eye follows where it moved; a new tap mid-slide re-targets from where the
 * pill is now. Radio semantics for keyboards and screen readers.
 */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "md",
}: {
  label: string;
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  const id = useId();
  const reduce = useReducedMotion();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-[10px] bg-line/70 p-0.5"
      onKeyDown={(e) => {
        // Arrow keys move the selection, as in a native radio group.
        const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const i = options.findIndex((o) => o.value === value);
        const next = options[(i + step + options.length) % options.length];
        onChange(next.value);
        const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]");
        buttons[options.indexOf(next)]?.focus();
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`relative whitespace-nowrap rounded-lg font-semibold ${size === "sm" ? "min-h-8 px-2.5 text-xs" : "min-h-9 px-3 text-[0.8125rem]"} ${
              active ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.32 }}
                className="absolute inset-0 rounded-lg bg-card shadow-[0_1px_2px_rgb(0_0_0/0.12),0_0_0_0.5px_rgb(0_0_0/0.04)]"
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Multi-select chip used inside the filter panel. */
export function ToggleChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-9 rounded-full px-3.5 text-[0.8125rem] font-semibold ring-1 ring-inset ${
        on ? "bg-ink text-on-ink ring-ink" : "bg-card text-ink ring-line hover:ring-ink/40"
      }`}
    >
      {children}
    </button>
  );
}
