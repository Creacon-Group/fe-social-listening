"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId, useLayoutEffect, useRef, useState } from "react";

/* iOS-like spring: critically damped slide, no overshoot, settles in ~0.35s. */
const SLIDE = { type: "spring", bounce: 0, duration: 0.38 } as const;
const PRESS = { type: "spring", bounce: 0, duration: 0.2 } as const;

/**
 * Segmented control (UISegmentedControl). One thumb slides to the chosen segment; a new tap
 * mid-slide re-targets from where the thumb is now. Pressing the selected segment shrinks the
 * thumb slightly, as on iOS. Radio semantics for keyboards and screen readers.
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
  const [pressed, setPressed] = useState(false);
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-full bg-line/60 p-0.5 ring-1 ring-inset ring-line"
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
            data-segment
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            onPointerDown={() => active && setPressed(true)}
            onPointerUp={() => setPressed(false)}
            onPointerLeave={() => setPressed(false)}
            className={`relative whitespace-nowrap rounded-full font-semibold transition-colors duration-200 ${
              size === "sm" ? "min-h-8 px-2.5 text-xs" : "min-h-9 px-3.5 text-[0.8125rem]"
            } ${active ? "text-ink" : "text-muted hover:text-ink"}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                animate={{ scale: pressed && !reduce ? 0.94 : 1 }}
                transition={reduce ? { duration: 0 } : { ...SLIDE, scale: PRESS }}
                className="absolute inset-0 rounded-full bg-card shadow-[0_3px_8px_rgb(0_0_0/0.12),0_0_0_0.5px_rgb(0_0_0/0.04)]"
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export type ChipItem = { key: string; label: React.ReactNode; on: boolean; onClick: () => void };

type Box = { x: number; y: number; w: number; h: number };

/**
 * A row of filter chips where the first item is "All". While one chip is on, a single black
 * capsule slides to it (across wrapped rows too), like the segmented control. With several on,
 * each selected chip fills on its own and the sliding capsule steps aside.
 */
export function ChipGroup({ items }: { items: ChipItem[] }) {
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const onKeys = items.filter((i) => i.on).map((i) => i.key);
  const solo = onKeys.length === 1 ? onKeys[0] : null;
  const [box, setBox] = useState<Box | null>(null);
  // Slide only from one solo choice to another; jump when appearing or coming back from multi.
  const lastSolo = useRef<string | null>(null);
  const [instant, setInstant] = useState(true);
  // Solo choice from the previous render, so render can tell a slide from a jump.
  const [curSolo, setCurSolo] = useState(solo);
  const [prevSolo, setPrevSolo] = useState<string | null>(null);
  if (curSolo !== solo) {
    setPrevSolo(curSolo);
    setCurSolo(solo);
  }

  useLayoutEffect(() => {
    const measure = (jump: boolean) => {
      const el = solo ? refs.current.get(solo) : null;
      if (!el) return setBox(null);
      setInstant(jump);
      setBox({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    };
    measure(lastSolo.current === null || solo === null);
    lastSolo.current = solo;
    const ro = new ResizeObserver(() => measure(true));
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [solo]);

  return (
    <div ref={wrap} className="relative flex flex-wrap gap-2">
      {box && (
        <motion.span
          aria-hidden
          initial={false}
          animate={{ x: box.x, y: box.y, width: box.w, height: box.h }}
          transition={instant || reduce ? { duration: 0 } : SLIDE}
          className="pointer-events-none absolute left-0 top-0 rounded-full bg-ink shadow-[0_6px_14px_-6px_rgb(0_0_0/0.45)]"
        />
      )}
      {items.map((item) => {
        const own = item.on && !solo; // filled by itself when several are on
        // Text turns white as the sliding capsule arrives, not before; fills and losses are instant.
        const arriving = solo === item.key && prevSolo !== null && prevSolo !== solo && !reduce;
        return (
          <button
            key={item.key}
            ref={(el) => {
              if (el) refs.current.set(item.key, el);
              else refs.current.delete(item.key);
            }}
            type="button"
            data-segment
            aria-pressed={item.on}
            onClick={item.onClick}
            className={`relative min-h-9 rounded-full px-3.5 text-[0.8125rem] font-semibold ring-1 ring-inset transition-transform duration-150 active:scale-[0.96] ${
              item.on ? "text-on-ink ring-transparent" : "text-ink ring-line hover:bg-card"
            } ${own ? "bg-ink" : ""}`}
            style={arriving ? { transition: "color 140ms 110ms, transform 150ms" } : undefined}
          >
            <span className="relative">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Single multi-select chip (kept for any standalone use). */
export function ToggleChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-9 rounded-full px-3.5 text-[0.8125rem] font-semibold ring-1 ring-inset transition-colors duration-200 ${
        on ? "bg-ink text-on-ink ring-ink" : "bg-card text-ink ring-line hover:ring-ink/40"
      }`}
    >
      {children}
    </button>
  );
}
