"use client";

import EventDateStatusBadge from "@/app/components/EventDateStatusBadge";
import { formatGroupChatEventDate } from "@/lib/groupChats";
import { formatEventStatusLabel, type EventStatus } from "@/lib/events";

export default function GroupChatEventContextCard({
  eventName,
  venue,
  eventDate,
  status,
}: {
  eventName: string;
  venue: string;
  eventDate: string;
  status: EventStatus | null;
}) {
  const venueLabel = venue.trim() || "Venue TBC";
  const dateLabel = eventDate.trim()
    ? formatGroupChatEventDate(eventDate)
    : "Date TBC";

  return (
    <div className="shrink-0 border-b border-ftc-border-subtle bg-ftc-bg px-3 py-3 sm:px-4">
      <div className="rounded-2xl border border-ftc-border-subtle bg-ftc-surface px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ftc-text">{eventName}</p>
            <p className="mt-1 truncate text-xs text-ftc-text-muted">
              {venueLabel} · {dateLabel}
            </p>
          </div>
          <div className="flex shrink-0">
            {status === "draft" || status === "completed" ? (
              <span className="rounded-full border border-ftc-border-subtle bg-ftc-bg-elevated px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ftc-text-secondary">
                {formatEventStatusLabel(status)}
              </span>
            ) : eventDate ? (
              <EventDateStatusBadge eventDate={eventDate} status={status ?? undefined} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
