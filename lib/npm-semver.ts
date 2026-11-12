const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export function classifyVersion(value: string): "stable" | "prerelease" | null {
  const match = SEMVER.exec(value);
  if (!match || match[0] !== value) return null;
  const prerelease = match[4];
  if (!prerelease) return "stable";
  return prerelease.split(".").some((part) => /^0\d+$/.test(part)) ? null : "prerelease";
}
