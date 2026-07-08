"use client";

import ProfileAvatar from "@/app/components/ProfileAvatar";
import ProfileRoleBadge from "@/app/components/profile/ProfileRoleBadge";
import { formatPublicUsername } from "@/lib/user/profileFormUtils";
import { type UserRole } from "@/lib/user/currentUser";

export default function ProfileHero({
  displayName,
  username,
  avatarUrl,
  role,
  location,
  bio,
}: {
  displayName: string;
  username?: string | null;
  avatarUrl?: string | null;
  role: UserRole | null;
  location?: string | null;
  bio?: string | null;
}) {
  const publicUsername = formatPublicUsername(username);

  return (
    <div className="flex items-start gap-4">
      <ProfileAvatar
        name={displayName}
        avatarUrl={avatarUrl}
        size="xl"
        className="h-20 w-20 shrink-0 sm:h-24 sm:w-24"
      />

      <div className="min-w-0 flex-1 pt-1">
        <h1 className="text-2xl font-bold leading-tight text-ftc-text sm:text-[1.75rem]">
          {displayName}
        </h1>

        {publicUsername ? (
          <p className="mt-1 text-sm font-medium text-ftc-text-secondary">{publicUsername}</p>
        ) : null}

        <div className="mt-3">
          <ProfileRoleBadge role={role} />
        </div>

        {location?.trim() ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-ftc-text-secondary">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0 text-ftc-text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <path d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10Z" />
              <circle cx="12" cy="11" r="2.5" />
            </svg>
            <span className="truncate">{location.trim()}</span>
          </p>
        ) : null}

        {bio?.trim() ? (
          <p className="mt-4 text-sm leading-relaxed text-ftc-text-secondary">{bio.trim()}</p>
        ) : null}
      </div>
    </div>
  );
}
