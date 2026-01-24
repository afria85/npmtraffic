import { normalizePackageInput } from "@/lib/package-name";
import { canonicalizePackages } from "@/lib/query";

const STORAGE_KEY = "npmtraffic:compare";
export const COMPARE_UPDATED_EVENT = "npmtraffic:compare-updated";
const MAX_COMPARE = 5;

// React's useSyncExternalStore requires getSnapshot to return a stable
// reference when the underlying store hasn't changed. Cache parsed storage
// by raw payload to avoid infinite render loops in dev and hydration edge cases.
const EMPTY_LIST: string[] = [];
let cachedRaw: string | null = null;
let cachedList: string[] = EMPTY_LIST;

export function subscribeCompareList(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) handler();
  };
  window.addEventListener(COMPARE_UPDATED_EVENT, handler as EventListener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(COMPARE_UPDATED_EVENT, handler as EventListener);
    window.removeEventListener("storage", onStorage);
  };
}

export function clearCompareList() {
  if (typeof window === "undefined") return;
  saveCompareList([]);
  broadcastUpdate([]);
}

export function loadCompareList() {
  if (typeof window === "undefined") return EMPTY_LIST;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedList;
    cachedRaw = raw;
    if (!raw) {
      cachedList = EMPTY_LIST;
      return cachedList;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cachedList = EMPTY_LIST;
      return cachedList;
    }
    cachedList = parsed.filter((item) => typeof item === "string");
    return cachedList;
  } catch {
    cachedRaw = null;
    cachedList = EMPTY_LIST;
    return cachedList;
  }
}

export function saveCompareList(list: string[]) {
  if (typeof window === "undefined") return;
  const nextRaw = JSON.stringify(list);
  window.localStorage.setItem(STORAGE_KEY, nextRaw);
  cachedRaw = nextRaw;
  cachedList = list;
}

function broadcastUpdate(list: string[]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMPARE_UPDATED_EVENT, { detail: list }));
}

export function addToCompare(name: string) {
  const normalized = normalizePackageInput(name);
  if (!normalized) return loadCompareList();
  const list = loadCompareList();
  const next = [normalized, ...list.filter((item) => item.toLowerCase() !== normalized.toLowerCase())];
  const capped = next.slice(0, MAX_COMPARE);
  saveCompareList(capped);
  broadcastUpdate(capped);
  return capped;
}

export function removeFromCompare(name: string) {
  const list = loadCompareList();
  const lower = name.toLowerCase();
  const filtered = list.filter((item) => item.toLowerCase() !== lower);
  saveCompareList(filtered);
  broadcastUpdate(filtered);
  return filtered;
}

export function toggleCompare(name: string) {
  const list = loadCompareList();
  const lower = name.toLowerCase();
  if (list.some((item) => item.toLowerCase() === lower)) {
    return removeFromCompare(name);
  }
  return addToCompare(name);
}

export function buildCompareUrl(list: string[], days = 30) {
  const canonical = canonicalizePackages(list);
  if (canonical.length < 2) return null;
  const pkgs = canonical.map((pkg) => encodeURIComponent(pkg)).join(",");
  return `/compare?packages=${pkgs}&days=${days}`;
}

export { STORAGE_KEY, MAX_COMPARE, EMPTY_LIST };
