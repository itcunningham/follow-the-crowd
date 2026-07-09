"use client";

import ProfileSectionCard from "@/app/components/profile/ProfileSectionCard";
import ProfileTextBlock from "@/app/components/profile/ProfileTextBlock";
import type { UserProfile } from "@/lib/user/currentUser";

export default function PromoterProfileSections({
  profile,
  showHeading,
}: {
  profile: UserProfile;
  showHeading: boolean;
}) {
  const brandName = profile.promoter_brand_name?.trim();

  if (!brandName) {
    return null;
  }

  return (
    <div className="space-y-4">
      {showHeading ? (
        <h2 className="text-sm font-semibold text-ftc-text">Promoter</h2>
      ) : null}

      <ProfileSectionCard title="Event brand">
        <ProfileTextBlock text={brandName} />
      </ProfileSectionCard>
    </div>
  );
}
