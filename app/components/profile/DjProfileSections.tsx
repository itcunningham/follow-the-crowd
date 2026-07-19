"use client";

import ProfileGenreTags from "@/app/components/profile/ProfileGenreTags";
import ProfileSectionCard from "@/app/components/profile/ProfileSectionCard";
import { parseGenreTags } from "@/app/components/profile/parseGenreTags";
import type { UserProfile } from "@/lib/user/currentUser";

export default function DjProfileSections({ profile }: { profile: UserProfile }) {
  const genreTags = parseGenreTags(profile.genre);

  if (genreTags.length === 0) {
    return null;
  }

  return (
    <ProfileSectionCard title="Genres">
      <ProfileGenreTags genre={profile.genre} />
    </ProfileSectionCard>
  );
}
