import {
  formatBookingStatusLabel,
  listReceivedBookingRequests,
  listSentBookingRequests,
  type BookingRequest,
  type BookingRequestStatus,
} from "@/lib/bookingRequests";
import {
  formatOrdinalDay,
  isDateKeyBeforeToday,
  parseEventDate,
  parseSetTimeRange,
  resolveEventDateKey,
  resolveEventStartDateTime,
  SET_TIME_RANGE_JOINER,
} from "@/lib/bookingDateTime";
import {
  getEventFallbackColourStyles,
  isEventFallbackColourKey,
} from "@/lib/events/eventFallbackColour";
import {
  getEventDateDisplayLabel,
  isEventCancelled,
  listOwnedEvents,
  type Event,
  type EventDateDisplayLabel,
} from "@/lib/events";
import {
  FTC_STATUS_ACCEPTED_DOT,
  FTC_STATUS_DANGER,
  FTC_STATUS_MUTED,
  FTC_STATUS_PENDING_DOT,
  FTC_STATUS_TODAY,
  FTC_STATUS_TODAY_DOT,
  FTC_STATUS_UPCOMING,
  FTC_STATUS_UPCOMING_DOT,
  FTC_STATUS_WARNING,
  FTC_STATUS_SUCCESS,
} from "@/lib/ftcFlatStatus";
import type { UserRole } from "@/lib/user/currentUser";

export type CalendarItemType = "event" | "sent_booking" | "received_booking";

export type CalendarStatusKind =
  | BookingRequestStatus
  | "event_draft"
  | "event_today"
  | "event_upcoming"
  | "event_completed"
  | "event_cancelled";

export type CalendarItem = {
  id: string;
  type: CalendarItemType;
  dateKey: string;
  title: string;
  venue: string | null;
  timeLabel: string | null;
  statusLabel: string;
  statusKind: CalendarStatusKind;
  href: string;
  eventId: string | null;
  typeLabel: string;
  startTimeSortKey: number;
  eventFallbackColour: string | null;
};

export const PLANNER_CALENDAR_TITLE_VENUE_SEPARATOR = " · ";

/** Heuristic max length for compact calendar card titles (CSS truncate remains a fallback). */
export const COMPACT_CALENDAR_EVENT_VENUE_TITLE_MAX_LENGTH = 34;

const COMPACT_TITLE_ELLIPSIS = "...";

function truncateCompactCalendarTitleEnd(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  if (maxLength <= COMPACT_TITLE_ELLIPSIS.length) {
    return COMPACT_TITLE_ELLIPSIS.slice(0, maxLength);
  }

  return `${text.slice(0, maxLength - COMPACT_TITLE_ELLIPSIS.length)}${COMPACT_TITLE_ELLIPSIS}`;
}

function compactVenueSegmentFitsWithSeparator(venueSegment: string): boolean {
  if (!venueSegment || venueSegment === COMPACT_TITLE_ELLIPSIS) {
    return false;
  }

  const withoutEllipsis = venueSegment.endsWith(COMPACT_TITLE_ELLIPSIS)
    ? venueSegment.slice(0, -COMPACT_TITLE_ELLIPSIS.length)
    : venueSegment;

  return withoutEllipsis.trim().length > 0;
}

export function formatCompactCalendarEventVenueTitle(
  title: string,
  venue: string | null | undefined,
  maxLength = COMPACT_CALENDAR_EVENT_VENUE_TITLE_MAX_LENGTH,
): string {
  const eventTitle = title.trim() || "Untitled event";
  const trimmedVenue = normalizeCalendarVenue(venue);

  if (!trimmedVenue) {
    return truncateCompactCalendarTitleEnd(eventTitle, maxLength);
  }

  const separator = PLANNER_CALENDAR_TITLE_VENUE_SEPARATOR;
  const fullHeadline = `${eventTitle}${separator}${trimmedVenue}`;

  if (fullHeadline.length <= maxLength) {
    return fullHeadline;
  }

  const venueCharBudget = maxLength - eventTitle.length - separator.length;

  if (venueCharBudget < 1) {
    return truncateCompactCalendarTitleEnd(eventTitle, maxLength);
  }

  const venueSegment =
    trimmedVenue.length <= venueCharBudget
      ? trimmedVenue
      : truncateCompactCalendarTitleEnd(trimmedVenue, venueCharBudget);

  if (!compactVenueSegmentFitsWithSeparator(venueSegment)) {
    return truncateCompactCalendarTitleEnd(eventTitle, maxLength);
  }

  return `${eventTitle}${separator}${venueSegment}`;
}

function normalizeCalendarVenue(venue: string | null | undefined): string | null {
  const trimmed = venue?.trim();

  return trimmed ? trimmed : null;
}

export function formatPlannerCalendarItemHeadline(
  title: string,
  venue: string | null | undefined,
): string {
  const trimmedVenue = normalizeCalendarVenue(venue);

  if (!trimmedVenue) {
    return title;
  }

  return `${title}${PLANNER_CALENDAR_TITLE_VENUE_SEPARATOR}${trimmedVenue}`;
}

export function resolveCalendarDateKey(value: string): string | null {
  const parsed = parseEventDate(value);
  return parsed.isoDate || null;
}

export function formatCalendarTimeLabel(setTime: string): string | null {
  const trimmed = setTime.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = parseSetTimeRange(trimmed);

  if (parsed.unparsedRaw) {
    return parsed.unparsedRaw;
  }

  if (parsed.start && parsed.finish) {
    return `${parsed.start.formatted}${SET_TIME_RANGE_JOINER}${parsed.finish.formatted}`;
  }

  if (parsed.start) {
    return parsed.start.formatted;
  }

  return trimmed;
}

export function getCalendarTypeLabel(type: CalendarItemType): string {
  if (type === "event") {
    return "Event";
  }

  if (type === "sent_booking") {
    return "Sent booking";
  }

  return "Received booking";
}

function resolveCalendarItemStartTimeSortKey(eventDate: string, setTime: string): number {
  const startDateTime = resolveEventStartDateTime(eventDate, setTime);

  return startDateTime?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

function getPlannerCalendarAgendaPriority(item: CalendarItem): number {
  if (item.statusKind === "accepted") {
    return 0;
  }

  if (item.statusKind === "pending") {
    return 1;
  }

  if (item.statusKind === "event_cancelled" || item.statusKind === "cancelled") {
    return 3;
  }

  return 2;
}

export function sortPlannerCalendarAgendaItems(items: CalendarItem[]): CalendarItem[] {
  return [...items].sort((left, right) => {
    const priorityDelta =
      getPlannerCalendarAgendaPriority(left) - getPlannerCalendarAgendaPriority(right);

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const timeDelta = left.startTimeSortKey - right.startTimeSortKey;

    if (timeDelta !== 0) {
      return timeDelta;
    }

    return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
  });
}

export function getPlannerCalendarAgendaAccentClass(
  eventFallbackColour: string | null | undefined,
): string {
  const trimmed = eventFallbackColour?.trim();

  if (trimmed && isEventFallbackColourKey(trimmed)) {
    return getEventFallbackColourStyles(trimmed).swatchClassName;
  }

  return getEventFallbackColourStyles("blue").swatchClassName;
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function getCalendarStatusBadgeClass(kind: CalendarStatusKind): string {
  if (kind === "pending") {
    return FTC_STATUS_WARNING;
  }

  if (kind === "accepted") {
    return FTC_STATUS_SUCCESS;
  }

  if (kind === "declined") {
    return FTC_STATUS_DANGER;
  }

  if (kind === "cancelled") {
    return FTC_STATUS_MUTED;
  }

  if (kind === "event_draft") {
    return FTC_STATUS_MUTED;
  }

  if (kind === "event_today") {
    return FTC_STATUS_TODAY;
  }

  if (kind === "event_upcoming") {
    return FTC_STATUS_UPCOMING;
  }

  if (kind === "event_completed") {
    return FTC_STATUS_SUCCESS;
  }

  return FTC_STATUS_DANGER;
}

export function getPlannerCalendarStatusBadgeClass(kind: CalendarStatusKind): string {
  if (kind === "event_today") {
    return FTC_STATUS_TODAY;
  }

  if (kind === "event_upcoming" || kind === "event_draft" || kind === "event_completed") {
    return FTC_STATUS_UPCOMING;
  }

  return getCalendarStatusBadgeClass(kind);
}

export function getPlannerCalendarLegendDotClass(kind: CalendarStatusKind): string {
  if (kind === "event_today") {
    return FTC_STATUS_TODAY_DOT;
  }

  if (kind === "event_upcoming" || kind === "event_draft" || kind === "event_completed") {
    return FTC_STATUS_UPCOMING_DOT;
  }

  return getCalendarStatusLegendDotClass(kind);
}

export function getCalendarStatusLegendDotClass(kind: CalendarStatusKind): string {
  if (kind === "pending") {
    return FTC_STATUS_PENDING_DOT;
  }

  if (kind === "accepted") {
    return FTC_STATUS_ACCEPTED_DOT;
  }

  if (kind === "declined") {
    return "bg-[var(--ftc-color-danger)]";
  }

  if (kind === "event_today") {
    return FTC_STATUS_TODAY_DOT;
  }

  if (kind === "event_upcoming") {
    return FTC_STATUS_UPCOMING_DOT;
  }

  return "bg-ftc-text-muted";
}

export function getCalendarWeekRows(monthStart: Date): (Date | null)[][] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingDays = (firstDay.getDay() + 6) % 7;

  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingDays }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
  ];

  const trailingDays = (7 - (cells.length % 7)) % 7;
  if (trailingDays > 0) {
    cells.push(...Array.from({ length: trailingDays }, () => null));
  }

  const weeks: (Date | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return weeks;
}

function mapEventDateDisplayKind(label: EventDateDisplayLabel): CalendarStatusKind {
  if (label === "Today") {
    return "event_today";
  }

  if (label === "Upcoming") {
    return "event_upcoming";
  }

  if (label === "Past") {
    return "event_completed";
  }

  return "event_draft";
}

function getCancelledEventIds(events: Event[]): Set<string> {
  return new Set(events.filter(isEventCancelled).map((event) => event.id));
}

function isBookingLinkedToCancelledEvent(
  booking: BookingRequest,
  cancelledEventIds: Set<string>,
): boolean {
  return Boolean(booking.event_id && cancelledEventIds.has(booking.event_id));
}

function resolvePlannerCalendarBookingEventId(
  booking: BookingRequest,
  ownedEvents: Event[],
): string | null {
  const directEventId = booking.event_id?.trim();

  if (directEventId) {
    return directEventId;
  }

  const dateKey = resolveCalendarDateKey(booking.event_date);

  if (!dateKey) {
    return null;
  }

  const bookingName = booking.event_name.trim().toLowerCase();

  if (!bookingName) {
    return null;
  }

  for (const event of ownedEvents) {
    if (isEventCancelled(event)) {
      continue;
    }

    const eventDateKey = resolveCalendarDateKey(event.event_date);

    if (eventDateKey !== dateKey) {
      continue;
    }

    if (event.name.trim().toLowerCase() === bookingName) {
      return event.id;
    }
  }

  return null;
}

function mapEventToCalendarItem(event: Event): CalendarItem | null {
  const dateKey = resolveCalendarDateKey(event.event_date);

  if (!dateKey || isEventCancelled(event)) {
    return null;
  }

  const displayLabel = getEventDateDisplayLabel(event.event_date, event.set_time) ?? "Unscheduled";

  return {
    id: `event-${event.id}`,
    type: "event",
    dateKey,
    title: event.name.trim() || "Untitled event",
    venue: normalizeCalendarVenue(event.venue),
    timeLabel: formatCalendarTimeLabel(event.set_time),
    statusLabel: displayLabel,
    statusKind: mapEventDateDisplayKind(displayLabel),
    href: `/events/${event.id}`,
    eventId: event.id,
    typeLabel: getCalendarTypeLabel("event"),
    startTimeSortKey: resolveCalendarItemStartTimeSortKey(event.event_date, event.set_time),
    eventFallbackColour: event.fallback_colour?.trim() || null,
  };
}

function mapBookingToCalendarItem(
  booking: BookingRequest,
  type: "sent_booking" | "received_booking",
  eventFallbackColour: string | null = null,
  options?: {
    resolveEventId?: (booking: BookingRequest) => string | null;
  },
): CalendarItem | null {
  const dateKey = resolveCalendarDateKey(booking.event_date);

  if (!dateKey) {
    return null;
  }

  const eventId =
    options?.resolveEventId?.(booking) ?? booking.event_id?.trim() ?? null;
  const href = eventId ? `/events/${eventId}` : `/dm/${booking.conversation_id}`;

  return {
    id: `${type}-${booking.id}`,
    type,
    dateKey,
    title: booking.event_name.trim() || "Untitled booking",
    venue: normalizeCalendarVenue(booking.venue),
    timeLabel: formatCalendarTimeLabel(booking.set_time),
    statusLabel: formatBookingStatusLabel(booking.status),
    statusKind: booking.status,
    href,
    eventId,
    typeLabel: getCalendarTypeLabel(type),
    startTimeSortKey: resolveCalendarItemStartTimeSortKey(booking.event_date, booking.set_time),
    eventFallbackColour,
  };
}

export async function loadCalendarItems(role: UserRole | null): Promise<CalendarItem[]> {
  const items: CalendarItem[] = [];

  if (role === "promoter" || role === "both") {
    const [events, sentBookings] = await Promise.all([
      listOwnedEvents(),
      listSentBookingRequests(),
    ]);

    const cancelledEventIds = getCancelledEventIds(events);

    for (const event of events) {
      const item = mapEventToCalendarItem(event);

      if (item) {
        items.push(item);
      }
    }

    for (const booking of sentBookings) {
      if (booking.status === "cancelled" || isBookingLinkedToCancelledEvent(booking, cancelledEventIds)) {
        continue;
      }

      const item = mapBookingToCalendarItem(booking, "sent_booking");

      if (item) {
        items.push(item);
      }
    }
  }

  if (role === "dj" || role === "both") {
    const receivedBookings = await listReceivedBookingRequests();

    for (const booking of receivedBookings) {
      if (booking.status === "cancelled") {
        continue;
      }

      const item = mapBookingToCalendarItem(booking, "received_booking");

      if (item) {
        items.push(item);
      }
    }
  }

  return items.sort((left, right) => {
    if (left.dateKey !== right.dateKey) {
      return left.dateKey.localeCompare(right.dateKey);
    }

    return left.title.localeCompare(right.title);
  });
}

function linkPlannerCalendarSentBookingsToEvents(items: CalendarItem[]): CalendarItem[] {
  const eventIdByDateAndTitle = new Map<string, string>();

  for (const item of items) {
    if (item.type !== "event" || !item.eventId) {
      continue;
    }

    const key = `${item.dateKey}\0${item.title.trim().toLowerCase()}`;
    eventIdByDateAndTitle.set(key, item.eventId);
  }

  return items.map((item) => {
    if (item.type !== "sent_booking" || item.eventId) {
      return item;
    }

    const key = `${item.dateKey}\0${item.title.trim().toLowerCase()}`;
    const linkedEventId = eventIdByDateAndTitle.get(key);

    if (!linkedEventId) {
      return item;
    }

    return {
      ...item,
      eventId: linkedEventId,
      href: `/events/${linkedEventId}`,
    };
  });
}

export async function loadPlannerCalendarItems(): Promise<CalendarItem[]> {
  const [events, sentBookings] = await Promise.all([
    listOwnedEvents(),
    listSentBookingRequests(),
  ]);

  const cancelledEventIds = getCancelledEventIds(events);

  const eventFallbackColourById = new Map(
    events
      .filter((event) => !isEventCancelled(event))
      .map((event) => [event.id, event.fallback_colour?.trim() || null]),
  );

  const items: CalendarItem[] = [];

  for (const event of events) {
    const item = mapEventToCalendarItem(event);

    if (item) {
      items.push(item);
    }
  }

  for (const booking of sentBookings) {
    if (
      booking.status === "cancelled" ||
      booking.status === "declined" ||
      isBookingLinkedToCancelledEvent(booking, cancelledEventIds)
    ) {
      continue;
    }

    const item = mapBookingToCalendarItem(
      booking,
      "sent_booking",
      booking.event_id ? eventFallbackColourById.get(booking.event_id) ?? null : null,
      {
        resolveEventId: (sentBooking) =>
          resolvePlannerCalendarBookingEventId(sentBooking, events),
      },
    );

    if (item) {
      items.push(item);
    }
  }

  return linkPlannerCalendarSentBookingsToEvents(items).sort((left, right) => {
    if (left.dateKey !== right.dateKey) {
      return left.dateKey.localeCompare(right.dateKey);
    }

    return left.title.localeCompare(right.title);
  });
}

export function getPlannerCalendarBadgeLabel(item: CalendarItem): string {
  if (item.type === "event") {
    return item.statusLabel;
  }

  if (item.statusKind === "pending") {
    return "Pending";
  }

  if (item.statusKind === "accepted") {
    return "Accepted";
  }

  if (item.statusKind === "declined") {
    return "Declined";
  }

  return item.statusLabel;
}

export const PLANNER_CALENDAR_LEGEND_ITEMS = [
  { label: "Today", mobileLabel: "Today", kind: "event_today" as const },
  { label: "Upcoming", mobileLabel: "Upcoming", kind: "event_upcoming" as const },
  { label: "Pending", mobileLabel: "Pending", kind: "pending" as const },
  { label: "Accepted", mobileLabel: "Accepted", kind: "accepted" as const },
  { label: "Declined", mobileLabel: "Declined", kind: "declined" as const },
] as const;

export const PLANNER_CALENDAR_VISIBLE_LEGEND_ITEMS = PLANNER_CALENDAR_LEGEND_ITEMS.filter(
  (item) => item.kind !== "declined",
);

const PLANNER_CALENDAR_EVENT_STATUS_PRIORITY: CalendarStatusKind[] = [
  "accepted",
  "pending",
  "event_upcoming",
];

const PLANNER_CALENDAR_UPCOMING_TIER_STATUS_KINDS: ReadonlySet<CalendarStatusKind> = new Set([
  "event_upcoming",
  "event_today",
  "event_draft",
  "event_completed",
]);

export function getPlannerCalendarHighestEventStatusKind(
  items: CalendarItem[],
): CalendarStatusKind | null {
  if (items.length === 0) {
    return null;
  }

  for (const kind of PLANNER_CALENDAR_EVENT_STATUS_PRIORITY) {
    if (items.some((item) => item.statusKind === kind)) {
      return kind;
    }
  }

  if (items.some((item) => PLANNER_CALENDAR_UPCOMING_TIER_STATUS_KINDS.has(item.statusKind))) {
    return "event_upcoming";
  }

  return null;
}

export function getPlannerCalendarDateIndicatorKind(
  items: CalendarItem[],
): CalendarStatusKind | null {
  return getPlannerCalendarHighestEventStatusKind(items);
}

function getPlannerCalendarMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function buildPlannerCalendarMonthActivityByKey(
  items: CalendarItem[],
): Map<string, CalendarStatusKind> {
  const itemsByMonthKey = new Map<string, CalendarItem[]>();

  for (const item of items) {
    const monthKey = item.dateKey.slice(0, 7);

    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      continue;
    }

    const monthItems = itemsByMonthKey.get(monthKey) ?? [];
    monthItems.push(item);
    itemsByMonthKey.set(monthKey, monthItems);
  }

  const activityByMonthKey = new Map<string, CalendarStatusKind>();

  for (const [monthKey, monthItems] of itemsByMonthKey) {
    const kind = getPlannerCalendarHighestEventStatusKind(monthItems);

    if (kind) {
      activityByMonthKey.set(monthKey, kind);
    }
  }

  return activityByMonthKey;
}

export function getPlannerCalendarMonthActivityDotClass(
  activityByMonthKey: ReadonlyMap<string, CalendarStatusKind>,
  month: number,
  year: number,
): string | null {
  const kind = activityByMonthKey.get(getPlannerCalendarMonthKey(year, month));

  if (!kind) {
    return null;
  }

  return getPlannerCalendarLegendDotClass(kind);
}

export function getPlannerCalendarDateStripDotClass(
  items: CalendarItem[],
  isSelected: boolean,
): string {
  if (isSelected) {
    return "bg-ftc-bg";
  }

  const kind = getPlannerCalendarDateIndicatorKind(items);

  if (!kind) {
    return "";
  }

  return getPlannerCalendarLegendDotClass(kind);
}

export function getPlannerCalendarDateStripExtraCount(items: CalendarItem[]): number {
  if (items.length <= 1) {
    return 0;
  }

  return items.length - 1;
}

/** Compact strip dots/counts are hidden before the user's local today; agenda stays tappable. */
export function shouldShowCalendarDateStripIndicators(dateKey: string): boolean {
  return !isDateKeyBeforeToday(dateKey);
}

export function getPlannerCalendarDateStripMarker(
  items: CalendarItem[],
  isHighlighted: boolean,
): CalendarMobileDateStripMarker | null {
  if (items.length === 0) {
    return null;
  }

  return {
    dotClassName: getPlannerCalendarDateStripDotClass(items, isHighlighted),
    extraCount: getPlannerCalendarDateStripExtraCount(items),
    itemCountLabel: `, ${items.length} scheduled item${items.length === 1 ? "" : "s"}`,
  };
}

export type CalendarMobileDateStripMarker = {
  dotClassName: string;
  extraCount: number;
  itemCountLabel: string;
};

export function formatWrittenCalendarDateLabel(
  date: Date,
  options?: { includeYear?: boolean },
): string {
  const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
  const month = date.toLocaleDateString(undefined, { month: "long" });
  const label = `${weekday} ${formatOrdinalDay(date.getDate())} ${month}`;

  if (options?.includeYear) {
    return `${label} ${date.getFullYear()}`;
  }

  return label;
}

export function formatPlannerSelectedDateLabel(date: Date): string {
  return formatWrittenCalendarDateLabel(date);
}

export function buildPlannerCreateEventHref(dateKey: string): string {
  const params = new URLSearchParams({
    create: "calendar",
    eventDate: dateKey,
  });
  return `/events?${params.toString()}`;
}

export function buildPlannerCreateEventFromPlansHref(dateKey: string): string {
  const params = new URLSearchParams({
    create: "calendar-plans",
    eventDate: dateKey,
  });
  return `/events?${params.toString()}`;
}

export function buildPlannerCalendarHref(dateKey: string): string {
  const params = new URLSearchParams({ date: dateKey });
  return `/calendar?${params.toString()}`;
}

export {
  type CalendarOriginView,
  type CalendarOriginState,
  type GigsCalendarBookingNavigationResult,
  resolveCalendarOriginBookingHref,
  resolveCalendarOriginEventHref,
  resolveGigsCalendarBookingNavigation,
  resolvePlannerCalendarItemEventId,
  resolvePlannerCalendarItemHref,
} from "@/lib/bookings/gigsCalendarNavigation";
import type { CalendarOriginState, CalendarOriginView } from "@/lib/bookings/gigsCalendarNavigation";

export function buildCalendarOriginState(options: {
  calendarDate: string;
  calendarView: CalendarOriginView;
  monthStart: Date;
}): CalendarOriginState {
  return {
    calendarDate: options.calendarDate,
    calendarView: options.calendarView,
    calendarMonth: toDateKey(options.monthStart),
  };
}

export function buildCalendarOriginReturnHref(origin: CalendarOriginState): string {
  const params = new URLSearchParams({
    date: origin.calendarDate,
    view: origin.calendarView,
    month: origin.calendarMonth,
  });

  return `/calendar?${params.toString()}`;
}

export function parseCalendarOriginFromEventDetail(searchParams: {
  get: (key: string) => string | null;
}): CalendarOriginState | null {
  if (searchParams.get("from") !== "calendar") {
    return null;
  }

  const calendarDate = searchParams.get("calendarDate");
  const calendarView = searchParams.get("calendarView");

  if (!calendarDate || (calendarView !== "event" && calendarView !== "dj")) {
    return null;
  }

  const restoredDate = parsePlannerCalendarDateParam(calendarDate);
  const calendarMonth =
    searchParams.get("calendarMonth") ??
    (restoredDate ? toDateKey(getMonthStart(restoredDate)) : null);

  if (!calendarMonth) {
    return null;
  }

  return {
    calendarDate,
    calendarView,
    calendarMonth,
  };
}

export function parseCalendarOriginReturnParams(
  calendarDate: string | null | undefined,
  calendarView: string | null | undefined,
  calendarMonth: string | null | undefined,
): CalendarOriginState | null {
  const trimmedDate = calendarDate?.trim();
  const trimmedView = calendarView?.trim();

  if (!trimmedDate || (trimmedView !== "event" && trimmedView !== "dj")) {
    return null;
  }

  const restoredDate = parsePlannerCalendarDateParam(trimmedDate);
  const resolvedMonth =
    calendarMonth?.trim() ??
    (restoredDate ? toDateKey(getMonthStart(restoredDate)) : null);

  if (!resolvedMonth) {
    return null;
  }

  return {
    calendarDate: trimmedDate,
    calendarView: trimmedView,
    calendarMonth: resolvedMonth,
  };
}

export function resolveDjCalendarViewMonthStart(
  dateParam: string | null | undefined,
  monthParam: string | null | undefined,
): Date {
  const restoredMonthDate = parsePlannerCalendarDateParam(monthParam);

  if (restoredMonthDate) {
    return getMonthStart(restoredMonthDate);
  }

  const restoredDate = parsePlannerCalendarDateParam(dateParam);

  if (restoredDate) {
    return getMonthStart(restoredDate);
  }

  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

export function parseCalendarPageViewTab(
  viewParam: string | null | undefined,
): CalendarOriginView {
  return viewParam === "dj" ? "dj" : "event";
}

const PLANNER_CALENDAR_RETURN_DATE_STORAGE_KEY = "ftc.planner-calendar.return-date";

/** Canonical YYYY-MM-DD for Calendar-origin flows; does not apply create min-date rules. */
export function resolveCalendarOriginDateKey(
  eventDate: string | null | undefined,
): string | null {
  if (!eventDate?.trim()) {
    return null;
  }

  return resolveEventDateKey(eventDate) ?? null;
}

export function stashPlannerCalendarReturnDate(dateKey: string): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(PLANNER_CALENDAR_RETURN_DATE_STORAGE_KEY, dateKey);
}

export function clearPlannerCalendarReturnDate(): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(PLANNER_CALENDAR_RETURN_DATE_STORAGE_KEY);
}

function consumePlannerCalendarReturnDate(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = sessionStorage.getItem(PLANNER_CALENDAR_RETURN_DATE_STORAGE_KEY);

  if (!value) {
    return null;
  }

  sessionStorage.removeItem(PLANNER_CALENDAR_RETURN_DATE_STORAGE_KEY);
  return value;
}

export function parsePlannerCalendarDateParam(dateKey: string | null | undefined): Date | null {
  if (!dateKey?.trim()) {
    return null;
  }

  const parsed = parseEventDate(dateKey.trim());

  if (!parsed.isoDate) {
    return null;
  }

  const [year, month, day] = parsed.isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getPlannerCalendarTodayDate(): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

export type PlannerCalendarViewState = {
  selectedDate: Date;
  monthStart: Date;
};

/** Fresh /calendar visits default to today; ?date= restores Calendar-origin return context. */
export function resolvePlannerCalendarViewState(
  dateParam: string | null | undefined,
  monthParam?: string | null | undefined,
): PlannerCalendarViewState {
  const restoredDate = parsePlannerCalendarDateParam(dateParam);
  const restoredMonthDate = parsePlannerCalendarDateParam(monthParam);

  if (restoredDate) {
    clearPlannerCalendarReturnDate();
    return {
      selectedDate: restoredDate,
      monthStart: restoredMonthDate
        ? getMonthStart(restoredMonthDate)
        : getMonthStart(restoredDate),
    };
  }

  const stashedDateKey = consumePlannerCalendarReturnDate();
  const stashedDate = parsePlannerCalendarDateParam(stashedDateKey);

  if (stashedDate) {
    return {
      selectedDate: stashedDate,
      monthStart: getMonthStart(stashedDate),
    };
  }

  const todayDate = getPlannerCalendarTodayDate();

  return {
    selectedDate: todayDate,
    monthStart: getMonthStart(todayDate),
  };
}

export function getPlannerViewDaySubtitle(itemCount: number): string {
  if (itemCount === 0) {
    return "Nothing scheduled";
  }

  return `View ${itemCount} scheduled item${itemCount === 1 ? "" : "s"}`;
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function isSameMonth(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

export function isSameDay(left: Date, right: Date): boolean {
  return toDateKey(left) === toDateKey(right);
}

export function formatCalendarMonthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function formatPlannerAgendaDateLabel(date: Date): string {
  return formatWrittenCalendarDateLabel(date);
}

export function getWeekDatesContaining(date: Date): Date[] {
  const weekdayIndex = (date.getDay() + 6) % 7;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - weekdayIndex);

  return Array.from({ length: 7 }, (_, index) => {
    const nextDate = new Date(monday);
    nextDate.setDate(monday.getDate() + index);
    return nextDate;
  });
}

export function getCalendarMonthDates(monthStart: Date): Date[] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1));
}

export function getDefaultSelectedCalendarDate(
  monthStart: Date,
  todayParts: { year: number; month: number; day: number } | null,
): Date {
  if (
    todayParts &&
    monthStart.getFullYear() === todayParts.year &&
    monthStart.getMonth() === todayParts.month
  ) {
    return new Date(todayParts.year, todayParts.month, todayParts.day);
  }

  return new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
}

export function resolveDjCalendarSelectedDate(
  dateParam: string | null | undefined,
  monthStart: Date,
): Date {
  const restoredDate = parsePlannerCalendarDateParam(dateParam);

  if (restoredDate) {
    return restoredDate;
  }

  const todayDate = getPlannerCalendarTodayDate();

  return getDefaultSelectedCalendarDate(monthStart, {
    year: todayDate.getFullYear(),
    month: todayDate.getMonth(),
    day: todayDate.getDate(),
  });
}

export function getCalendarMonthMatrix(monthStart: Date): Date[] {
  const firstDay = getMonthStart(monthStart);
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - leadingDays);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

export function groupCalendarItemsByDate(
  items: CalendarItem[],
): Map<string, CalendarItem[]> {
  const grouped = new Map<string, CalendarItem[]>();

  for (const item of items) {
    const existing = grouped.get(item.dateKey) ?? [];
    existing.push(item);
    grouped.set(item.dateKey, existing);
  }

  return grouped;
}

export function filterCalendarItemsForMonth(
  items: CalendarItem[],
  monthStart: Date,
): CalendarItem[] {
  const monthPrefix = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;

  return items.filter((item) => item.dateKey.startsWith(monthPrefix));
}

export function getCalendarLoadErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const supabaseError = error as { message?: string; code?: string };

    if (supabaseError.message) {
      return supabaseError.message;
    }
  }

  return error instanceof Error ? error.message : "Failed to load calendar";
}
