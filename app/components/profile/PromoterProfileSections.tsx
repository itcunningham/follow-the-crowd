"use client";

import EventBrandsChips from "@/app/components/profile/EventBrandsChips";
import ProfileSectionCard from "@/app/components/profile/ProfileSectionCard";
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
        <EventBrandsChips brands={brands} />
      </ProfileSectionCard>
    </div>
  );
}
