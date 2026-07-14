"use client";

import { normalizeEventCoverImageUrl } from "@/lib/events/eventCoverImage";
import EventThumbnail from "@/app/components/events/EventThumbnail";

export {
  EVENT_COVER_IMAGE_MEDIA_CLASS,
  EventCoverImageFrame,
  EventCoverImageHeroPreview,
  EventCoverImageMedia,
} from "@/app/components/events/EventCoverImagePrimitives";

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
    <EventThumbnail
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
    <EventThumbnail
      eventName={eventName}
      coverImageUrl={coverImageUrl}
      fallbackColour={fallbackColour}
      size="context"
    />
  );
}

export function eventCoverImageHasUrl(coverImageUrl?: string | null): boolean {
  return normalizeEventCoverImageUrl(coverImageUrl) !== null;
}

export { default as EventArtworkTile } from "@/app/components/events/EventArtworkTile";
export { default as EventThumbnail } from "@/app/components/events/EventThumbnail";
