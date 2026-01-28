"use client";

import SearchBox from "@/components/SearchBox";
import CompareButton from "@/components/compare/CompareButton";
import { ACTION_BUTTON_CLASSES } from "@/components/ui/action-button";

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
                className={`${ACTION_BUTTON_CLASSES} h-9 px-3 text-xs sm:h-10 sm:text-sm`}
                title={repoUrl}
              >
                <span className="sm:hidden">Repo</span>
                <span className="hidden sm:inline">GitHub repo</span>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
