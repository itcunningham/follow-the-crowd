"use client";

import { getEventCoverImageAlt } from "@/lib/events/eventCoverImage";
import {
  getEventFallbackColour,
  getEventFallbackColourStyles,
  getEventInitials,
} from "@/lib/events/eventFallbackColour";

export type EventArtworkTileSize = "list" | "context" | "inbox" | "hero";

const SIZE_CLASSES: Record<EventArtworkTileSize, string> = {
  list: "h-[5.5rem] w-[4.375rem] rounded-xl text-sm",
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
  const trimmedCoverUrl = coverImageUrl?.trim() || null;
  const sizeClassName = SIZE_CLASSES[size];

  if (trimmedCoverUrl) {
    return (
      <div
        className={`shrink-0 overflow-hidden border border-ftc-border-subtle bg-ftc-bg-elevated ${sizeClassName} ${className}`}
      >
        <img
          src={trimmedCoverUrl}
          alt={getEventCoverImageAlt(eventName)}
          className="h-full w-full object-contain"
        />
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
