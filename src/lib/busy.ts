"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { busyStore } from "./api";

/**
 * True while data requests are in flight. Turns on only after `delayMs`, so a fast cached
 * response never flashes the indicator; turns off as soon as the last request settles.
 */
export function useBusy(delayMs = 150) {
  const count = useSyncExternalStore(busyStore.subscribe, busyStore.get, () => 0);
  const episode = useSyncExternalStore(busyStore.subscribe, busyStore.episode, () => 0);
  const [readyFor, setReadyFor] = useState(-1);
  useEffect(() => {
    if (count === 0) return;
    const t = setTimeout(() => setReadyFor(episode), delayMs);
    return () => clearTimeout(t);
  }, [count, episode, delayMs]);
  return count > 0 && readyFor === episode;
}
