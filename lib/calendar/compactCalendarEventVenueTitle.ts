import { formatPlannerCalendarItemHeadline } from "@/lib/calendar";

export function resolveCompactCalendarEventOnlyTitle(eventName: string): string {
  const trimmed = eventName.trim();

  return trimmed || "Untitled event";
}

export function resolveCompactCalendarFullTitle(
  eventName: string,
  venue: string | null | undefined,
): string {
  return formatPlannerCalendarItemHeadline(eventName, venue);
}

export function measureUnconstrainedTextWidth(text: string, className: string): number {
  if (typeof document === "undefined") {
    return 0;
  }

  const measure = document.createElement("span");
  measure.className = className;
  measure.style.visibility = "hidden";
  measure.style.position = "absolute";
  measure.style.whiteSpace = "nowrap";
  measure.style.pointerEvents = "none";
  measure.textContent = text;
  document.body.appendChild(measure);
  const width = measure.getBoundingClientRect().width;
  measure.remove();

  return width;
}

/** True when the full Event · Venue string fits without CSS ellipsis. */
export function doesFullCalendarTitleFit(
  availableWidth: number,
  fullTitle: string,
  className: string,
): boolean {
  if (availableWidth <= 0 || !fullTitle) {
    return false;
  }

  return measureUnconstrainedTextWidth(fullTitle, className) <= availableWidth;
}

export function resolveCompactCalendarDisplayTitle(
  eventName: string,
  venue: string | null | undefined,
  includeVenue: boolean,
): string {
  if (!includeVenue) {
    return resolveCompactCalendarEventOnlyTitle(eventName);
  }

  return resolveCompactCalendarFullTitle(eventName, venue);
}
