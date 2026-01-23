// Keep this script in one place so CSP hashes remain stable.
// It is intentionally tiny and defensive: it runs before hydration to avoid theme flash.

export const THEME_INIT_SCRIPT = `(() => {
  try {
    const key = "npmtraffic_theme";
    const saved = localStorage.getItem(key);
    const system = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const theme = (saved === "dark" || saved === "light") ? saved : system;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {
    // ignore
  }
})();`;
