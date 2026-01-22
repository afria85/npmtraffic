export function encodePkg(name: string) {
  return Buffer.from(name, "utf8").toString("base64url");
}

export function decodePkg(encoded: string) {
  try {
    if (!encoded) return null;
    const decoded = Buffer.from(encoded, "base64url").toString("utf8");
    return decoded || null;
  } catch {
    return null;
  }
}
