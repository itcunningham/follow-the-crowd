"use client";

import ProfileSectionCard from "@/app/components/profile/ProfileSectionCard";
import ProfileTagChipList from "@/app/components/profile/ProfileTagChipList";
import type { UserProfile } from "@/lib/user/currentUser";
import { parseStoredEventBrands } from "@/lib/user/profileFormUtils";

export default function PromoterProfileSections({ profile }: { profile: UserProfile }) {
  const brands = parseStoredEventBrands(profile.promoter_brand_name);

  if (brands.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <ProfileSectionCard title="Event brands">
        <ProfileTagChipList tags={brands} />
      </ProfileSectionCard>
    </div>
  );
}
