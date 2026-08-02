"use client";

import ChatBackButton from "@/app/components/chat/ChatBackButton";
import ChatProfileAvatarLink from "@/app/components/chat/ChatProfileAvatarLink";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import { SkeletonBlock } from "@/app/components/skeleton/Skeleton";

export default function DmConversationHeader({
  backHref,
  backLabel = "Back to inbox",
  backReplace = false,
  loading = false,
  conversationTitle,
  avatarName,
  avatarUrl,
  otherUserId,
  profileReturnTo,
}: {
  backHref: string;
  backLabel?: string;
  backReplace?: boolean;
  loading?: boolean;
  conversationTitle: string;
  avatarName: string;
  avatarUrl?: string | null;
  otherUserId: string | null;
  profileReturnTo?: string | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <ChatBackButton href={backHref} label={backLabel} replace={backReplace} />

      <div className="flex min-w-0 flex-1 items-center gap-3">
        {loading ? (
          <SkeletonBlock className="h-9 w-9 shrink-0 rounded-full" />
        ) : otherUserId ? (
          <ChatProfileAvatarLink
            userId={otherUserId}
            name={avatarName}
            avatarUrl={avatarUrl}
            size="md"
            className="h-9 w-9 text-xs"
            returnTo={profileReturnTo}
          />
        ) : (
          <ProfileAvatar
            name={avatarName}
            avatarUrl={avatarUrl}
            size="md"
            className="h-9 w-9 text-xs"
          />
        )}
        <div className="min-w-0 flex-1">
          {loading ? (
            <SkeletonBlock className="h-4 w-32 max-w-[40vw]" />
          ) : (
            <h1 className="truncate text-base font-semibold text-ftc-text">{conversationTitle}</h1>
          )}
        </div>
      </div>
    </div>
  );
}
