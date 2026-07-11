"use client";

import Link from "next/link";
import { getEventCoverImageAlt } from "@/lib/events/eventCoverImage";
import {
  getEventFallbackColour,
  getEventFallbackColourStyles,
  getEventInitials,
} from "@/lib/events/eventFallbackColour";
import { formatDisplayEventDate } from "@/lib/bookingDateTime";
import type { Event } from "@/lib/events";
import type { EventEditHeaderState } from "@/lib/events/useEventEditHeaderVisibility";

export function formatEventDetailDateLine(eventDate: string, setTime: string): string {
  const trimmedTime = setTime.trim();
  const datePart = formatDisplayEventDate(eventDate) || "Date TBC";

  if (!trimmedTime) {
    return datePart;
  }

  return `${datePart} · ${trimmedTime}`;
}

function MetaRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 text-sm leading-relaxed text-ftc-text-secondary">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-ftc-text-muted">
        {icon}
      </span>
      <span className="min-w-0 break-words">{children}</span>
    </li>
  );
}

export default function EventDetailMetaList({ event }: { event: Event }) {
  return (
    <ul className="space-y-3">
      <MetaRow
        icon={
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.75">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v4M16 3v4M3 11h18" />
          </svg>
        }
      >
        {formatEventDetailDateLine(event.event_date, event.set_time)}
      </MetaRow>

      <MetaRow
        icon={
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10Z" />
            <circle cx="12" cy="11" r="2.5" />
          </svg>
        }
      >
        {event.venue}
      </MetaRow>
    </ul>
  );
}

export function EventDetailOverlayButton({
  href,
  onClick,
  label,
  children,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  children: React.ReactNode;
}) {
  const className =
    "flex h-10 w-10 items-center justify-center rounded-xl border border-ftc-border-subtle bg-ftc-bg/80 text-ftc-text backdrop-blur-sm transition hover:border-ftc-border-strong hover:bg-ftc-bg-elevated";

  if (href) {
    return (
      <Link href={href} aria-label={label} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={label} onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export function EventDetailEditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Edit event"
      onClick={onClick}
      className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-ftc-border-subtle bg-ftc-bg/80 px-2.5 text-ftc-text backdrop-blur-sm transition hover:border-ftc-border-strong hover:bg-ftc-bg-elevated sm:px-3"
    >
      <EventDetailEditButtonGlyph />
      <span className="hidden text-xs font-semibold uppercase tracking-wide sm:inline">Edit</span>
    </button>
  );
}

function EventDetailEditButtonGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function EventDetailEditButtonPlaceholder() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none invisible flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-transparent px-2.5 sm:px-3"
    >
      <EventDetailEditButtonGlyph />
      <span className="hidden text-xs font-semibold uppercase tracking-wide sm:inline">Edit</span>
    </span>
  );
}

export function EventDetailEditHeaderSlot({
  state,
  onEditClick,
}: {
  state: EventEditHeaderState;
  onEditClick?: () => void;
}) {
  if (state === "show") {
    return <EventDetailEditButton onClick={onEditClick ?? (() => undefined)} />;
  }

  if (state === "pending") {
    return <EventDetailEditButtonPlaceholder />;
  }

  return null;
}

export function EventDetailHero({
  eventName,
  coverImageUrl,
  fallbackColour,
  statusBadge,
}: {
  eventName: string;
  coverImageUrl?: string | null;
  fallbackColour?: string | null;
  statusBadge?: React.ReactNode;
}) {
  const trimmedCoverUrl = coverImageUrl?.trim() || null;

  if (!trimmedCoverUrl) {
    const colourKey = getEventFallbackColour(eventName, fallbackColour);
    const styles = getEventFallbackColourStyles(colourKey);
    const initials = getEventInitials(eventName);

    return (
      <div
        data-event-detail-hero
        className={`relative aspect-[4/3] max-h-[220px] w-full overflow-hidden border-b border-ftc-border-subtle ${styles.heroClassName}`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-5xl font-bold uppercase tracking-wider sm:text-6xl ${styles.textClassName}`}
          >
            {initials}
          </span>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ftc-bg to-transparent" />
        {statusBadge ? <div className="absolute bottom-4 left-4">{statusBadge}</div> : null}
      </div>
    );
  }

  return (
    <div data-event-detail-hero className="px-4 pb-1 pt-3 sm:px-6">
      <div className="mx-auto flex w-full max-w-[15rem] flex-col items-center sm:max-w-[17.5rem]">
        <div className="w-full overflow-hidden rounded-2xl border border-ftc-border-subtle bg-ftc-bg-elevated">
          <div className="relative aspect-[3/4] w-full bg-ftc-bg">
            <img
              src={trimmedCoverUrl}
              alt={getEventCoverImageAlt(eventName)}
              className="absolute inset-0 h-full w-full object-contain p-1.5"
            />
          </div>
        </div>
        {statusBadge ? <div className="mt-3">{statusBadge}</div> : null}
      </div>
    </div>
  );
}
