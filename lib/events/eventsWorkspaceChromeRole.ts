import { readCachedNavRole } from "@/lib/navigationRoleCache";
import { mergeWorkspaceNavRole } from "@/lib/plannerEventsNav";
import type { UserRole } from "@/lib/user/currentUser";

/** Same role merge as workspace sub-nav and Events list chrome (cache + guard, prefer fullest role). */
export function resolveEventsWorkspaceChromeRole(
  ...candidates: Array<UserRole | null | undefined>
): UserRole | null {
  return mergeWorkspaceNavRole(...candidates, readCachedNavRole());
}
