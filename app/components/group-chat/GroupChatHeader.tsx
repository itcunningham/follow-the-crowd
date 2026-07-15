"use client";

import Link from "next/link";
import CrewChatAvatarStack from "@/app/components/group-chat/CrewChatAvatarStack";
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

const VIEW_EVENT_BUTTON_CLASS =
  "inline-flex shrink-0 items-center gap-1 rounded-lg border border-ftc-border-subtle bg-ftc-surface/70 px-2 py-1 text-[10px] font-medium text-ftc-text-secondary transition hover:border-ftc-border-strong hover:bg-ftc-surface hover:text-ftc-text";

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
      <div className="pt-0.5">
        <ChatBackButton href={backHref} label={backLabel} />
      </div>

      <div className="min-w-0 flex-1 overflow-visible">
        <h1 className="truncate text-base font-semibold text-ftc-text">{eventName}</h1>
        <p className="mt-0.5 truncate text-xs text-ftc-text-muted">
          Crew chat • {memberLabel}
        </p>
        {participantIds.length > 0 ? (
          <div className="mt-1.5 overflow-visible">
            <CrewChatAvatarStack
              participantIds={participantIds}
              profiles={participantProfiles}
              variant="header"
            />
          </div>
        ) : null}
      </div>

      {showEventDetailsLink ? (
        <Link href={`/events/${eventId}`} className={`${VIEW_EVENT_BUTTON_CLASS} mt-0.5`}>
          <FtcCalendarIcon />
          View event
        </Link>
      ) : null}
    </div>
  );
}
