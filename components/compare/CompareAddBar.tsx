"use client";

import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useHydrated } from "@/lib/hydrated";
import { useEffect, useCallback, useId, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { COMPARE_UPDATED_EVENT, MAX_COMPARE, saveCompareList } from "@/lib/compare-store";
import { POPULAR_PACKAGES } from "@/lib/constants";
import { addRecentSearch, loadRecentSearches, subscribeRecentSearches } from "@/lib/recent-searches";
import { normalizePackageInput, validatePackageName } from "@/lib/package-name";
import { canonicalizePackages } from "@/lib/query";

type SearchResult = {
  name: string;
  description?: string;
};

type SearchState = "idle" | "loading" | "error";

type OptionKind = "popular" | "recent" | "result";

type DisplayOption = {
  id: string;
  kind: OptionKind;
  label: string;
  value: string;
  helper?: string;
};

type Props = {
  packages: string[];
  days: number;
  className?: string;
};

const DEBOUNCE_MS = 300;

// React requires getServerSnapshot to return a cached value.
const EMPTY_SNAPSHOT: string[] = [];
const getEmptySnapshot = () => EMPTY_SNAPSHOT;
const POPULAR_LIMIT = 8;

export default function CompareAddBar({ packages, days, className }: Props) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const suppressOpenRef = useRef(false);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>("idle");
  const [results, setResults] = useState<SearchResult[]>([]);
  const hydrated = useHydrated();
  const getClientSnapshot = useCallback(() => {
    return hydrated ? loadRecentSearches() : EMPTY_SNAPSHOT;
  }, [hydrated]);
  const recent = useSyncExternalStore(subscribeRecentSearches, getClientSnapshot, getEmptySnapshot);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isListOpen, setIsListOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isNavigating, startNavigation] = useTransition();
  const isBusy = isValidating || isNavigating;

  const normalizedQuery = normalizePackageInput(query);
  const queryLower = normalizedQuery.toLowerCase();

  useEffect(() => {
    if (!normalizedQuery) return;

    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      setState("loading");
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(normalizedQuery)}&limit=10`, {
          signal: controller.signal,
        });
        const payload = (await res.json()) as { items?: SearchResult[] };
        if (!res.ok) {
          setState("error");
          setResults([]);
          return;
        }
        if (controller.signal.aborted) return;
        setResults(payload.items ?? []);
        setState("idle");
      } catch {
        if (controller.signal.aborted) return;
        setState("error");
        setResults([]);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [normalizedQuery]);

  const popularMatches = POPULAR_PACKAGES.filter((pkg) => pkg.toLowerCase().includes(queryLower)).slice(0, POPULAR_LIMIT);
  const options: DisplayOption[] = [];
  const seen = new Set<string>();
  const addOption = (name: string, kind: OptionKind, helper?: string) => {
    const value = normalizePackageInput(name);
    if (seen.has(value) || !validatePackageName(value).ok) return;
    seen.add(value);
    options.push({ id: listId + "-opt-" + options.length, kind, label: name, value, helper });
  };
  for (const name of popularMatches) addOption(name, "popular", "Popular");
  for (const name of recent) {
    if (name.toLowerCase().includes(queryLower)) addOption(name, "recent", "Recent");
  }
  for (const item of results) addOption(item.name, "result", item.description);

  const activeOption = activeIndex >= 0 ? options[activeIndex] : null;
  const showList = isListOpen && options.length > 0;

  function updateComparison(next: string[]) {
    const sorted = canonicalizePackages(next);
    const names = sorted.map(encodeURIComponent).join(",");
    try {
      saveCompareList(sorted);
      window.dispatchEvent(new CustomEvent(COMPARE_UPDATED_EVENT));
    } catch {
      // The URL still carries the comparison when browser storage is unavailable.
    }
    const url = "/compare?" + (names ? "packages=" + names + "&" : "") + "days=" + days;
    setQuery("");
    setResults([]);
    setIsListOpen(false);
    setActiveIndex(-1);
    setMessage(null);
    const input = inputRef.current;
    if (input && document.activeElement !== input) {
      suppressOpenRef.current = true;
      input.focus();
    }
    startNavigation(() => router.push(url, { scroll: false }));
  }

  async function addPackage(value: string, knownPackage: boolean) {
    if (isBusy) return;
    const next = normalizePackageInput(value);
    if (!validatePackageName(next).ok) {
      setMessage("Enter a valid npm package name.");
      return;
    }

    if (packages.includes(next)) {
      setMessage("That package is already in the comparison.");
      setIsListOpen(false);
      setActiveIndex(-1);
      suppressOpenRef.current = true;
      window.setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    if (packages.length >= MAX_COMPARE) {
      setMessage(`Compare supports up to ${MAX_COMPARE} packages.`);
      setIsListOpen(false);
      setActiveIndex(-1);
      suppressOpenRef.current = true;
      window.setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    if (!knownPackage) {
      setIsValidating(true);
      setMessage(null);
      try {
        const response = await fetch("/api/v1/validate/" + encodeURIComponent(next) + "/exists");
        if (response.status === 404) {
          setMessage("Package not found in the npm registry.");
          return;
        }
        if (!response.ok) throw new Error("Package lookup failed");
      } catch {
        setMessage("Package lookup failed. Try again.");
        return;
      } finally {
        setIsValidating(false);
      }
    }
    try {
      addRecentSearch(next);
    } catch {
      // Recent searches are optional when browser storage is unavailable.
    }
    updateComparison([...packages, next]);
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!options.length) return;
      setIsListOpen(true);
      setActiveIndex((prev) => Math.min(prev + 1, options.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!options.length) return;
      setIsListOpen(true);
      setActiveIndex((prev) => (prev <= 0 ? 0 : prev - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const selected = showList ? activeOption : null;
      void addPackage(selected?.value ?? normalizedQuery, Boolean(selected && selected.kind !== "recent"));
      return;
    }
    if (event.key === "Escape") {
      setIsListOpen(false);
      setActiveIndex(-1);
      return;
    }
  };

  return (
    // NOTE: some browser extensions inject random attributes (ids/guids) into these wrappers
    // before React hydrates. Those injected attributes are nondeterministic and can trigger
    // hydration mismatch warnings or even a client-side re-mount in production.
    // We don't control the extension behavior, so we explicitly suppress hydration warnings
    // for this small subtree.
    <div className={className} suppressHydrationWarning>
      {packages.length ? (
        <ul aria-label="Packages in comparison" className="mb-2 flex flex-wrap gap-2">
          {packages.map((name) => (
            <li key={name} className="min-w-0 max-w-full">
              <button type="button" aria-label={"Remove " + name} disabled={isBusy}
                onClick={() => updateComparison(packages.filter((pkg) => pkg !== name))}
                className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-left text-xs text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
                <span className="min-w-0 break-all">{name}</span>
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="relative" suppressHydrationWarning>
        <input id="compare-add" name="compare"
          ref={inputRef}
          value={query}
          readOnly={isBusy}
          onChange={(event) => {
            const nextValue = event.target.value;
            setQuery(nextValue);
            setIsListOpen(true);
            setActiveIndex(-1);
            setMessage(null);
            if (normalizePackageInput(nextValue) !== normalizedQuery) {
              setResults([]);
              setState("idle");
            }
          }}
          onFocus={() => {
            if (suppressOpenRef.current) {
              suppressOpenRef.current = false;
              return;
            }
            if (message) setMessage(null);
            setIsListOpen(true);
          }}
          onPointerDown={() => {
            // On mobile, tapping an already-focused input may not reliably fire `onClick`.
            // Use pointer events so the list re-opens consistently.
            if (suppressOpenRef.current) suppressOpenRef.current = false;
            if (message) setMessage(null);
            setIsListOpen(true);
          }}
          onBlur={() => window.setTimeout(() => setIsListOpen(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder="Add a package to compare"
          className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          role="combobox"
          aria-label="Add a package to compare"
          aria-busy={isBusy}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? activeOption?.id : undefined}
        />

        {state === "loading" || isValidating ? (
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
            <div
              className="h-4 w-4 animate-spin rounded-lg border-2 border-[var(--border)] border-t-[var(--accent)]"
              aria-hidden
            />
          </div>
        ) : null}

        {showList ? (
          <div
            className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg"
            role="listbox"
            id={listId}
          >
            <div className="max-h-72 overflow-auto p-2">
              {options.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  id={option.id}
                  role="option"
                  tabIndex={-1}
                  disabled={isBusy}
                  aria-selected={activeOption?.id === option.id}
                  className={
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition " +
                    (index === activeIndex
                      ? "bg-[var(--accent)]/12 text-[var(--foreground)]"
                      : "text-[var(--foreground)] hover:bg-[var(--surface)]")
                  }
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void addPackage(option.value, option.kind !== "recent")}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {option.helper ? (
                    <span className="ml-3 hidden shrink-0 text-xs text-[var(--foreground-tertiary)] sm:inline">
                      {option.helper}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <p role="status" className={message ? "mt-2 text-xs text-[color:var(--warning)]" : "sr-only"}>{message}</p>
    </div>
  );
}
