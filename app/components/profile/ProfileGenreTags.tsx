"use client";

import { parseGenreTags } from "@/app/components/profile/parseGenreTags";
import ProfileTagChipList from "@/app/components/profile/ProfileTagChipList";

export default function ProfileGenreTags({ genre }: { genre: string | null | undefined }) {
  return <ProfileTagChipList tags={parseGenreTags(genre)} />;
}
