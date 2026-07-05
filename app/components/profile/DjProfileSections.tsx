"use client";

import Link from "next/link";
import ProfileGenreTags from "@/app/components/profile/ProfileGenreTags";
import ProfileLinkList from "@/app/components/profile/ProfileLinkList";
import ProfileSectionCard from "@/app/components/profile/ProfileSectionCard";
import ProfileTextBlock from "@/app/components/profile/ProfileTextBlock";
import { parseGenreTags } from "@/app/components/profile/parseGenreTags";
import type { UserProfile } from "@/lib/user/currentUser";

export default function DjProfileSections({
  profile,
  isOwnProfile,
  showHeading,
}: {
  profile: UserProfile;
  isOwnProfile: boolean;
  showHeading: boolean;
}) {
  const bio = profile.bio?.trim();
  const availability = profile.dj_availability?.trim();
  const pastGigs = profile.dj_past_gigs?.trim();
  const genreTags = parseGenreTags(profile.genre);
  const hasLinks = Boolean(profile.instagram_url?.trim() || profile.soundcloud_url?.trim());

  const hasContent =
    genreTags.length > 0 || bio || hasLinks || availability || pastGigs || isOwnProfile;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="space-y-4">
      {showHeading ? (
        <h2 className="text-sm font-semibold text-ftc-text">DJ / Artist</h2>
      ) : null}

      {genreTags.length > 0 ? (
        <ProfileSectionCard title="Genres">
          <ProfileGenreTags genre={profile.genre} />
        </ProfileSectionCard>
      ) : null}

      {bio ? (
        <ProfileSectionCard title="Bio">
          <ProfileTextBlock text={bio} />
        </ProfileSectionCard>
      ) : null}

      {hasLinks ? (
        <ProfileSectionCard title="Links">
          <ProfileLinkList
            instagramUrl={profile.instagram_url}
            soundcloudUrl={profile.soundcloud_url}
          />
        </ProfileSectionCard>
      ) : null}

      {availability ? (
        <ProfileSectionCard title="Availability">
          <ProfileTextBlock text={availability} />
        </ProfileSectionCard>
      ) : null}

      {pastGigs ? (
        <ProfileSectionCard title="Past Gigs">
          <ProfileTextBlock text={pastGigs} />
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
