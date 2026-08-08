"use client";

import { useState } from "react";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import ProfileBioText from "@/app/components/profile/ProfileBioText";
import ProfilePhotoViewer from "@/app/components/profile/ProfilePhotoViewer";
import {
  formatProfileIdentityUsername,
  formatPublicUsername,
  resolveProfileIdentityPresentation,
} from "@/lib/user/profileFormUtils";

export default function ProfileHero({
  displayName,
  username,
  artistName,
  promoterBrandName,
  avatarUrl,
  bio,
}: {
  displayName: string;
  username?: string | null;
  artistName?: string | null;
  promoterBrandName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
}) {
  const { primary } = resolveProfileIdentityPresentation({
    display_name: displayName,
    username,
    artist_name: artistName,
    promoter_brand_name: promoterBrandName,
  });

  /*
   * Deliberately NOT `secondaryUsername`.
   *
   * resolveProfileIdentityPresentation suppresses the handle when the heading
   * already is the username - correct for a Discover card or a DM row, where
   * the same string twice is just noise. On a profile page it inverts: the
   * accounts that fall back to the username are exactly the sparse ones, so
   * the profiles with the least to show were the ones losing the @handle line
   * as well. Core identity renders the same way for everyone, filled in or
   * not.
   *
   * The resolver is untouched, so every other surface keeps the old
   * de-duplication.
   */
  const normalizedUsername = formatProfileIdentityUsername(username);
  const handle = normalizedUsername ? formatPublicUsername(normalizedUsername) : null;
  const hasAvatar = Boolean(avatarUrl?.trim());
  const [avatarExpanded, setAvatarExpanded] = useState(false);

  return (
    <>
      <div className="flex items-start gap-4">
        {hasAvatar ? (
          <button
            type="button"
            onClick={() => setAvatarExpanded(true)}
            aria-label="View profile photo"
            aria-expanded={avatarExpanded}
            className="ftc-profile-hero-avatar-interactive shrink-0"
          >
            <ProfileAvatar
              name={primary}
              avatarUrl={avatarUrl}
              size="xl"
              className="h-20 w-20 sm:h-24 sm:w-24"
            />
          </button>
        ) : (
          <ProfileAvatar
            name={primary}
            avatarUrl={avatarUrl}
            size="xl"
            className="h-20 w-20 shrink-0 sm:h-24 sm:w-24"
          />
        )}

        <div className="min-w-0 flex-1 pt-1">
          <h1 className="break-words text-2xl font-bold leading-tight text-ftc-text [overflow-wrap:anywhere] sm:text-[1.75rem]">
            {primary}
          </h1>

          {handle ? (
            <p className="mt-1 break-words text-sm font-medium text-ftc-text-secondary [overflow-wrap:anywhere]">
              {handle}
            </p>
          ) : null}

          {bio?.trim() ? <ProfileBioText bio={bio} /> : null}
        </div>
      </div>

      {hasAvatar ? (
        <ProfilePhotoViewer
          open={avatarExpanded}
          onClose={() => setAvatarExpanded(false)}
          imageUrl={avatarUrl!}
          displayName={primary}
        />
      ) : null}
    </>
  );
}
