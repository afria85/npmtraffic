import { getDonateLinks, getProjectGithubUrl } from "@/lib/donate";

const PILL =
  "inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-xs uppercase tracking-[0.3em] text-[color:var(--foreground)] transition hover:border-[color:var(--border)]/80 hover:bg-[color:var(--surface)]/80";

export default function Footer() {
  const donateLinks = getDonateLinks();
  const projectGithubUrl = getProjectGithubUrl();
  return (
    <footer className="border-t border-[color:var(--border)] bg-[color:var(--surface)]/60 px-4 py-6 text-sm text-[color:var(--foreground)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        {donateLinks.length ? (
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">Support npmtraffic</p>
            <p className="mt-1 max-w-2xl text-xs text-[color:var(--muted)]">
              If npmtraffic is useful, consider supporting ongoing maintenance. Funding helps keep caching reliable, improve UX, and ship analysis-grade features over time.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {donateLinks.map((link) => (
                <a key={link.label} href={link.url} target="_blank" rel="noreferrer" className={PILL}>
                  <span aria-hidden>{link.icon}</span>
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {projectGithubUrl ? (
          <a href={projectGithubUrl} target="_blank" rel="noreferrer" className={PILL}>
            Star on GitHub
          </a>
        ) : null}

        <p className="text-xs text-[color:var(--muted)]">
          npmtraffic is not affiliated with npm, Inc. Data from api.npmjs.org.
        </p>
      </div>
    </footer>
  );
}
