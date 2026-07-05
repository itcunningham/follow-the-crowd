"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import DjProfileSections from "@/app/components/profile/DjProfileSections";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import ProfileHero from "@/app/components/profile/ProfileHero";
import ProfileMessageAction from "@/app/components/profile/ProfileMessageAction";
import ProfilePageHeader from "@/app/components/profile/ProfilePageHeader";
import PromoterProfileSections from "@/app/components/profile/PromoterProfileSections";
import { startDm } from "@/lib/startDm";
import {
  getCurrentUserId,
  getUserProfileById,
  type UserProfile,
} from "@/lib/user/currentUser";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messaging, setMessaging] = useState(false);

  useEffect(() => {
    if (!userId) {
      return;
    }

    async function loadProfile() {
      setLoading(true);
      setError(null);

      try {
        const [userProfile, authUserId] = await Promise.all([
          getUserProfileById(userId),
          getCurrentUserId(),
        ]);
        setCurrentUserId(authUserId);

        if (!userProfile?.display_name?.trim()) {
          setProfile(null);
          setError("Profile not found.");
          setLoading(false);
          return;
        }

        setProfile(userProfile);
      } catch (loadError) {
        console.error("Failed to load profile:", loadError);
        setError(loadError instanceof Error ? loadError.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [userId]);

  async function handleMessage() {
    if (!profile) {
      return;
    }

    setMessaging(true);
    setError(null);

    try {
      const authUserId = await getCurrentUserId();
      const conversationId = await startDm(authUserId, profile.user_id);
      router.push(`/dm/${conversationId}`);
    } catch (messageError) {
      console.error("startDm failed from profile page:", messageError);
      setError(messageError instanceof Error ? messageError.message : "Failed to start message");
      setMessaging(false);
    }
  }

  const displayName = profile?.display_name ?? "Profile";
  const isOwnProfile = profile?.user_id === currentUserId;
  const showDjSections = profile?.role === "dj" || profile?.role === "both";
  const showPromoterSections = profile?.role === "promoter" || profile?.role === "both";
  const showBothHeadings = profile?.role === "both";

  function getMessageButtonLabel(): string {
    if (profile?.role === "dj") {
      return messaging ? "Opening..." : "Message / Book DJ";
    }

    if (profile?.role === "promoter") {
      return messaging ? "Opening..." : "Message Promoter";
    }

    return messaging ? "Opening..." : "Message";
  }

  return (
    <OnboardingGuard>
      <div
        className={`mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
      >
        <AppNavigation />
        <ProfilePageHeader isOwnProfile={isOwnProfile} />

        <div
          className={`flex-1 px-4 py-6 sm:px-6 ${!isOwnProfile && profile ? "pb-4" : "pb-8"}`}
        >
          {loading ? (
            <p className="text-sm text-ftc-text-muted">Loading profile...</p>
          ) : error && !profile ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : profile ? (
            <div className="mx-auto max-w-lg space-y-6">
              <ProfileHero
                displayName={displayName}
                avatarUrl={profile.avatar_url}
                role={profile.role}
                location={profile.location}
              />

              {showDjSections ? (
                <DjProfileSections
                  profile={profile}
                  isOwnProfile={isOwnProfile}
                  showHeading={showBothHeadings}
                />
              ) : null}

              {showPromoterSections ? (
                <PromoterProfileSections profile={profile} showHeading={showBothHeadings} />
              ) : null}

              {error ? <p className="text-sm text-red-400">{error}</p> : null}
            </div>
          ) : null}
        </div>

        {!isOwnProfile && profile ? (
          <ProfileMessageAction
            label={getMessageButtonLabel()}
            disabled={messaging}
            onClick={handleMessage}
          />
        ) : null}
      </div>
    </OnboardingGuard>
  );
}
