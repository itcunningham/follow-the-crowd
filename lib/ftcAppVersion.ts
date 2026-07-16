const BUILD_ID_FALLBACK = "Local";
const BUILD_ID_LENGTH = 7;

/** Private-beta product version — sourced from package.json via next.config.ts at build time. */
export const FTC_APP_VERSION =
  process.env.NEXT_PUBLIC_FTC_APP_VERSION?.trim() || "0.9.0";

/**
 * Sanitizes build metadata for safe client display.
 * Accepts only git-style hex; caps length so unknown values cannot break layout.
 */
export function sanitizeFtcBuildId(raw: string | undefined): string {
  if (!raw?.trim()) {
    return BUILD_ID_FALLBACK;
  }

  const trimmed = raw.trim();
  if (trimmed.toLowerCase() === BUILD_ID_FALLBACK.toLowerCase()) {
    return BUILD_ID_FALLBACK;
  }

  const sanitized = trimmed.replace(/[^a-fA-F0-9]/g, "").slice(0, BUILD_ID_LENGTH);
  return sanitized.length >= 4 ? sanitized.toLowerCase() : BUILD_ID_FALLBACK;
}

/** Short deployment identifier injected at build time (see next.config.ts). */
export function getFtcBuildId(): string {
  return sanitizeFtcBuildId(process.env.NEXT_PUBLIC_FTC_BUILD_ID);
}

/** User-facing label for Settings and bug reports. */
export function formatFtcAppVersionLabel(): string {
  return `FTC Private Beta ${FTC_APP_VERSION} · Build ${getFtcBuildId()}`;
}
