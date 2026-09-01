/**
 * Regression-test entry for Gigs badge cache + resolver.
 * Import this module from scripts/test-regressions.mts (via ../lib/…) so every
 * symbol shares one navigationBadgeCache instance under tsx — not @/ from the
 * .mts entry, which loads a second copy through a different Node loader.
 */
export {
  applyPersistedGigsPendingCount,
  clearNavigationBadgeCache,
  clearWorkspaceGigsDisplaySession,
  clearWorkspaceGigsSubNavDisplayLatch,
  getCachedGigsPendingCount,
  writeRuntimeGigsPendingCount,
} from "@/lib/navigationBadgeCache";

export {
  readWorkspaceGigsBadgeDisplayCountForSubNav,
  resolveStableGigsPendingCount,
  resolveWorkspaceGigsPendingDisplayCount,
} from "@/lib/navigation/resolveWorkspaceGigsPendingDisplayCount";
