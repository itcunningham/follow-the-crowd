export const FTC_DEBUG_PANEL_ENV = "NEXT_PUBLIC_FTC_DEBUG_PANEL";

export function isFtcDebugPanelEnabled(userId?: string | null): boolean {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  if (process.env[FTC_DEBUG_PANEL_ENV] === "true") {
    return true;
  }

  return Boolean(userId?.trim());
}

export function getDeployedCommitSha(): string {
  return process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
}
