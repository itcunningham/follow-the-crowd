"use client";

import ProfileGenreTags from "@/app/components/profile/ProfileGenreTags";
import ProfileLinkList from "@/app/components/profile/ProfileLinkList";
import ProfileSectionCard from "@/app/components/profile/ProfileSectionCard";
import ProfileTextBlock from "@/app/components/profile/ProfileTextBlock";
import { parseGenreTags } from "@/app/components/profile/parseGenreTags";
import type { UserProfile } from "@/lib/user/currentUser";

export default function PromoterProfileSections({
  profile,
  showHeading,
}: {
  profile: UserProfile;
  showHeading: boolean;
}) {
  const bio = profile.bio?.trim();
  const venues = profile.promoter_venues_used?.trim();
  const upcoming = profile.promoter_upcoming_events?.trim();
  const past = profile.promoter_past_events?.trim();
  const genreTags = parseGenreTags(profile.genre);
  const hasLinks = Boolean(profile.instagram_url?.trim());

  const hasContent =
    genreTags.length > 0 || bio || hasLinks || venues || upcoming || past;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="space-y-4">
      {showHeading ? (
        <h2 className="text-sm font-semibold text-ftc-text">Promoter</h2>
      ) : null}

      {genreTags.length > 0 ? (
        <ProfileSectionCard title="Event Style">
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
          <ProfileLinkList instagramUrl={profile.instagram_url} />
        </ProfileSectionCard>
      ) : null}

      {venues ? (
        <ProfileSectionCard title="Venues">
          <ProfileTextBlock text={venues} />
        </ProfileSectionCard>
      ) : null}

      {upcoming ? (
        <ProfileSectionCard title="Upcoming Events">
          <ProfileTextBlock text={upcoming} />
        </ProfileSectionCard>
      ) : null}

      {past ? (
        <ProfileSectionCard title="Past Events">
          <ProfileTextBlock text={past} />
        </ProfileSectionCard>
      ) : null}
    </div>
  );
}
