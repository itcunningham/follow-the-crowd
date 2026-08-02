"use client";

import Link from "next/link";
import CrewChatAvatarStack from "@/app/components/group-chat/CrewChatAvatarStack";
import { FtcPeopleIcon } from "@/app/components/ftc/FtcCompactMeta";
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

/**
 * Identity strip: event name (always pinned, never collapses) plus a single
 * tappable "N Crew Members" line and avatar stack — both open the member
 * sheet. Venue, date and time live in the collapsible card just beneath this
 * header instead of being repeated here; View Event moved there too, so this
 * header states one thing only: what event this is, and who's in it.
 */
export default function GroupChatHeader({
  backHref,
  backLabel,
  eventName,
  memberCount,
  participantIds,
  participantProfiles,
  onOpenMemberSheet,
}: {
  backHref: string;
  backLabel: string;
  eventName: string;
  memberCount: number;
  participantIds: string[];
  participantProfiles: Map<string, UserAvatarProfile>;
  onOpenMemberSheet: () => void;
}) {
  const memberLabel = memberCount === 1 ? "1 Crew Member" : `${memberCount} Crew Members`;

  return (
    <div className="flex items-start gap-2">
      <div className="pt-0.5">
        <ChatBackButton href={backHref} label={backLabel} />
      </div>

      <div className="min-w-0 flex-1 overflow-visible">
        <h1 className="truncate text-base font-semibold text-ftc-text">{eventName}</h1>
        <button
          type="button"
          onClick={onOpenMemberSheet}
          aria-label={`View crew — ${memberLabel}`}
          className="-ml-1 mt-0.5 block max-w-full overflow-visible rounded-lg py-0.5 pl-1 pr-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ftc-primary/35"
        >
          <span className="flex items-center gap-1 truncate text-xs text-ftc-text-muted">
            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
              <FtcPeopleIcon />
            </span>
            {memberLabel}
          </span>
          {participantIds.length > 0 ? (
            <span className="mt-1.5 block overflow-visible">
              <CrewChatAvatarStack
                participantIds={participantIds}
                profiles={participantProfiles}
                variant="header"
              />
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}
