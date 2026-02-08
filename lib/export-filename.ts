import crypto from "node:crypto";
import { type RangeForDaysResult } from "@/lib/query";

const FILENAME_PREFIX = "npmtraffic__";
const MAX_FILENAME_LENGTH = 180;

function sanitizeSegment(value: string) {
  return value
    .replace(/\//g, "__")
    // FIX: Explicitly strip double quotes, backslashes, and control
    // characters to prevent Content-Disposition header injection when
    // the filename is placed inside `filename="..."`.
    .replace(/["\\]/g, "")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/[^a-zA-Z0-9@._-]/g, "_")
    .replace(/__+/g, "__");
}

function joinPackages(packages: string[]) {
  return packages
    .map((pkg) => sanitizeSegment(pkg))
    .filter(Boolean)
    .join("__")
    .replace(/__+/g, "__")
    .replace(/^__+|__+$/g, "");
}

export function buildExportFilename({
  packages,
  days,
  range,
  format,
}: {
  packages: string[];
  days: number;
  range: RangeForDaysResult;
  format: string;
}) {
  const pkgSegment = joinPackages(packages) || "packages";
  const base = `${FILENAME_PREFIX}${pkgSegment}__${days}d__${range.startDate}-${range.endDate}__utc`;
  const extension = format.startsWith(".") ? format.slice(1) : format;
  const candidate = `${base}.${extension}`;
  if (candidate.length <= MAX_FILENAME_LENGTH) return candidate;
  const hash = crypto.createHash("sha256").update(candidate).digest("hex").slice(0, 8);
  const suffix = `__${hash}.${extension}`;
  const allowedLength = MAX_FILENAME_LENGTH - suffix.length;
  const truncatedBase = base.slice(0, Math.max(0, allowedLength));
  return `${truncatedBase}${suffix}`;
}

export function sanitizeForFilename(value: string) {
  return sanitizeSegment(value);
}
