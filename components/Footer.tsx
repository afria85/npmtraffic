import { getDonateLinks, getProjectGithubUrl } from "@/lib/donate";

export default function Footer() {
  const donateLinks = getDonateLinks();
  const projectGithubUrl = getProjectGithubUrl();
  return (
    <footer className="border-t border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-6 text-sm text-[color:var(--foreground)]/80">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        {donateLinks.length ? (
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">Support npmtraffic</p>
            <p className="mt-1 max-w-2xl text-xs text-[color:var(--muted)]">
              If npmtraffic is useful, consider supporting ongoing maintenance. Funding helps keep caching reliable,
              improve UX, and ship analysis-grade features over time.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {donateLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-100 transition hover:border-white/20 hover:bg-white/10"
                >
                  <span aria-hidden>{link.icon}</span>
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        ) : null}
        {projectGithubUrl ? (
          <a
            href={projectGithubUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-fit items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-100 transition hover:border-white/20 hover:bg-white/10"
          >
            ★ Star on GitHub
          </a>
        ) : null}
        <p className="text-xs text-[color:var(--muted)]">
          npmtraffic is not affiliated with npm, Inc. Data from api.npmjs.org.
        </p>
      </div>
    </footer>
  );
}
