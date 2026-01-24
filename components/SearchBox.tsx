"use client";

import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { POPULAR_PACKAGES } from "@/lib/constants";
import { addRecentSearch, loadRecentSearches } from "@/lib/recent-searches";
import { normalizePackageInput } from "@/lib/package-name";

type SearchResult = {
  name: string;
  version?: string;
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

type SearchBoxProps = {
  variant?: "inline" | "modal";
  className?: string;
  triggerLabel?: string;
};

const DEBOUNCE_MS = 300;
const POPULAR_LIMIT = 8;

function SearchPanel({
  autoFocus,
  onClose,
  className,
}: {
  autoFocus?: boolean;
  onClose?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const inputId = `${listId}-input`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>("idle");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recent, setRecent] = useState<string[]>(() => loadRecentSearches());
  const [requestId, setRequestId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isListOpen, setIsListOpen] = useState(false);

  const normalizedQuery = normalizePackageInput(query);
  const queryLower = normalizedQuery.toLowerCase();

  useEffect(() => {
    if (!autoFocus) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [autoFocus]);

  useEffect(() => {
    if (!normalizedQuery) {
      return;
    }

    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      setRequestId(null);
      setState("loading");
      try {
        const res = await fetch(
          `/api/v1/search?q=${encodeURIComponent(normalizedQuery)}&limit=10`,
          { signal: controller.signal }
        );
        const payload = (await res.json()) as {
          query?: string;
          items?: SearchResult[];
        };
        if (!res.ok) {
          setState("error");
          setResults([]);
          setRequestId(res.headers.get("x-request-id"));
          return;
        }
        setResults(payload.items ?? []);
        setRequestId(res.headers.get("x-request-id"));
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
    const matches = POPULAR_PACKAGES.filter((pkg) =>
      queryLower ? pkg.toLowerCase().includes(queryLower) : true
    );
    return matches.slice(0, POPULAR_LIMIT);
  }, [queryLower]);

  const recentMatches = useMemo(() => {
    const filtered = queryLower
      ? recent.filter((item) => item.toLowerCase().includes(queryLower))
      : recent.slice();
    const popularSet = new Set(popularMatches.map((item) => item.toLowerCase()));
    return filtered.filter((item) => !popularSet.has(item.toLowerCase()));
  }, [recent, queryLower, popularMatches]);

  const options = useMemo(() => {
    const list: DisplayOption[] = [];
    let index = 0;

    for (const name of popularMatches) {
      list.push({
        id: `${listId}-option-${index++}`,
        kind: "popular",
        label: name,
        value: name,
        helper: "Popular",
      });
    }

    for (const name of recentMatches) {
      list.push({
        id: `${listId}-option-${index++}`,
        kind: "recent",
        label: name,
        value: name,
        helper: "Recent",
      });
    }

    for (const item of results) {
      list.push({
        id: `${listId}-option-${index++}`,
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

  const selectPackage = (value: string) => {
    const merged = addRecentSearch(value);
    setRecent(merged);
    setIsListOpen(false);
    router.push(`/p/${encodeURIComponent(value)}?days=30`);
    onClose?.();
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
      if (activeOption) {
        selectPackage(activeOption.value);
        return;
      }
      if (normalizedQuery) {
        selectPackage(normalizedQuery);
      }
      return;
    }
    if (event.key === "Escape") {
      if (onClose) {
        onClose();
        return;
      }
      setIsListOpen(false);
    }
  };

  const statusMessage =
    state === "loading"
      ? "Searching npm registry..."
      : state === "error"
        ? "npm API temporarily unavailable."
        : null;

  return (
    <div className={className}>
      <div className="relative">
        <input
          id={inputId}
          name="q"
          ref={inputRef}
          value={query}
          onChange={(event) => {
            const nextValue = event.target.value;
            const normalized = normalizePackageInput(nextValue);
            setQuery(nextValue);
            setIsListOpen(true);
            setActiveIndex(-1);
            setRequestId(null);
            if (!normalized) {
              setResults([]);
              setState("idle");
            }
          }}
          onFocus={() => setIsListOpen(true)}
          onBlur={() => window.setTimeout(() => setIsListOpen(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder="Search npm packages"
          className="h-11 w-full rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOption?.id}
        />
        {state === "loading" ? (
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--accent)]" aria-hidden />
          </div>
        ) : null}
        {showList ? (
          <div
            className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-lg"
            role="listbox"
            id={listId}
          >
            <div className="max-h-72 overflow-auto p-2">
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  id={option.id}
                  role="option"
                  aria-selected={activeOption?.id === option.id}
                  className={[
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
                    activeOption?.id === option.id
                      ? "bg-black/5 text-[color:var(--foreground)]"
                      : "text-[color:var(--foreground)]/90 hover:bg-black/5"
                  ].join(" ")}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectPackage(option.value)}
                >
                  <span>{option.label}</span>
                  {option.helper ? (
                    <span className="max-w-[50%] truncate text-xs text-[color:var(--muted)]">
                      {option.helper}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {statusMessage ? (
        <p className="mt-2 text-xs text-slate-400" aria-live="polite">
          {statusMessage}
          {requestId ? ` (req ${requestId})` : ""}
        </p>
      ) : null}
    </div>
  );
}

export default function SearchBox({
  variant = "inline",
  className,
  triggerLabel = "Search packages",
}: SearchBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sheetId = "searchbox-sheet";

  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  if (variant === "inline") {
    return <SearchPanel className={className} />;
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="h-11 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 text-sm text-[color:var(--foreground)] transition hover:bg-[color:var(--surface-3)]"
        aria-expanded={isOpen}
        aria-controls={sheetId}
      >
        {triggerLabel}
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsOpen(false)}
          />
          <div
            id={sheetId}
            role="dialog"
            aria-modal="true"
            className="fixed bottom-0 left-0 right-0 h-[70vh] rounded-t-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[color:var(--foreground)]">Search packages</p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-9 rounded-full border border-[color:var(--border)] px-3 text-xs text-[color:var(--muted)]"
              >
                Close
              </button>
            </div>
            <div className="mt-4">
              <SearchPanel autoFocus onClose={() => setIsOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}