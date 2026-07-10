"use client";

import Link from "next/link";
import ProfileAvatar from "@/app/components/ProfileAvatar";

export default function ChatProfileAvatarLink({
  userId,
  name,
  avatarUrl,
  size = "sm",
  className = "",
}: {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  return (
    <Link
      href={`/profile/${userId}`}
      aria-label={`View ${name}'s profile`}
      className="shrink-0 rounded-full transition hover:ring-2 hover:ring-ftc-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ftc-primary"
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
