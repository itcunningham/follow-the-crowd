"use client";

import Link from "next/link";
import AnimatedExpandPanel from "@/app/components/AnimatedExpandPanel";
import { FtcClockIcon, FtcVenueIcon, FtcCalendarIcon } from "@/app/components/ftc/FtcCompactMeta";
import { formatGroupChatEventDate } from "@/lib/groupChats";

const VIEW_EVENT_BUTTON_CLASS =
  "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--ftc-color-primary-border)] bg-[var(--ftc-color-primary-subtle)] px-2.5 py-1.5 text-xs font-semibold text-ftc-primary transition hover:bg-ftc-primary/20";

/**
 * Compact event-context strip beneath the chat header: venue, date, time and a
 * "View Event" shortcut. Event name and crew count live in the pinned header
 * instead — this card is deliberately allowed to disappear once the user is
 * reading the conversation (see `collapsed`), which repeating the identity
 * info here would work against.
 */
export default function GroupChatEventContextCard({
  eventId,
  venue,
  eventDate,
  setTime,
  showViewEventAction,
  collapsed,
}: {
  eventId: string;
  venue: string;
  eventDate: string;
  setTime: string;
  showViewEventAction: boolean;
  collapsed: boolean;
}) {
  const venueLabel = venue.trim() || "Venue TBC";
  const dateLabel = eventDate.trim() ? formatGroupChatEventDate(eventDate) : "Date TBC";
  const timeLabel = setTime.trim() || "Time TBC";

  return (
    <AnimatedExpandPanel open={!collapsed} dataAttribute="data-crew-chat-event-card">
      <div className="shrink-0 border-b border-ftc-border-subtle bg-ftc-bg/95 px-3 py-2.5 backdrop-blur-md sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
            <li className="flex min-w-0 items-center gap-1 text-xs text-ftc-text-muted">
              <FtcVenueIcon />
              <span className="min-w-0 truncate">{venueLabel}</span>
            </li>
            <li className="flex min-w-0 items-center gap-1 text-xs text-ftc-text-muted">
              <FtcCalendarIcon />
              <span className="min-w-0 truncate">{dateLabel}</span>
            </li>
            <li className="flex min-w-0 items-center gap-1 text-xs text-ftc-text-muted">
              <FtcClockIcon />
              <span className="min-w-0 truncate">{timeLabel}</span>
            </li>
          </ul>

          {showViewEventAction ? (
            <Link href={`/events/${eventId}`} className={VIEW_EVENT_BUTTON_CLASS}>
              View Event
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          ) : null}
        </div>
      </div>
    </AnimatedExpandPanel>
  );
}
