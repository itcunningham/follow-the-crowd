"use client";

import ProfileAvatar from "@/app/components/ProfileAvatar";
import type { UserAvatarProfile } from "@/lib/user/currentUser";

const MAX_VISIBLE_AVATARS = 4;

export default function CrewChatAvatarStack({
  participantIds,
  profiles,
}: {
  participantIds: string[];
  profiles: Map<string, UserAvatarProfile>;
}) {
  if (participantIds.length === 0) {
    return null;
  }

  const visibleIds = participantIds.slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = participantIds.length - visibleIds.length;

  return (
    <div className="flex items-center">
      <div className="flex items-center -space-x-2">
        {visibleIds.map((userId) => {
          const profile = profiles.get(userId);
          const label = profile?.display_name?.trim() || "Member";

          return (
            <div
              key={userId}
              className="rounded-full ring-2 ring-ftc-bg"
            >
              <ProfileAvatar
                name={label}
                avatarUrl={profile?.avatar_url}
                size="sm"
                className="h-7 w-7 text-[9px]"
              />
            </div>
          );
        })}
      </div>
      {overflowCount > 0 ? (
        <span className="ml-2 text-[11px] font-semibold text-ftc-text-muted">
          +{overflowCount}
        </span>
      ) : null}
    </div>
  );
}
