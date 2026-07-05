"use client";

import { getEventCoverImageAlt } from "@/lib/events/eventCoverImage";

function EventFlyerFrame({
  coverImageUrl,
  eventName,
  className = "",
}: {
  coverImageUrl: string;
  eventName: string;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden border border-ftc-border-subtle bg-ftc-bg ${className}`}
    >
      <img
        src={coverImageUrl}
        alt={getEventCoverImageAlt(eventName)}
        className="h-full w-full object-contain"
      />
    </div>
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
    <EventFlyerFrame
      coverImageUrl={coverImageUrl}
      eventName={eventName}
      className="h-[5.5rem] w-[4.375rem] shrink-0 rounded-xl bg-ftc-bg-elevated"
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
    <EventFlyerFrame
      coverImageUrl={coverImageUrl}
      eventName={eventName}
      className="h-11 w-11 shrink-0 rounded-xl bg-ftc-bg-elevated"
    />
  );
}
