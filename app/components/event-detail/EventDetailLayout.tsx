"use client";

import Link from "next/link";
import { getEventCoverImageAlt } from "@/lib/events/eventCoverImage";
import { formatGroupChatEventDate } from "@/lib/groupChats";
import { parseEventDate } from "@/lib/bookingDateTime";
import { formatRateDisplay, normalizeStoredRate } from "@/lib/bookingRate";
import type { Event } from "@/lib/events";

export function formatEventDetailDateLine(eventDate: string, setTime: string): string {
  const parsed = parseEventDate(eventDate);
  const trimmedTime = setTime.trim();

  let datePart = eventDate.trim();

  if (parsed.isoDate) {
    const [year, month, day] = parsed.isoDate.split("-").map(Number);
    datePart = new Date(year, month - 1, day).toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } else if (parsed.legacyValue) {
    datePart = parsed.legacyValue;
  } else if (parsed.isoDate === "" && eventDate.trim()) {
    datePart = formatGroupChatEventDate(eventDate);
  }

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
  const rateLabel = formatRateDisplay(event.rate);
  const hasRate = Boolean(normalizeStoredRate(event.rate));

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

      {hasRate ? (
        <MetaRow
          icon={
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M12 3v18M17 8H9.5a2.5 2.5 0 0 0 0 5H14a2.5 2.5 0 0 1 0 5H7" />
            </svg>
          }
        >
          Proposed rate {rateLabel}
        </MetaRow>
      ) : null}
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

export function EventDetailHero({
  eventName,
  coverImageUrl,
  statusBadge,
}: {
  eventName: string;
  coverImageUrl?: string | null;
  statusBadge?: React.ReactNode;
}) {
  const initial = eventName.trim().charAt(0).toUpperCase() || "E";
  const trimmedCoverUrl = coverImageUrl?.trim() || null;

  if (!trimmedCoverUrl) {
    return (
      <div className="relative aspect-[4/3] max-h-[220px] w-full overflow-hidden bg-ftc-bg-elevated">
        <div className="absolute inset-0 bg-gradient-to-b from-ftc-surface-raised via-ftc-bg-elevated to-ftc-bg" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl font-bold uppercase tracking-wider text-ftc-border-strong/80 sm:text-7xl">
            {initial}
          </span>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ftc-bg to-transparent" />
        {statusBadge ? <div className="absolute bottom-4 left-4">{statusBadge}</div> : null}
      </div>
    );
  }

  return (
    <div className="px-4 pb-1 pt-3 sm:px-6">
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
