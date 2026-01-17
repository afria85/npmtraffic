export function buildPackageCanonical(baseUrl: string, name: string, days: number) {
  const encoded = encodeURIComponent(name);
  return `${baseUrl}/p/${encoded}?days=${days}`;
}

export function buildCompareCanonical(baseUrl: string, packages: string[], days: number) {
  const canonicalPkgs = packages.map((pkg) => encodeURIComponent(pkg)).join(",");
  return `${baseUrl}/compare?packages=${canonicalPkgs}&days=${days}`;
}
