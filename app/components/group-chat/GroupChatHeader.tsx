"use client";

import Link from "next/link";
import CrewChatAvatarStack from "@/app/components/group-chat/CrewChatAvatarStack";
import { DM_BOOKING_CARD_SECONDARY_BUTTON_CLASS } from "@/app/components/booking/DmBookingCardLayout";
import EventArtworkTile from "@/app/components/events/EventArtworkTile";
import { FtcCalendarIcon } from "@/app/components/ftc/FtcCompactMeta";
import type { UserAvatarProfile } from "@/lib/user/currentUser";

function ChatBackButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ftc-border-subtle bg-ftc-surface text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </Link>
  );
}

export default function GroupChatHeader({
  backHref,
  backLabel,
  eventId,
  eventName,
  coverImageUrl,
  fallbackColour,
  memberCount,
  participantIds,
  participantProfiles,
  showEventDetailsLink,
}: {
  backHref: string;
  backLabel: string;
  eventId: string;
  eventName: string;
  coverImageUrl: string | null;
  fallbackColour: string | null;
  memberCount: number;
  participantIds: string[];
  participantProfiles: Map<string, UserAvatarProfile>;
  showEventDetailsLink: boolean;
}) {
  const memberLabel = memberCount === 1 ? "1 member" : `${memberCount} members`;

  return (
    <div className="flex items-center gap-2">
      <ChatBackButton href={backHref} label={backLabel} />

      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <EventArtworkTile
          eventName={eventName}
          coverImageUrl={coverImageUrl}
          fallbackColour={fallbackColour}
          size="context"
          className="shrink-0"
        />

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold leading-tight text-ftc-text">
            {eventName}
          </h1>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-xs leading-tight text-ftc-text-muted">
              Crew chat • {memberLabel}
            </p>
            {participantIds.length > 0 ? (
              <CrewChatAvatarStack
                participantIds={participantIds}
                profiles={participantProfiles}
              />
            ) : null}
          </div>
        </div>
      </div>

      {showEventDetailsLink ? (
        <Link
          href={`/events/${eventId}`}
          className={`${DM_BOOKING_CARD_SECONDARY_BUTTON_CLASS} shrink-0 gap-1.5 self-center px-3 py-1.5 text-[11px]`}
        >
          <FtcCalendarIcon />
          View event
        </Link>
      ) : null}
    </div>
  );
}
