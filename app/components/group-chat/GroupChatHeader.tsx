"use client";

import Link from "next/link";
import CrewChatAvatarStack from "@/app/components/group-chat/CrewChatAvatarStack";
import { DM_BOOKING_CARD_SECONDARY_BUTTON_CLASS } from "@/app/components/booking/DmBookingCardLayout";
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
  memberCount,
  participantIds,
  participantProfiles,
  showEventDetailsLink,
}: {
  backHref: string;
  backLabel: string;
  eventId: string;
  eventName: string;
  memberCount: number;
  participantIds: string[];
  participantProfiles: Map<string, UserAvatarProfile>;
  showEventDetailsLink: boolean;
}) {
  const memberLabel = memberCount === 1 ? "1 member" : `${memberCount} members`;

  return (
    <div className="flex items-start gap-2">
      <ChatBackButton href={backHref} label={backLabel} />

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold text-ftc-text">{eventName}</h1>
        <p className="mt-0.5 truncate text-xs text-ftc-text-muted">
          Crew chat · {memberLabel}
        </p>
        <div className="mt-2">
          <CrewChatAvatarStack
            participantIds={participantIds}
            profiles={participantProfiles}
          />
        </div>
      </div>

      {showEventDetailsLink ? (
        <Link
          href={`/events/${eventId}`}
          className={`${DM_BOOKING_CARD_SECONDARY_BUTTON_CLASS} shrink-0 gap-1.5 px-3 py-2 text-[11px]`}
        >
          <FtcCalendarIcon />
          View event
        </Link>
      ) : null}
    </div>
  );
}
