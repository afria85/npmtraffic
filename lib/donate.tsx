import type { DonateLink } from "@/types/donate";

const ICONS: Record<string, DonateLink["icon"]> = {
  github: (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden>
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8a7.93 7.93 0 0 0 5.47 7.59c.4.08.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.86 2.33.66.07-.52.28-.86.51-1.06-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.63 7.63 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.10.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.28.24.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A7.93 7.93 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  ),
  kofi: (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden>
      <rect x="3" y="5" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 5h2a2 2 0 0 1 0 4h-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="6" cy="7.5" r="1" fill="currentColor" />
    </svg>
  ),
  bmac: (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden>
      <path
        fill="currentColor"
        d="M4 3.5h3.5a1.5 1.5 0 0 1 0 3H4v6h3.5a1.5 1.5 0 0 1 0 3H3a.5.5 0 0 1-.5-.5v-12A.5.5 0 0 1 3 3.5z"
      />
      <path
        fill="currentColor"
        d="M9.5 3.5H13a.5.5 0 0 1 .5.5v12a.5.5 0 0 1-.5.5H9.5a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 9.5 3.5z"
      />
    </svg>
  ),
  paypal: (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden>
      <path
        fill="currentColor"
        opacity="0.18"
        d="M6.5 2.3h4.1c1.9 0 3.2 1.0 3.2 2.7 0 2.1-1.5 3.3-3.8 3.3H8.4l-.7 3.4H5.8L6.5 2.3z"
      />
      <path
        fill="currentColor"
        d="M5.7 2.3h4.0c2.1 0 3.3 1.0 3.3 2.6 0 2.2-1.6 3.5-4.0 3.5H7.8l-.7 3.3H4.9L5.7 2.3z"
      />
    </svg>
  ),
};

const SOURCES: Array<{ env: string; label: string; icon: keyof typeof ICONS }> = [
  { env: "NEXT_PUBLIC_DONATE_GITHUB_SPONSORS", label: "GitHub Sponsors", icon: "github" },
  { env: "NEXT_PUBLIC_DONATE_KOFI", label: "Ko-fi", icon: "kofi" },
  { env: "NEXT_PUBLIC_DONATE_BMAC", label: "BuyMeACoffee", icon: "bmac" },
  { env: "NEXT_PUBLIC_DONATE_PAYPAL", label: "PayPal", icon: "paypal" },
];

export function getDonateLinks(env: NodeJS.ProcessEnv = process.env) {
  return SOURCES.map((source) => {
    const url = env[source.env];
    if (!url) return null;
    return { label: source.label, icon: ICONS[source.icon], url };
  }).filter((link): link is DonateLink => Boolean(link));
}

export function hasDonateLinks(env: NodeJS.ProcessEnv = process.env) {
  return getDonateLinks(env).length > 0;
}

export function getProjectGithubUrl(env: NodeJS.ProcessEnv = process.env) {
  return env.NEXT_PUBLIC_PROJECT_GITHUB?.trim() ?? null;
}
