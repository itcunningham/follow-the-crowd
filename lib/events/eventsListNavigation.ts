import { readPendingBookingPlanId } from "@/lib/bookings/planDeepLink";
import { buildGigsListHref, parseDjGigsListTab } from "@/lib/bookings/gigsListNavigation";
import { readEventsListTabFromLocationSearch } from "@/lib/events/eventsListTabCache";
import {
  appendDmReturnContextToEventDetailParams,
  buildDmThreadHref,
  resolveDmThreadHrefOptionsFromEventDetailReturn,
  type DmThreadEntryContext,
} from "@/lib/dm/threadNavigation";
import { DM_CHAT_SCROLL_RESTORE_PARAM } from "@/lib/dm/dmChatScrollRestoration";
import { resolveEventsWorkspaceChromeRole } from "@/lib/events/eventsWorkspaceChromeRole";
import { canManageEvents, type UserRole } from "@/lib/user/currentUser";
import {
  buildCalendarOriginReturnHref,
  buildPlannerCalendarHref,
  parseCalendarOriginFromEventDetail,
  resolveCalendarOriginDateKey,
} from "@/lib/calendar";
import { sanitizePrefilledEventDateKey } from "@/lib/bookingDateTime";
import { EVENTS_AREA_SUB_NAV, isCalendarWorkspacePath } from "@/lib/plannerEventsNav";
import { buildGigsWorkspaceIncomingHref } from "@/lib/bookings/gigsListNavigation";

export type EventsListTab = "active" | "history";

export type EventsListView = "active" | "cancelled";

/** Immutable first-tab labels — shared by route loading shell and loaded Events page. */
export const EVENTS_LIST_ACTIVE_TAB_LABEL_PLANNER = "Active";
export const EVENTS_LIST_ACTIVE_TAB_LABEL_DJ = "Upcoming";

export function resolveEventsListActiveTabLabel(isPlanner: boolean): string {
  return isPlanner ? EVENTS_LIST_ACTIVE_TAB_LABEL_PLANNER : EVENTS_LIST_ACTIVE_TAB_LABEL_DJ;
}

/** First-tab label — loading shell always shows planner label; loaded state uses guard + caches. */
export function resolveEventsListActiveTabLabelForWorkspaceChrome(
  isPlannerFromParent: boolean,
  options?: { loadingShell?: boolean; guardRole?: UserRole | null },
): string {
  if (options?.loadingShell) {
    return EVENTS_LIST_ACTIVE_TAB_LABEL_PLANNER;
  }

  return resolveEventsListActiveTabLabel(
    isPlannerFromParent ||
      canManageEvents(resolveEventsWorkspaceChromeRole(options?.guardRole)),
  );
}

export function parseEventsListTab(value: string | null | undefined): EventsListTab {
  return value === "history" ? "history" : "active";
}

export function resolveEventsListTabParam(
  searchParamsTab: string | null | undefined,
  initialTab?: string | null,
  locationSearch?: string | null,
): EventsListTab {
  if (searchParamsTab != null) {
    return parseEventsListTab(searchParamsTab);
  }

  const locationTab = readEventsListTabFromLocationSearch(locationSearch);
  if (locationTab != null) {
    return locationTab;
  }

  if (initialTab != null) {
    return parseEventsListTab(initialTab);
  }

  return "active";
}

export function eventsListViewFromTab(tab: EventsListTab): EventsListView {
  return tab === "history" ? "cancelled" : "active";
}

export function eventsListTabFromView(view: EventsListView): EventsListTab {
  return view === "cancelled" ? "history" : "active";
}

export function buildEventsListHref(tab: EventsListTab = "active"): string {
  return tab === "history" ? "/events?tab=history" : "/events";
}

/** Trash control on Events History — matches visible card list, not cancelled-only subsets. */
export function resolveEventsHistoryTrashVisible({
  isPlanner,
  isHistoryTab,
  createOpen,
  selectionMode,
  historyLoadSettled,
  visibleHistoryEventCount,
}: {
  isPlanner: boolean;
  isHistoryTab: boolean;
  createOpen: boolean;
  selectionMode: boolean;
  historyLoadSettled: boolean;
  visibleHistoryEventCount: number;
}): boolean {
  return (
    isPlanner &&
    isHistoryTab &&
    !createOpen &&
    !selectionMode &&
    (!historyLoadSettled || visibleHistoryEventCount > 0)
  );
}

export function resolveEventsListTabRowChrome({
  isPlanner,
  isHistoryTab,
  createOpen,
  selectionMode,
  historyLoadSettled,
  visibleHistoryEventCount,
  loadingShell = false,
}: {
  isPlanner: boolean;
  isHistoryTab: boolean;
  createOpen: boolean;
  selectionMode: boolean;
  historyLoadSettled: boolean;
  visibleHistoryEventCount: number;
  loadingShell?: boolean;
}): {
  showTrashButton: boolean;
  trashButtonDisabled: boolean;
  reserveTrashSlot: boolean;
} {
  if (loadingShell) {
    return {
      showTrashButton: isPlanner && isHistoryTab,
      trashButtonDisabled: true,
      reserveTrashSlot: isPlanner && !isHistoryTab,
    };
  }

  const showTrashButton = resolveEventsHistoryTrashVisible({
    isPlanner,
    isHistoryTab,
    createOpen,
    selectionMode,
    historyLoadSettled,
    visibleHistoryEventCount,
  });

  return {
    showTrashButton,
    trashButtonDisabled: !historyLoadSettled || visibleHistoryEventCount === 0,
    reserveTrashSlot: isPlanner && !selectionMode && !showTrashButton,
  };
}

export function buildEventDetailHref(eventId: string, tab: EventsListTab = "active"): string {
  if (tab === "history") {
    return `/events/${eventId}?fromTab=history`;
  }

  return `/events/${eventId}`;
}

export function buildEventDetailFromDmHref(
  eventId: string,
  conversationId: string,
  bookingRequestId: string,
  entryContext?: DmThreadEntryContext | null,
): string {
  const params = new URLSearchParams({
    from: "dm",
    conversationId: conversationId.trim(),
    bookingRequestId: bookingRequestId.trim(),
    // Lets the eventual "Back" href prefer restoring this DM's exact prior
    // scroll position over the booking-target-scroll fallback — see
    // resolveDmThreadHrefOptionsFromEventDetailReturn.
    [DM_CHAT_SCROLL_RESTORE_PARAM]: "1",
  });

  appendDmReturnContextToEventDetailParams(params, entryContext);

  return `/events/${eventId}?${params.toString()}`;
}

function resolveDmEventDetailConversationId(options?: {
  from?: string | null;
  conversationId?: string | null;
  fromDmConversation?: string | null;
}): string | null {
  if (options?.from?.trim() === "dm") {
    const conversationId = options.conversationId?.trim();

    return conversationId || null;
  }

  const legacyConversationId = options?.fromDmConversation?.trim();

  return legacyConversationId || null;
}

export function resolveEventDetailDmOriginConversationId(options?: {
  from?: string | null;
  conversationId?: string | null;
  fromDmConversation?: string | null;
}): string | null {
  return resolveDmEventDetailConversationId(options);
}

export function shouldHideEventDetailLineupMessageButton(
  bookingConversationId: string | null | undefined,
  dmOriginConversationId: string | null | undefined,
): boolean {
  const bookingConversation = bookingConversationId?.trim();
  const dmOriginConversation = dmOriginConversationId?.trim();

  return Boolean(
    bookingConversation &&
      dmOriginConversation &&
      bookingConversation === dmOriginConversation,
  );
}

export function resolveEventDetailBackHref(
  fromTab: string | null | undefined,
  options?: {
    from?: string | null;
    tab?: string | null;
    calendarDate?: string | null;
    calendarView?: string | null;
    calendarMonth?: string | null;
    conversationId?: string | null;
    bookingRequestId?: string | null;
    fromDmConversation?: string | null;
    dmReturnFrom?: string | null;
    profileUserId?: string | null;
    restoreScroll?: string | null;
  },
): string {
  const dmConversationId = resolveDmEventDetailConversationId(options);

  if (dmConversationId) {
    return buildDmThreadHref(
      dmConversationId,
      resolveDmThreadHrefOptionsFromEventDetailReturn({
        dmReturnFrom: options?.dmReturnFrom,
        tab: options?.tab,
        calendarDate: options?.calendarDate,
        calendarView: options?.calendarView,
        calendarMonth: options?.calendarMonth,
        profileUserId: options?.profileUserId,
        bookingRequestId: options?.bookingRequestId,
        restoreScroll: options?.restoreScroll,
      }),
    );
  }

  if (options?.from === "calendar") {
    const calendarOrigin = parseCalendarOriginFromEventDetail({
      get: (key) => {
        if (key === "from") {
          return options.from ?? null;
        }

        if (key === "calendarDate") {
          return options.calendarDate ?? null;
        }

        if (key === "calendarView") {
          return options.calendarView ?? null;
        }

        if (key === "calendarMonth") {
          return options.calendarMonth ?? null;
        }

        return null;
      },
    });

    if (calendarOrigin) {
      return buildCalendarOriginReturnHref(calendarOrigin);
    }
  }

  if (options?.from === "bookings") {
    return buildGigsListHref(parseDjGigsListTab(options.tab ?? fromTab));
  }

  return buildEventsListHref(parseEventsListTab(fromTab));
}

export type CalendarOriginCreateParam = "calendar" | "calendar-plans";

export type EventsListCreateDeepLinkParam = "event" | "custom" | "plan";

export function isEventsListCreateDeepLinkParam(
  create: string | null | undefined,
): create is EventsListCreateDeepLinkParam {
  return create === "event" || create === "custom" || create === "plan";
}

export const EVENTS_CREATE_FLOW_CHROME_KEY = "ftc-events-create-flow-chrome";

export function markEventsCreateFlowChromeOpen(): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(EVENTS_CREATE_FLOW_CHROME_KEY, "1");
}

export function clearEventsCreateFlowChromeOpen(): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(EVENTS_CREATE_FLOW_CHROME_KEY);
}

export function readEventsCreateFlowChromeOpen(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return sessionStorage.getItem(EVENTS_CREATE_FLOW_CHROME_KEY) === "1";
}

function readLocationSearchParam(
  locationSearch: string | null | undefined,
  name: string,
): string | null {
  const search = locationSearch ?? (typeof window !== "undefined" ? window.location.search : "");
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get(name);
}

/** Synchronous gate for Events Active/History pill selection — survives loading shells and router timing. */
export function resolveEventsListCreateFlowChromeActive(options: {
  createOpen?: boolean;
  locationSearch?: string | null;
} = {}): boolean {
  if (options.createOpen) {
    return true;
  }

  if (isEventsListCreateDeepLinkParam(readLocationSearchParam(options.locationSearch, "create"))) {
    return true;
  }

  if (typeof window === "undefined" || window.location.pathname !== "/events") {
    return false;
  }

  if (readPendingBookingPlanId() != null) {
    return true;
  }

  return readEventsCreateFlowChromeOpen();
}

export type EventsListCreateBootstrapState = {
  createOpen: true;
  createStep: "source" | "pick-plan" | "form";
  prefilledEventDate: string;
};

export function resolveEventsListCreateInitialStep(
  create: string | null | undefined,
): EventsListCreateBootstrapState["createStep"] {
  if (create === "plan") {
    return "pick-plan";
  }

  if (create === "custom") {
    return "form";
  }

  return "source";
}

/** Sync bootstrap for /events create deep links before createParam is stripped from the URL. */
export function resolveEventsListCreateBootstrapState(
  create: string | null | undefined,
  eventDate: string | null | undefined,
): EventsListCreateBootstrapState | null {
  if (!isEventsListCreateDeepLinkParam(create)) {
    return null;
  }

  return {
    createOpen: true,
    createStep: resolveEventsListCreateInitialStep(create),
    prefilledEventDate: sanitizePrefilledEventDateKey(eventDate ?? ""),
  };
}

export function isCalendarOriginCreateParam(
  create: string | null | undefined,
): create is CalendarOriginCreateParam {
  return create === "calendar" || create === "calendar-plans";
}

export function readCalendarCreateParamFromLocation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get("create");
}

/** True when the current URL is a calendar-originated create flow (`/calendar?create=…`). */
export function isCalendarCreateWorkspaceLocation(pathname: string | null): boolean {
  return (
    isCalendarWorkspacePath(pathname) &&
    isCalendarOriginCreateParam(readCalendarCreateParamFromLocation())
  );
}

/** Hard navigation — App Router client transitions are unreliable from calendar create URLs. */
export function navigateAwayFromCalendarCreateWorkspace(destinationHref: string): void {
  window.location.assign(destinationHref);
}

export function prefetchCalendarCreateWorkspaceExitTargets(router: {
  prefetch: (href: string) => void;
}): void {
  router.prefetch(EVENTS_AREA_SUB_NAV.events.href);
  router.prefetch(EVENTS_AREA_SUB_NAV.bookingPlans.href);
  router.prefetch(buildGigsWorkspaceIncomingHref());
}

export function resolveCalendarCreateReturnHref(eventDate: string | null | undefined): string {
  const originDateKey = resolveCalendarOriginDateKey(eventDate);
  return originDateKey ? buildPlannerCalendarHref(originDateKey) : "/calendar";
}

export function resolveCalendarCreateInitialStep(
  create: string | null | undefined,
): "form" | "pick-plan" {
  return create === "calendar-plans" ? "pick-plan" : "form";
}

export type CalendarCreateBootstrapState = {
  createOpen: true;
  calendarOriginDateKey: string | null;
  createStep: "form" | "pick-plan";
  prefilledEventDate: string;
};

export function resolveCalendarCreateBootstrapState(
  create: string | null | undefined,
  eventDate: string | null | undefined,
): CalendarCreateBootstrapState | null {
  if (!isCalendarOriginCreateParam(create)) {
    return null;
  }

  const calendarOriginDateKey = resolveCalendarOriginDateKey(eventDate);
  const prefilledEventDate =
    calendarOriginDateKey ?? sanitizePrefilledEventDateKey(eventDate ?? "");

  return {
    createOpen: true,
    calendarOriginDateKey,
    createStep: resolveCalendarCreateInitialStep(create),
    prefilledEventDate,
  };
}

export function isCalendarOriginEventsFlow(
  calendarOriginDateKey: string | null | undefined,
  createParam: string | null | undefined,
): boolean {
  return Boolean(calendarOriginDateKey) || isCalendarOriginCreateParam(createParam);
}

export function resolveEventsWorkspaceActiveHref(
  calendarOriginDateKey: string | null | undefined,
  createParam: string | null | undefined,
): string | undefined {
  return isCalendarOriginEventsFlow(calendarOriginDateKey, createParam)
    ? EVENTS_AREA_SUB_NAV.calendar.href
    : undefined;
}

export function resolveCalendarSaveReturnDateKey(
  calendarOriginDateKey: string | null | undefined,
  formEventDate: string,
  isCalendarCreateFlow: boolean,
): string | null {
  if (!isCalendarCreateFlow) {
    return null;
  }

  return calendarOriginDateKey ?? resolveCalendarOriginDateKey(formEventDate);
}
