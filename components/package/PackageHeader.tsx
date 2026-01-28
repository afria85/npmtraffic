"use client";

import SearchBox from "@/components/SearchBox";
import CompareButton from "@/components/compare/CompareButton";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

function GitHubIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={className}
      fill="currentColor"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

type PackageHeaderProps = {
  name: string;
  updatedLabel: string | null;
  updatedLabelCompact: string | null;
  repoUrl?: string | null;
};

export default function PackageHeader({
  name,
  updatedLabel,
  updatedLabelCompact,
  repoUrl,
}: PackageHeaderProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className="min-w-0 break-all text-2xl font-semibold tracking-tight sm:text-3xl"
              title={name}
            >
              {name}
            </h1>
            <span
              className="inline-flex w-fit items-center whitespace-nowrap rounded-full border border-[color:var(--border)] bg-transparent px-3 py-1 text-[11px] font-medium text-[color:var(--muted)]"
              title={updatedLabel ?? "Updated recently"}
            >
              <span className="sm:hidden">{updatedLabelCompact ?? "Updated recently"}</span>
              <span className="hidden sm:inline">{updatedLabel ?? "Updated recently"}</span>
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="w-full sm:w-72">
            <div className="flex justify-end sm:hidden">
              <SearchBox variant="modal" triggerLabel="Search another package" />
            </div>
            <div className="hidden sm:block">
              <SearchBox />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <CompareButton name={name} />
            {repoUrl ? (
              <a
                href={repoUrl}
                target="_blank"
                rel="noreferrer"
                className={`${ACTION_BUTTON_CLASSES} h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm inline-flex items-center gap-2`}
                title={repoUrl}
                aria-label="View GitHub repository"
              >
                <GitHubIcon />
                <span className="hidden sm:inline">Repo</span>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
