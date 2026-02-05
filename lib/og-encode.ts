function hasBuffer(): boolean {
  // Edge Runtime may not provide Node's Buffer.
  return typeof (globalThis as unknown as { Buffer?: unknown }).Buffer !== "undefined";
}

function base64UrlFromBase64(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64FromBase64Url(base64url: string): string {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  return pad ? base64 + "=".repeat(4 - pad) : base64;
}

function encodeUtf8ToBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return base64UrlFromBase64(btoa(binary));
}

function decodeBase64UrlToUtf8(input: string): string {
  const base64 = base64FromBase64Url(input);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodePkg(name: string) {
  if (hasBuffer()) {
    const B = (globalThis as (typeof globalThis & { Buffer?: typeof Buffer })).Buffer;
    return B.from(name, "utf8").toString("base64url");
  }
  return encodeUtf8ToBase64Url(name);
}

export function decodePkg(encoded: string) {
  try {
    if (!encoded) return null;

    if (hasBuffer()) {
      const B = (globalThis as (typeof globalThis & { Buffer?: typeof Buffer })).Buffer;
      const decoded = B.from(encoded, "base64url").toString("utf8");
      return decoded || null;
    }

    const decoded = decodeBase64UrlToUtf8(encoded);
    return decoded || null;
  } catch {
    return null;
  }
}