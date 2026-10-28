"use client";

import { AnimatePresence, motion, type PanInfo, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

/*
 * Overlays: one popover, one sheet, one drawer. All use critically damped springs (no bounce)
 * when opened by a tap; a sheet released after a drag keeps the finger's velocity, so the hand-off
 * from dragging to animating has no seam. Exit paths mirror entry paths.
 */
export const SPRING = { type: "spring", bounce: 0, duration: 0.35 } as const;

/** Apple's momentum projection: where a release at this velocity (px/s) would come to rest. */
const project = (velocity: number, rate = 0.998) => ((velocity / 1000) * rate) / (1 - rate);

export function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Escape closes, focus moves in on open and back to the trigger on close, page does not scroll. */
function useModalBehaviour(open: boolean, onClose: () => void, panel: React.RefObject<HTMLElement | null>, lockScroll: boolean) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current;
    first?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, onClose, panel, lockScroll]);
}

function Portal({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  return mounted ? createPortal(children, document.body) : null;
}

function Scrim({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      aria-hidden
      onClick={onClose}
      className="fixed inset-0 z-40 bg-[var(--scrim)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    />
  );
}

/**
 * Bottom sheet on phones (drag down to dismiss). On wider screens `centerOnDesktop` turns it into
 * a centred dialog that scales in from slightly smaller, since there is no bottom edge to come from.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  centerOnDesktop = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  centerOnDesktop?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const desktop = useMedia("(min-width: 768px)") && centerOnDesktop;
  useModalBehaviour(open, onClose, panel, true);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const h = panel.current?.offsetHeight ?? 400;
    if (info.offset.y + project(info.velocity.y) > h * 0.45) onClose();
  };

  const hidden = reduce ? { opacity: 0 } : desktop ? { opacity: 0, scale: 0.96 } : { y: "100%" };
  const shown = reduce ? { opacity: 1 } : desktop ? { opacity: 1, scale: 1 } : { y: 0 };

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <>
            <Scrim onClose={onClose} />
            <div className={`pointer-events-none fixed inset-0 z-50 flex ${desktop ? "items-center justify-center p-6" : "items-end"}`}>
              <motion.div
                ref={panel}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                initial={hidden}
                animate={shown}
                exit={hidden}
                transition={reduce ? { duration: 0.15 } : SPRING}
                drag={desktop || reduce ? false : "y"}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0.05, bottom: 0.9 }}
                onDragEnd={onDragEnd}
                className={`material-thick pointer-events-auto flex max-h-[88dvh] w-full flex-col outline-none ${
                  desktop ? "max-w-md rounded-2xl" : "rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
                }`}
              >
                {!desktop && <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted/40" />}
                <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
                  <h2 className="t-headline">{title}</h2>
                  <button type="button" onClick={onClose} className="-mr-2 min-h-10 rounded-md px-2 text-sm font-semibold text-muted hover:text-ink">
                    Close
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
                {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/** Navigation drawer: enters from the left edge (where the sidebar lives on desktop) and leaves the same way. */
export function Drawer({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  useModalBehaviour(open, onClose, panel, true);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const w = panel.current?.offsetWidth ?? 300;
    if (-(info.offset.x + project(info.velocity.x)) > w * 0.4) onClose();
  };
  const hidden = reduce ? { opacity: 0 } : { x: "-100%" };

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <>
            <Scrim onClose={onClose} />
            <motion.div
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-label={label}
              tabIndex={-1}
              initial={hidden}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={hidden}
              transition={reduce ? { duration: 0.15 } : SPRING}
              drag={reduce ? false : "x"}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0.9, right: 0.05 }}
              onDragEnd={onDragEnd}
              className="material-thick fixed inset-y-0 left-0 z-50 flex w-[min(20rem,86vw)] flex-col overflow-y-auto px-4 pb-[env(safe-area-inset-bottom)] pt-[max(1rem,env(safe-area-inset-top))] outline-none"
            >
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/**
 * Popover anchored to its trigger: it grows out of the button that opened it (transform-origin
 * at the trigger), and shrinks back into it. No scrim: it does not block the page.
 */
export function Popover({
  open,
  onClose,
  anchor,
  label,
  children,
  align = "start",
}: {
  open: boolean;
  onClose: () => void;
  anchor: React.RefObject<HTMLElement | null>;
  label: string;
  children: React.ReactNode;
  align?: "start" | "end";
}) {
  const panel = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number }>({ top: 0 });
  useModalBehaviour(open, onClose, panel, false);

  useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const place = () => {
      const r = anchor.current!.getBoundingClientRect();
      setPos(
        align === "start"
          ? { top: r.bottom + 8, left: Math.max(8, r.left) }
          : { top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) },
      );
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor, align]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !anchor.current?.contains(t)) onClose();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, onClose, anchor]);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panel}
            role="dialog"
            aria-label={label}
            tabIndex={-1}
            style={{ ...pos, transformOrigin: align === "start" ? "top left" : "top right" }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
            transition={reduce ? { duration: 0.12 } : { type: "spring", bounce: 0, duration: 0.28 }}
            className="material-thick fixed z-50 w-[22rem] max-w-[calc(100vw-1rem)] rounded-xl p-4 outline-none"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
