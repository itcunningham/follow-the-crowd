"use client";

import { useEffect, useState } from "react";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import ProfileBioText from "@/app/components/profile/ProfileBioText";
import { formatProfileIdentityUsername } from "@/lib/user/profileFormUtils";
import { type UserRole } from "@/lib/user/currentUser";

export default function ProfileHero({
  displayName,
  username,
  avatarUrl,
  role,
  bio,
}: {
  displayName: string;
  username?: string | null;
  avatarUrl?: string | null;
  role: UserRole | null;
  bio?: string | null;
}) {
  const profileUsername = formatProfileIdentityUsername(username);
  const hasAvatar = Boolean(avatarUrl?.trim());
  const [avatarExpanded, setAvatarExpanded] = useState(false);

  useEffect(() => {
    if (!avatarExpanded) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAvatarExpanded(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [avatarExpanded]);

  return (
    <>
      <div className="flex items-start gap-4">
        {hasAvatar ? (
          <button
            type="button"
            onClick={() => setAvatarExpanded((expanded) => !expanded)}
            aria-label={avatarExpanded ? "Close profile photo" : "View profile photo"}
            aria-expanded={avatarExpanded}
            className="shrink-0 rounded-full transition hover:ring-2 hover:ring-ftc-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ftc-primary"
          >
            <ProfileAvatar
              name={displayName}
              avatarUrl={avatarUrl}
              size="xl"
              className="h-20 w-20 sm:h-24 sm:w-24"
            />
          </button>
        ) : (
          <ProfileAvatar
            name={displayName}
            avatarUrl={avatarUrl}
            size="xl"
            className="h-20 w-20 shrink-0 sm:h-24 sm:w-24"
          />
        )}

        <div className="min-w-0 flex-1 pt-1">
          <h1 className="text-2xl font-bold leading-tight text-ftc-text sm:text-[1.75rem]">
            {profileUsername ?? displayName}
          </h1>

          {profileUsername ? (
            <p className="mt-1 text-sm font-medium text-ftc-text-secondary">{displayName}</p>
          ) : null}

          {bio?.trim() ? <ProfileBioText bio={bio} /> : null}
        </div>
      </div>

      {avatarExpanded && hasAvatar ? (
        <button
          type="button"
          aria-label="Close profile photo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setAvatarExpanded(false)}
        >
          <img
            src={avatarUrl!}
            alt={`${displayName} profile`}
            className="h-72 w-72 max-h-[70vh] max-w-[85vw] rounded-full object-cover shadow-2xl sm:h-80 sm:w-80"
          />
        </button>
      ) : null}
    </>
  );
}
