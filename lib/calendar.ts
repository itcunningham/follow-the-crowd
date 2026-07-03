import {
  formatBookingStatusLabel,
  listReceivedBookingRequests,
  listSentBookingRequests,
  type BookingRequest,
  type BookingRequestStatus,
} from "@/lib/bookingRequests";
import { parseEventDate, parseSetTimeRange, SET_TIME_RANGE_JOINER } from "@/lib/bookingDateTime";
import {
  formatEventStatusLabel,
  listOwnedEvents,
  type Event,
  type EventStatus,
} from "@/lib/events";
import type { UserRole } from "@/lib/user/currentUser";

export type CalendarItemType = "event" | "sent_booking" | "received_booking";

export type CalendarStatusKind =
  | BookingRequestStatus
  | "event_draft"
  | "event_upcoming"
  | "event_completed"
  | "event_cancelled";

export type CalendarItem = {
  id: string;
  type: CalendarItemType;
  dateKey: string;
  title: string;
  timeLabel: string | null;
  statusLabel: string;
  statusKind: CalendarStatusKind;
  href: string;
  typeLabel: string;
};

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

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function getCalendarStatusBadgeClass(kind: CalendarStatusKind): string {
  if (kind === "pending") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-300";
  }

  if (kind === "accepted") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }

  if (kind === "declined") {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  if (kind === "event_draft") {
    return "border-zinc-600/50 bg-zinc-800/80 text-zinc-300";
  }

  if (kind === "event_upcoming") {
    return "border-blue-500/40 bg-blue-600/15 text-blue-300";
  }

  if (kind === "event_completed") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }

  return "border-red-500/40 bg-red-500/10 text-red-300";
}

export function getCalendarStatusGlowClass(kind: CalendarStatusKind): string {
  if (kind === "pending") {
    return "shadow-[0_0_10px_rgba(245,158,11,0.22)]";
  }

  if (kind === "accepted") {
    return "shadow-[0_0_10px_rgba(16,185,129,0.22)]";
  }

  if (kind === "declined") {
    return "shadow-[0_0_10px_rgba(239,68,68,0.22)]";
  }

  if (kind === "event_draft") {
    return "shadow-[0_0_10px_rgba(161,161,170,0.18)]";
  }

  if (kind === "event_upcoming") {
    return "shadow-[0_0_10px_rgba(59,130,246,0.22)]";
  }

  if (kind === "event_completed") {
    return "shadow-[0_0_10px_rgba(16,185,129,0.22)]";
  }

  return "shadow-[0_0_10px_rgba(239,68,68,0.22)]";
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

function mapEventStatusKind(status: EventStatus): CalendarStatusKind {
  return `event_${status}` as CalendarStatusKind;
}

function mapEventToCalendarItem(event: Event): CalendarItem | null {
  const dateKey = resolveCalendarDateKey(event.event_date);

  if (!dateKey) {
    return null;
  }

  return {
    id: `event-${event.id}`,
    type: "event",
    dateKey,
    title: event.name.trim() || "Untitled event",
    timeLabel: formatCalendarTimeLabel(event.set_time),
    statusLabel: formatEventStatusLabel(event.status),
    statusKind: mapEventStatusKind(event.status),
    href: `/events/${event.id}`,
    typeLabel: getCalendarTypeLabel("event"),
  };
}

function mapBookingToCalendarItem(
  booking: BookingRequest,
  type: "sent_booking" | "received_booking",
): CalendarItem | null {
  const dateKey = resolveCalendarDateKey(booking.event_date);

  if (!dateKey) {
    return null;
  }

  const href = booking.event_id
    ? `/events/${booking.event_id}`
    : `/dm/${booking.conversation_id}`;

  return {
    id: `${type}-${booking.id}`,
    type,
    dateKey,
    title: booking.event_name.trim() || "Untitled booking",
    timeLabel: formatCalendarTimeLabel(booking.set_time),
    statusLabel: formatBookingStatusLabel(booking.status),
    statusKind: booking.status,
    href,
    typeLabel: getCalendarTypeLabel(type),
  };
}

export async function loadCalendarItems(role: UserRole | null): Promise<CalendarItem[]> {
  const items: CalendarItem[] = [];

  if (role === "promoter" || role === "both") {
    const [events, sentBookings] = await Promise.all([
      listOwnedEvents(),
      listSentBookingRequests(),
    ]);

    for (const event of events) {
      const item = mapEventToCalendarItem(event);

      if (item) {
        items.push(item);
      }
    }

    for (const booking of sentBookings) {
      const item = mapBookingToCalendarItem(booking, "sent_booking");

      if (item) {
        items.push(item);
      }
    }
  }

  if (role === "dj" || role === "both") {
    const receivedBookings = await listReceivedBookingRequests();

    for (const booking of receivedBookings) {
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

export async function loadPlannerCalendarItems(): Promise<CalendarItem[]> {
  const [events, sentBookings] = await Promise.all([
    listOwnedEvents(),
    listSentBookingRequests(),
  ]);

  const items: CalendarItem[] = [];

  for (const event of events) {
    const item = mapEventToCalendarItem(event);

    if (item) {
      items.push(item);
    }
  }

  for (const booking of sentBookings) {
    const item = mapBookingToCalendarItem(booking, "sent_booking");

    if (item) {
      items.push(item);
    }
  }

  return items.sort((left, right) => {
    if (left.dateKey !== right.dateKey) {
      return left.dateKey.localeCompare(right.dateKey);
    }

    return left.title.localeCompare(right.title);
  });
}

export function getPlannerCalendarBadgeLabel(item: CalendarItem): string {
  if (item.type === "event") {
    return "Owned Event";
  }

  if (item.statusKind === "pending") {
    return "Sent Pending";
  }

  if (item.statusKind === "accepted") {
    return "Sent Accepted";
  }

  if (item.statusKind === "declined") {
    return "Sent Declined";
  }

  return item.statusLabel;
}

export const PLANNER_CALENDAR_LEGEND_ITEMS = [
  { label: "Owned Event", kind: "event_upcoming" as const },
  { label: "Sent Pending", kind: "pending" as const },
  { label: "Sent Accepted", kind: "accepted" as const },
  { label: "Sent Declined", kind: "declined" as const },
] as const;

export function formatPlannerSelectedDateLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function buildPlannerCreateEventHref(dateKey: string): string {
  const params = new URLSearchParams({
    create: "event",
    eventDate: dateKey,
  });
  return `/events?${params.toString()}`;
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
