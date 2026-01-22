const ANALYSIS_ROUTES = new Set(["/", "/compare", "/data"]);

function normalizePath(pathname: string) {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isCompareTrayAllowed(pathname: string) {
  const path = normalizePath(pathname);
  if (ANALYSIS_ROUTES.has(path)) return true;
  return path.startsWith("/p/");
}
