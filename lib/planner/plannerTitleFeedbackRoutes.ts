/** Routes that render title feedback via PlannerWorkspacePageHeader slot (Gigs, Events list, etc.). */
export function usesPlannerWorkspaceTitleFeedbackSlot(pathname: string): boolean {
  if (pathname.startsWith("/events/")) {
    return false;
  }

  return (
    pathname === "/events" ||
    pathname === "/bookings" ||
    pathname.startsWith("/booking-plans") ||
    pathname === "/calendar"
  );
}
