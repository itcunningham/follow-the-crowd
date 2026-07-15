"use client";

import ProfileAvatar from "@/app/components/ProfileAvatar";
import type { UserAvatarProfile } from "@/lib/user/currentUser";

const MAX_VISIBLE_AVATARS = 4;

export default function CrewChatAvatarStack({
  participantIds,
  profiles,
  variant = "default",
}: {
  participantIds: string[];
  profiles: Map<string, UserAvatarProfile>;
  variant?: "default" | "header";
}) {
  if (participantIds.length === 0) {
    return null;
  }

  const visibleIds = participantIds.slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = participantIds.length - visibleIds.length;
  const isHeader = variant === "header";
  const avatarClassName = isHeader ? "h-6 w-6 text-[8px]" : "h-7 w-7 text-[9px]";
  const overlapClassName = isHeader ? "-space-x-1.5" : "-space-x-2";

  return (
    <div className="flex items-center overflow-visible pl-0.5">
      <div className={`flex items-center overflow-visible ${overlapClassName}`}>
        {visibleIds.map((userId, index) => {
          const profile = profiles.get(userId);
          const label = profile?.display_name?.trim() || "Member";

          return (
            <div
              key={userId}
              className="relative rounded-full ring-2 ring-ftc-bg"
              style={{ zIndex: index + 1 }}
            >
              <ProfileAvatar
                name={label}
                avatarUrl={profile?.avatar_url}
                size="sm"
                className={avatarClassName}
              />
            </div>
          );
        })}
      </div>
      {overflowCount > 0 ? (
        <span className="ml-1.5 text-[10px] font-medium text-ftc-text-muted">
          +{overflowCount}
        </span>
      ) : null}
    </div>
  );
}
