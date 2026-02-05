"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Hydration-safe "has mounted" signal without setState-in-effect.
 *
 * Server snapshot is always false. First client render during hydration is also false.
 * After the first client effect, we flip a module-level flag and notify subscribers.
 */
let hydrated = false;
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot() {
  return hydrated;
}

function getServerSnapshot() {
  return false;
}

export function useHydrated(): boolean {
  // Flip the module flag after mount and notify subscribers (no React setState).
  useEffect(() => {
    if (hydrated) return;
    hydrated = true;
    for (const l of Array.from(listeners)) l();
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
