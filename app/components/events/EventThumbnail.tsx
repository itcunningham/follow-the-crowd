"use client";

import { EventCoverImageMedia } from "@/app/components/events/EventCoverImagePrimitives";
import {
  getEventCoverImageAlt,
  normalizeEventCoverImageUrl,
} from "@/lib/events/eventCoverImage";
import {
  getEventFallbackColour,
  getEventFallbackColourStyles,
  getEventInitials,
} from "@/lib/events/eventFallbackColour";

export type EventThumbnailSize = "list" | "context" | "inbox" | "hero";

/** Fixed square bounds — compact artwork never drives layout height beyond these sizes. */
const SIZE_CLASSES: Record<EventThumbnailSize, string> = {
  list: "h-16 w-16 rounded-xl text-xs",
  context: "h-11 w-11 rounded-xl text-[10px]",
  inbox: "h-12 w-12 rounded-xl text-xs",
  hero: "h-16 w-16 rounded-2xl text-lg sm:h-20 sm:w-20 sm:text-xl",
};

export default function EventThumbnail({
  eventName,
  coverImageUrl,
  fallbackColour,
  size = "context",
  className = "",
}: {
  eventName: string;
  coverImageUrl?: string | null;
  fallbackColour?: string | null;
  size?: EventThumbnailSize;
  className?: string;
}) {
  const trimmedCoverUrl = normalizeEventCoverImageUrl(coverImageUrl);
  const sizeClassName = SIZE_CLASSES[size];
  const frameClassName = `ftc-event-thumbnail ${sizeClassName} ${className}`.trim();

  if (trimmedCoverUrl) {
    return (
      <div className={`${frameClassName} border border-ftc-border-subtle bg-ftc-bg-elevated`}>
        <EventCoverImageMedia src={trimmedCoverUrl} alt={getEventCoverImageAlt(eventName)} />
      </div>
    );
  }

  const colourKey = getEventFallbackColour(eventName, fallbackColour);
  const styles = getEventFallbackColourStyles(colourKey);
  const initials = getEventInitials(eventName);

  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center border font-bold uppercase tracking-wide ${frameClassName} ${styles.tileClassName} ${styles.textClassName}`}
    >
      {initials}
    </div>
  );
}
