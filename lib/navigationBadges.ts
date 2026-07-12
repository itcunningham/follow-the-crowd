import { countPendingIncomingGigs } from "@/lib/bookingRequests";
import { getNavBadgeCounts, type NavBadgeCounts } from "@/lib/notifications";
import { canViewGigsSubNav } from "@/lib/plannerEventsNav";
import type { UserRole } from "@/lib/user/currentUser";

export type NavigationBadgeData = NavBadgeCounts & {
  gigsPending: number;
};

export async function loadNavigationBadgeData(
  userId: string,
  role: UserRole,
): Promise<NavigationBadgeData> {
  const [navCounts, gigsPending] = await Promise.all([
    getNavBadgeCounts(userId, role),
    canViewGigsSubNav(role) ? countPendingIncomingGigs() : Promise.resolve(0),
  ]);

  return {
    ...navCounts,
    gigsPending,
  };
}
