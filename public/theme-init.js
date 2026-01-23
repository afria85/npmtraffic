(() => {
  try {
    const key = "npmtraffic_theme";
    const saved = localStorage.getItem(key);
    const system = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const theme = saved === "dark" || saved === "light" ? saved : system;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {
    // ignore
  }
})();
