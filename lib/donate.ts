import type { DonateLink } from "@/types/donate";

const SOURCES: Array<{ env: string; label: string; icon: string }> = [
  { env: "NEXT_PUBLIC_DONATE_GITHUB_SPONSORS", label: "GitHub Sponsors", icon: "🐙" },
  { env: "NEXT_PUBLIC_DONATE_KOFI", label: "Ko-fi", icon: "☕️" },
  { env: "NEXT_PUBLIC_DONATE_BMAC", label: "BuyMeACoffee", icon: "☕" },
  { env: "NEXT_PUBLIC_DONATE_PAYPAL", label: "PayPal", icon: "💸" },
];

export function getDonateLinks(env: NodeJS.ProcessEnv = process.env) {
  return SOURCES.map((source) => {
    const url = env[source.env];
    if (!url) return null;
    return { label: source.label, icon: source.icon, url };
  }).filter((link): link is DonateLink => Boolean(link));
}

export function hasDonateLinks(env: NodeJS.ProcessEnv = process.env) {
  return getDonateLinks(env).length > 0;
}

export function getProjectGithubUrl(env: NodeJS.ProcessEnv = process.env) {
  return env.NEXT_PUBLIC_PROJECT_GITHUB?.trim() ?? null;
}
