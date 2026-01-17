import { normalizePackageInput } from "@/lib/package-name";
import { canonicalizePackages } from "@/lib/query";

const STORAGE_KEY = "npmtraffic:compare";
export const COMPARE_UPDATED_EVENT = "npmtraffic:compare-updated";
const MAX_COMPARE = 5;

export function loadCompareList() {
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

export function saveCompareList(list: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
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

export { STORAGE_KEY, MAX_COMPARE };
