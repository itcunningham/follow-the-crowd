"use client";

import type { MouseEvent } from "react";
import CrewChatAvatarStack from "@/app/components/group-chat/CrewChatAvatarStack";
import ChatBackButton from "@/app/components/chat/ChatBackButton";
import { FtcPeopleIcon } from "@/app/components/ftc/FtcCompactMeta";
import type { UserAvatarProfile } from "@/lib/user/currentUser";

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
  backReplace = false,
  onBackClick,
  eventName,
  memberCount,
  participantIds,
  participantProfiles,
  onOpenMemberSheet,
}: {
  backHref: string;
  backLabel: string;
  backReplace?: boolean;
  onBackClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
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
        <ChatBackButton
          href={backHref}
          label={backLabel}
          replace={backReplace}
          onClick={onBackClick}
        />
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
