"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  APP_PAGE_PROFILE_CONTENT_CLASS,
  APP_PAGE_PROFILE_IDENTITY_STACK_CLASS,
  APP_PAGE_PROFILE_SECTIONS_STACK_CLASS,
  APP_PAGE_PROFILE_STACK_CLASS,
  AppPageBody,
  AppProfilePageShell,
} from "@/app/components/layout/AppPageLayout";
import DjProfileSections from "@/app/components/profile/DjProfileSections";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import { useGuardProfile } from "@/app/components/GuardProfileContext";
import { ProfileSkeleton } from "@/app/components/skeleton/Skeleton";
import ProfileHero from "@/app/components/profile/ProfileHero";
import ProfileLinkList from "@/app/components/profile/ProfileLinkList";
import ProfileMessageAction from "@/app/components/profile/ProfileMessageAction";
import ProfilePageHeader from "@/app/components/profile/ProfilePageHeader";
import PromoterProfileSections from "@/app/components/profile/PromoterProfileSections";
import {
  readCachedNavigation,
  resolveIsOwnProfilePath,
} from "@/lib/navigationRoleCache";
import {
  buildProfileDmThreadHref,
  isProfileOpenedFromCrewChat,
  isProfileOpenedFromDmConversation,
  readProfileEventDetailContext,
  resolveProfileChatBackNavigation,
  resolveProfileEventDetailBackNavigation,
} from "@/lib/profileNavigation";
import {
  getCurrentUserId,
  getUserProfileById,
  type UserProfile,
} from "@/lib/user/currentUser";
import { startDm } from "@/lib/startDm";

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;

  return (
    <OnboardingGuard>
      <UserProfilePageView userId={userId} />
    </OnboardingGuard>
  );
}

function UserProfilePageView({ userId }: { userId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const guardProfile = useGuardProfile();
  const [cachedNavigation] = useState(readCachedNavigation);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    () => guardProfile?.user_id ?? cachedNavigation.userId,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messaging, setMessaging] = useState(false);

  useEffect(() => {
    if (guardProfile?.user_id) {
      setCurrentUserId(guardProfile.user_id);
    }
  }, [guardProfile?.user_id]);

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
          setError("Profile not found");
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
      const eventDetailContext = readProfileEventDetailContext((key) => searchParams.get(key));
      router.push(buildProfileDmThreadHref(conversationId, profile.user_id, eventDetailContext));
    } catch (messageError) {
      console.error("startDm failed from profile page:", messageError);
      setError(messageError instanceof Error ? messageError.message : "Failed to start message");
      setMessaging(false);
    }
  }

  const displayName = profile?.display_name ?? "Profile";
  const resolvedCurrentUserId =
    currentUserId ?? guardProfile?.user_id ?? cachedNavigation.userId;
  const isOwnProfile = resolveIsOwnProfilePath(userId, resolvedCurrentUserId);
  const profileBackNavigation = useMemo(() => {
    const from = searchParams.get("from");

    return (
      resolveProfileEventDetailBackNavigation(from, {
        eventId: searchParams.get("eventId"),
        fromTab: searchParams.get("fromTab"),
        calendarDate: searchParams.get("calendarDate"),
        calendarView: searchParams.get("calendarView"),
        calendarMonth: searchParams.get("calendarMonth"),
      }) ??
      resolveProfileChatBackNavigation(from, searchParams.get("returnTo"))
    );
  }, [searchParams]);
  const openedFromEventDetail = searchParams.get("from") === "event-detail";
  const openedFromDmConversation = useMemo(
    () =>
      isProfileOpenedFromDmConversation(
        searchParams.get("from"),
        searchParams.get("returnTo"),
      ),
    [searchParams],
  );
  const openedFromCrewChat = useMemo(
    () =>
      isProfileOpenedFromCrewChat(
        searchParams.get("from"),
        searchParams.get("returnTo"),
      ),
    [searchParams],
  );
  const showMessageAction = !isOwnProfile && profile && !openedFromDmConversation;
  const showDjSections = profile?.role === "dj" || profile?.role === "both";
  const showPromoterSections = profile?.role === "promoter" || profile?.role === "both";
  function getMessageButtonLabel(): string {
    if (messaging) {
      return "Opening";
    }

    // Already on this event's crew — don't offer "Book".
    if (openedFromCrewChat) {
      return "Message";
    }

    if (openedFromEventDetail && showDjSections) {
      return "Message";
    }

    if (profile?.role === "dj") {
      return "Message / Book DJ";
    }

    if (profile?.role === "promoter") {
      return "Message Promoter";
    }

    return "Message";
  }

  return (
    <AppProfilePageShell>
      <ProfilePageHeader
        isOwnProfile={isOwnProfile}
        backHref={profileBackNavigation?.href}
        backLabel={profileBackNavigation?.label}
      />

      <AppPageBody className={`py-6 md:py-8 ${showMessageAction ? "pb-4" : "pb-8"}`}>
        {loading ? (
          <ProfileSkeleton />
        ) : error && !profile ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : profile ? (
          <div className={APP_PAGE_PROFILE_CONTENT_CLASS}>
            <div className={APP_PAGE_PROFILE_STACK_CLASS}>
              <div className={APP_PAGE_PROFILE_IDENTITY_STACK_CLASS}>
                <ProfileHero
                  displayName={displayName}
                  username={profile.username}
                  artistName={profile.artist_name}
                  promoterBrandName={profile.promoter_brand_name}
                  avatarUrl={profile.avatar_url}
                  bio={profile.bio}
                />

                {profile.instagram_url?.trim() ||
                profile.tiktok_url?.trim() ||
                profile.soundcloud_url?.trim() ? (
                  <ProfileLinkList
                    instagramUrl={profile.instagram_url}
                    tiktokUrl={profile.tiktok_url}
                    soundcloudUrl={showDjSections ? profile.soundcloud_url : null}
                  />
                ) : null}
              </div>

              {showPromoterSections || showDjSections ? (
                <div className={APP_PAGE_PROFILE_SECTIONS_STACK_CLASS}>
                  {showPromoterSections ? (
                    <PromoterProfileSections profile={profile} />
                  ) : null}

                  {showDjSections ? (
                    <DjProfileSections profile={profile} />
                  ) : null}
                </div>
              ) : null}

              {error ? <p className="text-sm text-red-400">{error}</p> : null}
            </div>
          </div>
        ) : null}
      </AppPageBody>

      {showMessageAction ? (
        <ProfileMessageAction
          label={getMessageButtonLabel()}
          disabled={messaging}
          onClick={handleMessage}
        />
      ) : null}
    </AppProfilePageShell>
  );
}
