"use client";

import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { POPULAR_PACKAGES } from "@/lib/constants";
import { addRecentSearch, loadRecentSearches } from "@/lib/recent-searches";
import { normalizePackageInput } from "@/lib/package-name";

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
const POPULAR_LIMIT = 8;
const MAX_COMPARE = 5;

function uniqPreserveOrder(items: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export default function CompareAddBar({ packages, days, className }: Props) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>("idle");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recent, setRecent] = useState<string[]>(() => loadRecentSearches());
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isListOpen, setIsListOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const normalizedQuery = normalizePackageInput(query);
  const queryLower = normalizedQuery.toLowerCase();

  useEffect(() => {
    if (!normalizedQuery) return;

    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      setState("loading");
      setMessage(null);
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

  const popularMatches = useMemo(() => {
    const matches = POPULAR_PACKAGES.filter((pkg) => (queryLower ? pkg.toLowerCase().includes(queryLower) : true));
    return matches.slice(0, POPULAR_LIMIT);
  }, [queryLower]);

  const recentMatches = useMemo(() => {
    const filtered = queryLower ? recent.filter((item) => item.toLowerCase().includes(queryLower)) : recent.slice();
    const popularSet = new Set(popularMatches.map((item) => item.toLowerCase()));
    return filtered.filter((item) => !popularSet.has(item.toLowerCase()));
  }, [recent, queryLower, popularMatches]);

  const options = useMemo(() => {
    const list: DisplayOption[] = [];
    let idx = 0;

    for (const name of popularMatches) {
      list.push({
        id: `${listId}-opt-${idx++}`,
        kind: "popular",
        label: name,
        value: name,
        helper: "Popular",
      });
    }

    for (const name of recentMatches) {
      list.push({
        id: `${listId}-opt-${idx++}`,
        kind: "recent",
        label: name,
        value: name,
        helper: "Recent",
      });
    }

    for (const item of results) {
      list.push({
        id: `${listId}-opt-${idx++}`,
        kind: "result",
        label: item.name,
        value: item.name,
        helper: item.description,
      });
    }

    return list;
  }, [listId, popularMatches, recentMatches, results]);

  const activeOption = activeIndex >= 0 ? options[activeIndex] : null;
  const showList = isListOpen && options.length > 0;

  const navigateToCompare = (value: string) => {
    const next = normalizePackageInput(value);
    if (!next) return;

    const lowerSet = new Set(packages.map((p) => p.toLowerCase()));
    if (lowerSet.has(next.toLowerCase())) {
      setMessage("That package is already in the comparison.");
      setIsListOpen(false);
      return;
    }

    if (packages.length >= MAX_COMPARE) {
      setMessage(`Compare supports up to ${MAX_COMPARE} packages.`);
      setIsListOpen(false);
      return;
    }

    const mergedRecent = addRecentSearch(next);
    setRecent(mergedRecent);

    const nextPkgs = uniqPreserveOrder([...packages, next]);
    const canonical = nextPkgs.map((p) => encodeURIComponent(p)).join(",");
    router.push(`/compare?packages=${canonical}&days=${days}`);
    setQuery("");
    setResults([]);
    setIsListOpen(false);
    setActiveIndex(-1);
    setMessage(null);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

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
      navigateToCompare(activeOption?.value ?? normalizedQuery);
      return;
    }
    if (event.key === "Escape") {
      setIsListOpen(false);
      return;
    }
  };

  return (
    <div className={className}>
      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            const nextValue = event.target.value;
            const normalized = normalizePackageInput(nextValue);
            setQuery(nextValue);
            setIsListOpen(true);
            setActiveIndex(-1);
            setMessage(null);
            if (!normalized) {
              setResults([]);
              setState("idle");
            }
          }}
          onFocus={() => setIsListOpen(true)}
          onBlur={() => window.setTimeout(() => setIsListOpen(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder="Add a package to compare"
          className="h-11 w-full rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOption?.id}
        />

        {state === "loading" ? (
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
            <div
              className="h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--accent)]"
              aria-hidden
            />
          </div>
        ) : null}

        {showList ? (
          <div
            className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-lg"
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
                  aria-selected={activeOption?.id === option.id}
                  className={
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition " +
                    (index === activeIndex
                      ? "bg-[color:var(--accent)]/12 text-[color:var(--foreground)]"
                      : "text-[color:var(--foreground)] hover:bg-white/5")
                  }
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => navigateToCompare(option.value)}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {option.helper ? (
                    <span className="ml-3 hidden shrink-0 text-xs text-[color:var(--muted)] sm:inline">
                      {option.helper}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {message ? <p className="mt-2 text-xs text-amber-200">{message}</p> : null}
    </div>
  );
}
