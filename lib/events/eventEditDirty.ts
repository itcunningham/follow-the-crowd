import { normalizeStoredRate } from "@/lib/bookingRate";
import type { Event, EventInput } from "@/lib/events";
import { isSelectableEventFallbackColourKey } from "@/lib/events/eventFallbackColour";

/** True when the event edit form (or flyer) differs from the loaded event. */
export function isEventDetailEditDirty(
  event: Event,
  form: EventInput,
  cover: { file: File | null; removeExisting: boolean },
): boolean {
  if (cover.file !== null || cover.removeExisting) {
    return true;
  }

  if (event.name !== form.name) {
    return true;
  }

  if (event.venue !== form.venue) {
    return true;
  }

  if (event.event_date !== form.eventDate) {
    return true;
  }

  if (event.set_time !== form.setTime) {
    return true;
  }

  if (normalizeStoredRate(event.rate) !== normalizeStoredRate(form.rate)) {
    return true;
  }

  if (event.notes !== form.notes) {
    return true;
  }

  if ((event.booking_plan_id ?? null) !== (form.bookingPlanId ?? null)) {
    return true;
  }

  const eventFallback = isSelectableEventFallbackColourKey(event.fallback_colour ?? "")
    ? event.fallback_colour
    : null;

  if ((eventFallback ?? null) !== (form.fallbackColour ?? null)) {
    return true;
  }

  return false;
}
