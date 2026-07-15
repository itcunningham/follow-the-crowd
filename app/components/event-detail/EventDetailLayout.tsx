"use client";

import Link from "next/link";
import EventDetailHeroImage from "@/app/components/event-detail/EventDetailHeroImage";
import { getEventCoverImageAlt } from "@/lib/events/eventCoverImage";
import {
  getEventFallbackColour,
  getEventFallbackColourStyles,
  getEventInitials,
} from "@/lib/events/eventFallbackColour";
import { formatDisplayEventDate } from "@/lib/bookingDateTime";
import {
  FtcCalendarIcon,
  FtcClockIcon,
  FtcMetaRow,
  FtcVenueIcon,
} from "@/app/components/ftc/FtcCompactMeta";
import { EVENT_DETAIL_CARD_CLASS } from "@/app/components/event-detail/eventDetailUi";
import type { Event } from "@/lib/events";
import type { EventEditHeaderState } from "@/lib/events/useEventEditHeaderVisibility";

import { FTC_SECTION_TITLE_CLASS } from "@/lib/design/ftcDesignSystem";

export function EventDetailSectionTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`${FTC_SECTION_TITLE_CLASS} ${className}`.trim()}>{children}</h2>
  );
}

export function EventDetailSummary({ event }: { event: Event }) {
  const date = formatDisplayEventDate(event.event_date) || "Date TBC";
  const time = event.set_time?.trim() || "Time TBC";
  const venue = event.venue?.trim() || "Venue TBC";

  return (
    <div className={EVENT_DETAIL_CARD_CLASS}>
      <ul className="space-y-1.5">
        <FtcMetaRow icon={<FtcCalendarIcon />}>{date}</FtcMetaRow>
        <FtcMetaRow icon={<FtcClockIcon />}>{time}</FtcMetaRow>
        <FtcMetaRow icon={<FtcVenueIcon />}>{venue}</FtcMetaRow>
      </ul>
    </div>
  );
}

/** @deprecated Use EventDetailSummary */
export default function EventDetailMetaList({ event }: { event: Event }) {
  return <EventDetailSummary event={event} />;
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
    "flex h-10 w-10 items-center justify-center rounded-xl border border-ftc-border-subtle bg-ftc-bg/80 text-ftc-text transition duration-150 ease-out hover:border-ftc-border-strong hover:bg-ftc-bg-elevated motion-reduce:transition-none";

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
      className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-ftc-border-subtle bg-ftc-bg/80 px-2.5 text-ftc-text transition duration-150 ease-out hover:border-ftc-border-strong hover:bg-ftc-bg-elevated sm:px-3 motion-reduce:transition-none"
    >
      <EventDetailEditButtonGlyph />
      <span className="text-xs font-semibold uppercase tracking-wide">Edit</span>
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
      <span className="text-xs font-semibold uppercase tracking-wide">Edit</span>
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
  compact = false,
}: {
  eventName: string;
  coverImageUrl?: string | null;
  fallbackColour?: string | null;
  statusBadge?: React.ReactNode;
  compact?: boolean;
}) {
  const trimmedCoverUrl = coverImageUrl?.trim() || null;

  if (!trimmedCoverUrl) {
    const colourKey = getEventFallbackColour(eventName, fallbackColour);
    const styles = getEventFallbackColourStyles(colourKey);
    const initials = getEventInitials(eventName);

    return (
      <div
        data-event-detail-hero
        className={`relative aspect-[4/3] w-full overflow-hidden border-b border-ftc-border-subtle ${styles.heroClassName} ${
          compact ? "max-h-[112px]" : "max-h-[165px]"
        }`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-4xl font-bold uppercase tracking-wider sm:text-5xl ${styles.textClassName}`}
          >
            {initials}
          </span>
        </div>
        {statusBadge ? <div className="absolute bottom-3 left-4">{statusBadge}</div> : null}
      </div>
    );
  }

  return (
    <div data-event-detail-hero className="-mb-2 px-4 pb-0 pt-2.5 sm:px-6">
      <EventDetailHeroImage
        src={trimmedCoverUrl}
        alt={getEventCoverImageAlt(eventName)}
        badge={statusBadge}
      />
    </div>
  );
}
