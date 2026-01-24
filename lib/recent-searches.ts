import { normalizePackageInput } from "@/lib/package-name";

const STORAGE_KEY = "npmtraffic:recent";
export const RECENT_UPDATED_EVENT = "npmtraffic:recent-updated";
const MAX_RECENT = 10;

export function subscribeRecentSearches(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) handler();
  };
  window.addEventListener(RECENT_UPDATED_EVENT, handler as EventListener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(RECENT_UPDATED_EVENT, handler as EventListener);
    window.removeEventListener("storage", onStorage);
  };
}

export function mergeRecentSearches(list: string[], next: string, limit = MAX_RECENT) {
  const normalized = normalizePackageInput(next);
  if (!normalized) return list.slice(0, limit);
  const lower = normalized.toLowerCase();
  const deduped = list.filter((item) => item.toLowerCase() !== lower);
  return [normalized, ...deduped].slice(0, limit);
}

export function loadRecentSearches() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item === "string");
  } catch {
    return [];
  }
}

function broadcastUpdate(list: string[]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RECENT_UPDATED_EVENT, { detail: list }));
}

export function saveRecentSearches(list: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  broadcastUpdate(list);
}

export function addRecentSearch(next: string) {
  const current = loadRecentSearches();
  const merged = mergeRecentSearches(current, next);
  saveRecentSearches(merged);
  return merged;
}

export { STORAGE_KEY, MAX_RECENT };
