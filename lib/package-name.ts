const MAX_PACKAGE_NAME_LENGTH = 214;

// FIX: Removed `i` flag — input is now always lowercased by
// normalizePackageInput(), so case-insensitive matching is unnecessary
// and would mask improperly normalized input.
const fullPackageRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
const allowedCharsRegex = /^[a-z0-9@._~/-]+$/i;

export type PackageNameValidation = {
  ok: boolean;
  error?: string;
};

export function normalizePackageInput(input: string) {
  // FIX: Lowercase during normalization. npm package names are
  // case-insensitive but the previous implementation only trimmed.
  // This caused cache key fragmentation where "React" and "react"
  // could produce separate cache entries.
  return input.trim().toLowerCase();
}

export function validatePackageName(name: string): PackageNameValidation {
  if (!name) {
    return { ok: false, error: "empty package name" };
  }
  if (name.length > MAX_PACKAGE_NAME_LENGTH) {
    return { ok: false, error: "package name too long" };
  }
  if (!fullPackageRegex.test(name)) {
    return { ok: false, error: "invalid package name" };
  }
  return { ok: true };
}

export function assertValidPackageName(name: string) {
  const result = validatePackageName(name);
  if (!result.ok) {
    throw new Error(`BAD_REQUEST: ${result.error}`);
  }
}

export function isAllowedPackageInput(input: string) {
  if (!input) return true;
  if (input.length > MAX_PACKAGE_NAME_LENGTH) return false;
  return allowedCharsRegex.test(input);
}

export { MAX_PACKAGE_NAME_LENGTH };
