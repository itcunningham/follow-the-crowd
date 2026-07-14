"use client";

import {
  getEventCoverImageAlt,
  normalizeEventCoverImageUrl,
} from "@/lib/events/eventCoverImage";
import { EventCoverImageMedia } from "@/app/components/events/EventCoverImagePrimitives";
import {
  getEventFallbackColour,
  getEventFallbackColourStyles,
  getEventInitials,
} from "@/lib/events/eventFallbackColour";

export type EventArtworkTileSize = "list" | "context" | "inbox" | "hero";

const SIZE_CLASSES: Record<EventArtworkTileSize, string> = {
  list: "h-[4.75rem] w-[3.75rem] rounded-xl text-xs",
  context: "h-11 w-11 rounded-xl text-[10px]",
  inbox: "h-12 w-12 rounded-xl text-xs",
  hero: "h-16 w-16 rounded-2xl text-lg sm:h-20 sm:w-20 sm:text-xl",
};

export default function EventArtworkTile({
  eventName,
  coverImageUrl,
  fallbackColour,
  size = "context",
  className = "",
}: {
  eventName: string;
  coverImageUrl?: string | null;
  fallbackColour?: string | null;
  size?: EventArtworkTileSize;
  className?: string;
}) {
  const trimmedCoverUrl = normalizeEventCoverImageUrl(coverImageUrl);
  const sizeClassName = SIZE_CLASSES[size];

  if (trimmedCoverUrl) {
    return (
      <div
        className={`ftc-event-image-frame ftc-event-image-frame--thumb shrink-0 border border-ftc-border-subtle bg-ftc-bg-elevated ${sizeClassName} ${className}`}
      >
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
      className={`flex shrink-0 items-center justify-center border font-bold uppercase tracking-wide ${sizeClassName} ${styles.tileClassName} ${styles.textClassName} ${className}`}
    >
      {initials}
    </div>
  );
}
