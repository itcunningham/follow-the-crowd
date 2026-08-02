import { getTodayDateKey, resolveEventDateKey } from "@/lib/bookingDateTime";
import type { EventStatus } from "@/lib/events";

/**
 * One short line above the conversation answering "when is this?".
 *
 * Day-level only, from the event's own date key against today's — no clock, no
 * ticking, no timers. The chat is for coordinating around the event, so the
 * useful granularity is days out, today, or done; anything finer would be
 * movement on screen that nobody asked to watch.
 *
 * `null` means show nothing rather than show something empty: an unparseable
 * date is not worth a placeholder.
 */
export function resolveCrewChatCountdownLabel(
  eventDate: string | null | undefined,
  eventStatus?: EventStatus | null,
  todayKey: string = getTodayDateKey(),
): string | null {
  if (eventStatus === "cancelled") {
    return "Event cancelled";
  }

  const trimmed = eventDate?.trim();

  if (!trimmed) {
    return null;
  }

  const dateKey = resolveEventDateKey(trimmed);

  if (!dateKey) {
    return null;
  }

  if (dateKey === todayKey) {
    return "Today";
  }

  if (dateKey < todayKey) {
    return "Event finished";
  }

  const days = countDaysBetweenDateKeys(todayKey, dateKey);

  if (days === null) {
    return null;
  }

  if (days === 1) {
    return "Tomorrow";
  }

  return `Event starts in ${days} days`;
}

/** Whole days from one YYYY-MM-DD key to another, via UTC noon to dodge DST. */
function countDaysBetweenDateKeys(fromKey: string, toKey: string): number | null {
  const from = Date.parse(`${fromKey}T12:00:00Z`);
  const to = Date.parse(`${toKey}T12:00:00Z`);

  if (Number.isNaN(from) || Number.isNaN(to)) {
    return null;
  }

  return Math.round((to - from) / 86_400_000);
}
