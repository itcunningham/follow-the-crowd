import { buildGigsListHref, parseDjGigsListTab } from "@/lib/bookings/gigsListNavigation";
import { buildDmThreadHref } from "@/lib/dm/threadNavigation";
import { DM_BOOKING_FOCUS_SCROLL_ONLY } from "@/lib/dm/chatBookingTarget";
import {
  buildCalendarOriginReturnHref,
  buildPlannerCalendarHref,
  parseCalendarOriginFromEventDetail,
  resolveCalendarOriginDateKey,
} from "@/lib/calendar";
import { sanitizePrefilledEventDateKey } from "@/lib/bookingDateTime";
import { EVENTS_AREA_SUB_NAV } from "@/lib/plannerEventsNav";

export type EventsListTab = "active" | "history";

export type EventsListView = "active" | "cancelled";

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

  const locationTab =
    locationSearch != null
      ? new URLSearchParams(
          locationSearch.startsWith("?") ? locationSearch.slice(1) : locationSearch,
        ).get("tab")
      : null;

  if (locationTab != null) {
    return parseEventsListTab(locationTab);
  }

  if (locationSearch != null) {
    return "active";
  }

  return parseEventsListTab(initialTab);
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
): string {
  const params = new URLSearchParams({
    from: "dm",
    conversationId: conversationId.trim(),
    bookingRequestId: bookingRequestId.trim(),
  });

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
  },
): string {
  const dmConversationId = resolveDmEventDetailConversationId(options);

  if (dmConversationId) {
    const bookingRequestId = options?.bookingRequestId?.trim();

    return buildDmThreadHref(dmConversationId, {
      bookingRequestId: bookingRequestId || undefined,
      bookingFocus: bookingRequestId ? DM_BOOKING_FOCUS_SCROLL_ONLY : undefined,
    });
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

export function isCalendarOriginCreateParam(
  create: string | null | undefined,
): create is CalendarOriginCreateParam {
  return create === "calendar" || create === "calendar-plans";
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
