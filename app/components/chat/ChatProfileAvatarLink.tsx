"use client";

import Link from "next/link";
import ProfileAvatar, { PROFILE_AVATAR_INTERACTIVE_CLASS } from "@/app/components/ProfileAvatar";
import { buildProfileHref } from "@/lib/profileNavigation";

export default function ChatProfileAvatarLink({
  userId,
  name,
  avatarUrl,
  size = "sm",
  className = "",
  returnTo,
}: {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  returnTo?: string | null;
}) {
  return (
    <Link
      href={buildProfileHref(userId, { returnTo })}
      aria-label={`View ${name}'s profile`}
      className={PROFILE_AVATAR_INTERACTIVE_CLASS}
    >
      <ProfileAvatar
        name={name}
        avatarUrl={avatarUrl}
        size={size}
        className={className}
      />
    </Link>
  );
}
