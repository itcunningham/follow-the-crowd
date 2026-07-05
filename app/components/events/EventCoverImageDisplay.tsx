"use client";

import EventArtworkTile from "@/app/components/events/EventArtworkTile";

export function EventCoverImageListThumb({
  eventName,
  coverImageUrl,
  fallbackColour,
}: {
  eventName: string;
  coverImageUrl?: string | null;
  fallbackColour?: string | null;
}) {
  return (
    <EventArtworkTile
      eventName={eventName}
      coverImageUrl={coverImageUrl}
      fallbackColour={fallbackColour}
      size="list"
    />
  );
}

export function EventCoverImageContextThumb({
  eventName,
  coverImageUrl,
  fallbackColour,
}: {
  eventName: string;
  coverImageUrl?: string | null;
  fallbackColour?: string | null;
}) {
  return (
    <EventArtworkTile
      eventName={eventName}
      coverImageUrl={coverImageUrl}
      fallbackColour={fallbackColour}
      size="context"
    />
  );
}

export { default as EventArtworkTile } from "@/app/components/events/EventArtworkTile";
