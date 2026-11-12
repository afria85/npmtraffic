import { canonicalizePackages } from "@/lib/query";

export function buildPackageCanonical(baseUrl: string, name: string) {
  const encoded = encodeURIComponent(name);
  return `${baseUrl}/p/${encoded}`;
}

export function buildCompareCanonical(baseUrl: string, packages: string[]) {
  const canonicalPkgs = canonicalizePackages(packages);
  const base = `${baseUrl}/compare`;
  return canonicalPkgs.length >= 2 ? `${base}?packages=${canonicalPkgs.map(encodeURIComponent).join(",")}` : base;
}

export function buildPackageShareUrl(baseUrl: string, name: string, days: number) {
  return `${buildPackageCanonical(baseUrl, name)}?days=${days}`;
}
