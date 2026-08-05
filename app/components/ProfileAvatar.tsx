"use client";

import { useEffect, useState } from "react";
import { looksLikeUserId, resolveUserDisplayName } from "@/lib/user/displayName";
import {
  AVATAR_RENDER_WIDTHS,
  coerceAvatarSourceUrl,
  resolveAvatarImageUrl,
  resolveAvatarObjectUrl,
} from "@/lib/user/avatarImageUrl";

export const PROFILE_AVATAR_INTERACTIVE_CLASS = "ftc-profile-avatar-interactive shrink-0 rounded-full transition";

type ProfileAvatarSize = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<ProfileAvatarSize, string> = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-12 w-12 text-xs",
  lg: "h-14 w-14 text-sm",
  xl: "h-28 w-28 text-2xl",
};

function getSafeDisplayName(name: string) {
  if (looksLikeUserId(name)) {
    return "Deleted user";
  }

  return resolveUserDisplayName({ display_name: name });
}

function getInitials(name: string) {
  return getSafeDisplayName(name).trim().slice(0, 2).toUpperCase() || "??";
}

export default function ProfileAvatar({
  name,
  avatarUrl,
  size = "md",
  className = "",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: ProfileAvatarSize;
  className?: string;
}) {
  const safeName = getSafeDisplayName(name);
  const initials = getInitials(name);
  const baseClasses = `ftc-avatar flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold uppercase tracking-wide ${sizeClasses[size]} ${className}`;

  const sourceUrl = coerceAvatarSourceUrl(avatarUrl);
  const transformedUrl = resolveAvatarImageUrl(avatarUrl, size);
  const objectUrl = resolveAvatarObjectUrl(avatarUrl) ?? sourceUrl;

  // 0 = try transform (or external URL), 1 = try original object, 2 = initials.
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    setLoadAttempt(0);
  }, [sourceUrl, size]);

  const imgSrc =
    loadAttempt === 0
      ? transformedUrl
      : loadAttempt === 1
        ? objectUrl && objectUrl !== transformedUrl
          ? objectUrl
          : null
        : null;

  if (imgSrc) {
    return (
      <div className={baseClasses}>
        <img
          key={imgSrc}
          src={imgSrc}
          alt={`${safeName} profile`}
          // Explicit box: the container already constrains it, but a decoded
          // size means the browser never has to guess, and the attributes give
          // the element a real box before the bytes land.
          width={AVATAR_RENDER_WIDTHS[size]}
          height={AVATAR_RENDER_WIDTHS[size]}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => {
            setLoadAttempt((current) => Math.min(current + 1, 2));
          }}
        />
      </div>
    );
  }

  return <div className={baseClasses}>{initials}</div>;
}
