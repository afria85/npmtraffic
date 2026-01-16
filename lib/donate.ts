import type { DonateLink } from "@/types/donate";

const SOURCES: Array<{ env: string; label: string; icon: string }> = [
  { env: "NEXT_PUBLIC_DONATE_GITHUB_SPONSORS", label: "GitHub Sponsors", icon: "🐙" },
  { env: "NEXT_PUBLIC_DONATE_KOFI", label: "Ko-fi", icon: "☕️" },
  { env: "NEXT_PUBLIC_DONATE_BMAC", label: "BuyMeACoffee", icon: "☕" },
  { env: "NEXT_PUBLIC_DONATE_PAYPAL", label: "PayPal", icon: "💸" },
];

export function resolveDonateLinks(env: NodeJS.ProcessEnv = process.env) {
  return SOURCES.map((source) => {
    const url = env[source.env];
    if (!url) return null;
    return { label: source.label, icon: source.icon, url };
  }).filter((link): link is DonateLink => Boolean(link));
}

export const donateLinks = resolveDonateLinks();
export const hasDonateLinks = donateLinks.length > 0;
export const projectGithubUrl =
  process.env.NEXT_PUBLIC_PROJECT_GITHUB?.trim() || null;
