"use client";

import { getEventCoverImageAlt } from "@/lib/events/eventCoverImage";

export function EventCoverImageThumb({
  coverImageUrl,
  eventName,
  className = "",
}: {
  coverImageUrl: string;
  eventName: string;
  className?: string;
}) {
  return (
    <img
      src={coverImageUrl}
      alt={getEventCoverImageAlt(eventName)}
      className={`aspect-video object-cover ${className}`}
    />
  );
}

export function EventCoverImageListThumb({
  coverImageUrl,
  eventName,
}: {
  coverImageUrl: string;
  eventName: string;
}) {
  return (
    <EventCoverImageThumb
      coverImageUrl={coverImageUrl}
      eventName={eventName}
      className="h-16 w-[7.125rem] shrink-0 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated"
    />
  );
}

export function EventCoverImageContextThumb({
  coverImageUrl,
  eventName,
}: {
  coverImageUrl: string;
  eventName: string;
}) {
  return (
    <EventCoverImageThumb
      coverImageUrl={coverImageUrl}
      eventName={eventName}
      className="h-10 w-[4.5rem] shrink-0 rounded-lg border border-ftc-border-subtle bg-ftc-bg-elevated"
    />
  );
}
