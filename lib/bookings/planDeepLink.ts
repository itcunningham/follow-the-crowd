export const PENDING_BOOKING_PLAN_ID_KEY = "ftc-pending-booking-plan-id";
export const BOOKING_PLANS_SUCCESS_MESSAGE_KEY = "ftc-booking-plans-success-message";

export function stashPendingBookingPlanId(planId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(PENDING_BOOKING_PLAN_ID_KEY, planId);
}

export function clearPendingBookingPlanId(): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(PENDING_BOOKING_PLAN_ID_KEY);
}

export function readPendingBookingPlanId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = sessionStorage.getItem(PENDING_BOOKING_PLAN_ID_KEY)?.trim();
  return value || null;
}

export function stashBookingPlansSuccessMessage(message: string): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(BOOKING_PLANS_SUCCESS_MESSAGE_KEY, message);
}

export function consumeBookingPlansSuccessMessage(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = sessionStorage.getItem(BOOKING_PLANS_SUCCESS_MESSAGE_KEY)?.trim();

  if (!value) {
    return null;
  }

  sessionStorage.removeItem(BOOKING_PLANS_SUCCESS_MESSAGE_KEY);
  return value;
}

type SearchParamsLike = {
  get(name: string): string | null;
};

export function resolveBookingPlanDeepLinkId(searchParams: SearchParamsLike): string | null {
  const fromParams = searchParams.get("planId")?.trim();
  if (fromParams) {
    return fromParams;
  }

  if (typeof window !== "undefined") {
    const fromLocation = new URLSearchParams(window.location.search).get("planId")?.trim();
    if (fromLocation) {
      return fromLocation;
    }
  }

  return readPendingBookingPlanId();
}

export type BookingsDeepLinkIntent =
  | { type: "plan"; planId: string; eventDate?: string }
  | { type: "create-booking"; eventDate?: string }
  | { type: "create-plan"; eventDate?: string };

export function resolveBookingsDeepLinkIntent(
  searchParams: SearchParamsLike,
): BookingsDeepLinkIntent | null {
  const eventDate = searchParams.get("eventDate")?.trim() || undefined;
  const planId = resolveBookingPlanDeepLinkId(searchParams);

  if (planId) {
    return { type: "plan", planId, eventDate };
  }

  const createParam = searchParams.get("create");

  if (createParam === "booking") {
    return { type: "create-booking", eventDate };
  }

  if (createParam === "plan") {
    return { type: "create-plan", eventDate };
  }

  return null;
}

export function getBookingsDeepLinkKey(intent: BookingsDeepLinkIntent): string {
  switch (intent.type) {
    case "plan":
      return `plan:${intent.planId}:${intent.eventDate ?? ""}`;
    case "create-booking":
      return `create-booking:${intent.eventDate ?? ""}`;
    case "create-plan":
      return `create-plan:${intent.eventDate ?? ""}`;
  }
}

/** Synchronous chrome gate: planner booking-create UI (not default Gigs workspace). */
export function isPlannerBookingsCreateChromeActive(options: {
  createOpen?: boolean;
  searchParams?: SearchParamsLike | null;
  locationSearch?: string | null;
}): boolean {
  if (options.createOpen) {
    return true;
  }

  if (options.searchParams && resolveBookingsDeepLinkIntent(options.searchParams)) {
    return true;
  }

  if (options.locationSearch) {
    const query = options.locationSearch.startsWith("?")
      ? options.locationSearch.slice(1)
      : options.locationSearch;

    if (resolveBookingsDeepLinkIntent(new URLSearchParams(query))) {
      return true;
    }
  }

  return readPendingBookingPlanId() != null;
}
