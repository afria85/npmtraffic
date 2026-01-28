import type { Config } from "tailwindcss";

// Tailwind v4 defaults to media-based dark mode. We use class + data-theme so a user
// override (stored in localStorage) is deterministic across refresh and SSR hydration.
const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
};

export default config;
