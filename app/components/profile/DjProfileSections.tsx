"use client";

import Link from "next/link";
import ProfileGenreTags from "@/app/components/profile/ProfileGenreTags";
import ProfileSectionCard from "@/app/components/profile/ProfileSectionCard";
import { parseGenreTags } from "@/app/components/profile/parseGenreTags";
import type { UserProfile } from "@/lib/user/currentUser";

export default function DjProfileSections({
  profile,
  isOwnProfile,
}: {
  profile: UserProfile;
  isOwnProfile: boolean;
}) {
  const genreTags = parseGenreTags(profile.genre);

  const hasContent = genreTags.length > 0 || isOwnProfile;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="space-y-4">
      {genreTags.length > 0 ? (
        <ProfileSectionCard title="Genres">
          <ProfileGenreTags genre={profile.genre} />
        </ProfileSectionCard>
      ) : null}

      {isOwnProfile ? (
        <ProfileSectionCard title="Calendar">
          <p className="text-sm leading-relaxed text-ftc-text-secondary">
            Manage availability and bookings in{" "}
            <Link
              href="/bookings"
              className="font-semibold text-ftc-primary transition hover:text-ftc-primary-dim"
            >
              Gigs
            </Link>
            .
          </p>
        </ProfileSectionCard>
      ) : null}
    </div>
  );
}
