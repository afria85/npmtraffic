"use client";

import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { POPULAR_PACKAGES } from "@/lib/constants";
import { addRecentSearch, loadRecentSearches } from "@/lib/recent-searches";
import { isAllowedPackageInput, normalizePackageInput } from "@/lib/package-name";

type ValidationState = {
  status: "idle" | "loading" | "valid" | "notfound" | "error";
  requestId?: string;
  name?: string;
  message?: string;
};

type OptionKind = "popular" | "recent" | "result";

type DisplayOption = {
  id: string;
  kind: OptionKind;
  label: string;
  value: string;
  helper?: string;
  disabled?: boolean;
};

type PackageSearchProps = {
  variant?: "inline" | "modal";
  triggerLabel?: string;
  className?: string;
};

const DEBOUNCE_MS = 450;
const POPULAR_LIMIT = 8;

function buildOptions({
  listId,
  popular,
  recent,
  validation,
  query,
}: {
  listId: string;
  popular: string[];
  recent: string[];
  validation: ValidationState;
  query: string;
}) {
  const options: DisplayOption[] = [];
  let index = 0;

  for (const name of popular) {
    options.push({
      id: `${listId}-option-${index++}`,
      kind: "popular",
      label: name,
      value: name,
    });
  }

  for (const name of recent) {
    options.push({
      id: `${listId}-option-${index++}`,
      kind: "recent",
      label: name,
      value: name,
    });
  }

  if (validation.status === "valid" && validation.name) {
    options.push({
      id: `${listId}-option-${index++}`,
      kind: "result",
      label: validation.name,
      value: validation.name,
      helper: "Package found",
    });
  }

  if (validation.status === "notfound" && query) {
    options.push({
      id: `${listId}-option-${index++}`,
      kind: "result",
      label: query,
      value: query,
      helper: "Not found in registry",
      disabled: true,
    });
  }

  if (validation.status === "error" && query) {
    options.push({
      id: `${listId}-option-${index++}`,
      kind: "result",
      label: query,
      value: query,
      helper: validation.message ?? "Registry lookup failed",
      disabled: true,
    });
  }

  return options;
}

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [isListOpen, setIsListOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const [validation, setValidation] = useState<ValidationState>({ status: "idle" });
  const [inlineError, setInlineError] = useState<string | null>(null);

  const normalizedQuery = normalizePackageInput(query);
  const queryLower = normalizedQuery.toLowerCase();
  const inputAllowed = isAllowedPackageInput(normalizedQuery);

  useEffect(() => {
    setRecent(loadRecentSearches());
  }, []);

  useEffect(() => {
    if (!autoFocus) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [autoFocus]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [normalizedQuery]);

  useEffect(() => {
    setInlineError(null);
    if (!normalizedQuery) {
      setValidation({ status: "idle" });
      return;
    }
    if (!inputAllowed) {
      setValidation({ status: "error", message: "Invalid package name" });
      return;
    }

    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      setValidation({ status: "loading" });
      try {
        const res = await fetch(
          `/api/v1/validate/${encodeURIComponent(normalizedQuery)}/exists`,
          { signal: controller.signal }
        );
        const payload = (await res.json()) as {
          requestId?: string;
          name?: string;
          exists?: boolean;
          error?: { message?: string };
        };
        if (res.ok) {
          setValidation({
            status: "valid",
            requestId: payload.requestId,
            name: payload.name ?? normalizedQuery,
          });
          return;
        }
        if (res.status === 404) {
          setValidation({
            status: "notfound",
            requestId: payload.requestId,
            name: payload.name ?? normalizedQuery,
          });
          return;
        }
        setValidation({
          status: "error",
          requestId: payload.requestId,
          message: payload.error?.message ?? "Registry lookup failed",
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setValidation({ status: "error", message: "Registry lookup failed" });
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [normalizedQuery, inputAllowed]);

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

  const displayOptions = useMemo(
    () =>
      buildOptions({
        listId,
        popular: popularMatches,
        recent: recentMatches,
        validation,
        query: normalizedQuery,
      }),
    [listId, popularMatches, recentMatches, validation, normalizedQuery]
  );

  const selectableOptions = displayOptions.filter((option) => !option.disabled);
  const activeOption = activeIndex >= 0 ? selectableOptions[activeIndex] : null;

  const showList = isListOpen && displayOptions.length > 0;

  const statusMessage = (() => {
    if (validation.status === "loading") return "Checking registry...";
    if (validation.status === "valid") return "Package exists";
    if (validation.status === "notfound") return "Package not found";
    if (validation.status === "error") return validation.message ?? "Registry lookup failed";
    return null;
  })();

  const statusRequestId = validation.requestId ? ` (req ${validation.requestId})` : "";

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
      if (!selectableOptions.length) return;
      setIsListOpen(true);
      setActiveIndex((prev) => Math.min(prev + 1, selectableOptions.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!selectableOptions.length) return;
      setIsListOpen(true);
      setActiveIndex((prev) => (prev <= 0 ? 0 : prev - 1));
      return;
    }
    if (event.key === "Enter") {
      if (activeOption) {
        event.preventDefault();
        selectPackage(activeOption.value);
        return;
      }
      if (validation.status === "valid" && validation.name) {
        event.preventDefault();
        selectPackage(validation.name);
        return;
      }
      if (validation.status === "notfound") {
        event.preventDefault();
        setInlineError("Package not found.");
      }
      return;
    }
    if (event.key === "Escape") {
      if (onClose) {
        event.preventDefault();
        onClose();
        return;
      }
      setIsListOpen(false);
    }
  };

  return (
    <div className={className}>
      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsListOpen(true);
          }}
          onFocus={() => setIsListOpen(true)}
          onBlur={() => window.setTimeout(() => setIsListOpen(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder="Search npm packages"
          className="h-11 w-full rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-slate-400 focus:border-white/30 focus:outline-none"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOption?.id}
        />
        {showList ? (
          <div
            className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0d141c] shadow-lg"
            role="listbox"
            id={listId}
          >
            <div className="max-h-72 overflow-auto p-2">
              {popularMatches.length > 0 ? (
                <p className="px-2 pb-1 text-xs uppercase tracking-widest text-slate-500">
                  Popular
                </p>
              ) : null}
              {displayOptions
                .filter((option) => option.kind === "popular")
                .map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    id={option.id}
                    role="option"
                    aria-selected={activeOption?.id === option.id}
                    className={[
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
                      activeOption?.id === option.id
                        ? "bg-white/10 text-white"
                        : "text-slate-200 hover:bg-white/5",
                    ].join(" ")}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectPackage(option.value)}
                  >
                    <span>{option.label}</span>
                    <span className="text-xs text-slate-500">Popular</span>
                  </button>
                ))}

              {recentMatches.length > 0 ? (
                <p className="px-2 pb-1 pt-3 text-xs uppercase tracking-widest text-slate-500">
                  Recent
                </p>
              ) : null}
              {displayOptions
                .filter((option) => option.kind === "recent")
                .map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    id={option.id}
                    role="option"
                    aria-selected={activeOption?.id === option.id}
                    className={[
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
                      activeOption?.id === option.id
                        ? "bg-white/10 text-white"
                        : "text-slate-200 hover:bg-white/5",
                    ].join(" ")}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectPackage(option.value)}
                  >
                    <span>{option.label}</span>
                    <span className="text-xs text-slate-500">Recent</span>
                  </button>
                ))}

              {displayOptions.some((option) => option.kind === "result") ? (
                <p className="px-2 pb-1 pt-3 text-xs uppercase tracking-widest text-slate-500">
                  Result
                </p>
              ) : null}
              {displayOptions
                .filter((option) => option.kind === "result")
                .map((option) => (
                  <div
                    key={option.id}
                    id={option.id}
                    role="option"
                    aria-selected={activeOption?.id === option.id}
                    aria-disabled={option.disabled}
                    className={[
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                      option.disabled
                        ? "cursor-not-allowed text-slate-500"
                        : activeOption?.id === option.id
                          ? "bg-white/10 text-white"
                          : "text-slate-200",
                    ].join(" ")}
                  >
                    <span>{option.label}</span>
                    {option.helper ? (
                      <span className="text-xs text-slate-500">{option.helper}</span>
                    ) : null}
                  </div>
                ))}
            </div>
          </div>
        ) : null}
      </div>

      {inlineError ? (
        <p className="mt-2 text-xs text-rose-300" aria-live="polite">
          {inlineError}
        </p>
      ) : null}
      {statusMessage ? (
        <p className="mt-2 text-xs text-slate-400" aria-live="polite">
          {statusMessage}
          {statusRequestId}
        </p>
      ) : null}
    </div>
  );
}

export default function PackageSearch({
  variant = "inline",
  triggerLabel = "Search packages",
  className,
}: PackageSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sheetId = "package-search-sheet";

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
        className="h-11 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-slate-100 transition hover:border-white/20 hover:bg-white/10"
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
            className="fixed bottom-0 left-0 right-0 h-[70vh] rounded-t-2xl border border-white/10 bg-[#0b1119] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">Search packages</p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-9 rounded-full border border-white/10 px-3 text-xs text-slate-300"
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
