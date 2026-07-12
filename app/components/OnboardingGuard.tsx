"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import FtcBrandMotionLazy from "@/app/components/brand/FtcBrandMotionLazy";
import { GuardProfileProvider } from "@/app/components/GuardProfileContext";
import { NavBadgeProvider } from "@/app/components/navigation/NavBadgeProvider";
import { AppLoadingShell } from "@/app/components/skeleton/Skeleton";
import { ensureGigsPendingPrefetched, ensureNavigationBadgesPrefetched } from "@/lib/navigationBadgePrefetch";
import { cacheNavigationRole, readCachedNavigation } from "@/lib/navigationRoleCache";
import {
  ensureAuthenticatedUserProfileRow,
  getCurrentAuthUser,
  getCurrentUserProfile,
  getDefaultRouteForRole,
  getPostAuthRedirectPath,
  LOGIN_PATH,
  needsOnboarding,
  needsProfileSetup,
  PROFILE_SETUP_PATH,
  SIGNUP_PATH,
  type UserProfile,
} from "@/lib/user/currentUser";

const AUTH_PATHS = [LOGIN_PATH, SIGNUP_PATH];
const SETUP_PATHS = ["/onboarding", PROFILE_SETUP_PATH];

const cachedNavigationOnLoad = readCachedNavigation();
if (cachedNavigationOnLoad.role) {
  if (cachedNavigationOnLoad.role === "dj" || cachedNavigationOnLoad.role === "both") {
    void ensureGigsPendingPrefetched(cachedNavigationOnLoad.role);
  }

  void ensureNavigationBadgesPrefetched(
    cachedNavigationOnLoad.userId,
    cachedNavigationOnLoad.role,
  );
}

function buildOptimisticProfile(): UserProfile | null {
  const { role, userId } = readCachedNavigation();

  if (!role || !userId) {
    return null;
  }

  return {
    user_id: userId,
    role,
    onboarding_complete: true,
    full_name: null,
    username: null,
    display_name: null,
    bio: null,
    genre: null,
    instagram_url: null,
    tiktok_url: null,
    soundcloud_url: null,
    website_url: null,
    location: null,
    avatar_url: null,
    artist_name: null,
    dj_booking_contact_name: null,
    dj_availability: null,
    dj_past_gigs: null,
    promoter_brand_name: null,
    promoter_brand_description: null,
    promoter_venues_used: null,
    promoter_upcoming_events: null,
    promoter_past_events: null,
  };
}

function canOptimisticallyRender(pathname: string): boolean {
  if (AUTH_PATHS.includes(pathname) || SETUP_PATHS.includes(pathname)) {
    return false;
  }

  return readCachedNavigation().role != null;
}

export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sessionReadyRef = useRef(canOptimisticallyRender(pathname));
  const [ready, setReady] = useState(
    () => AUTH_PATHS.includes(pathname) || sessionReadyRef.current,
  );
  const [loadingProfile, setLoadingProfile] = useState<UserProfile | null>(buildOptimisticProfile);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      try {
        const authUser = await getCurrentAuthUser();

        if (cancelled) {
          return;
        }

        if (AUTH_PATHS.includes(pathname)) {
          if (authUser) {
            router.replace(await getPostAuthRedirectPath());
            return;
          }

          sessionReadyRef.current = false;
          setReady(true);
          return;
        }

        if (!authUser) {
          sessionReadyRef.current = false;
          router.replace(LOGIN_PATH);
          return;
        }

        let profile = await getCurrentUserProfile();

        if (!profile) {
          await ensureAuthenticatedUserProfileRow();
          profile = await getCurrentUserProfile({ force: true });
        }

        if (cancelled) {
          return;
        }

        setLoadingProfile(profile);

        if (profile?.role) {
          cacheNavigationRole(profile.role, profile.user_id ?? null);
        }

        if (SETUP_PATHS.includes(pathname)) {
          sessionReadyRef.current = true;
          setReady(true);
          return;
        }

        if (needsOnboarding(profile)) {
          sessionReadyRef.current = false;
          router.replace("/onboarding");
          return;
        }

        if (needsProfileSetup(profile)) {
          sessionReadyRef.current = false;
          router.replace(PROFILE_SETUP_PATH);
          return;
        }

        if (pathname === "/" && profile?.role) {
          const defaultRoute = getDefaultRouteForRole(profile.role);

          if (defaultRoute !== "/") {
            sessionReadyRef.current = false;
            router.replace(defaultRoute);
            return;
          }
        }

        sessionReadyRef.current = true;
        setReady(true);
      } catch (error) {
        console.error("Onboarding check failed:", error);

        if (!cancelled) {
          sessionReadyRef.current = false;
          router.replace(LOGIN_PATH);
        }
      }
    }

    if (!sessionReadyRef.current) {
      setReady(false);
    }

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    if (pathname === "/") {
      return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-ftc-bg">
          <FtcBrandMotionLazy variant="splash" />
        </div>
      );
    }

    const cached = readCachedNavigation();

    return (
      <GuardProfileProvider profile={loadingProfile}>
        <NavBadgeProvider>
          <AppLoadingShell
            pathname={pathname}
            role={loadingProfile?.role ?? cached.role}
            currentUserId={loadingProfile?.user_id ?? cached.userId}
            search={typeof window !== "undefined" ? window.location.search : ""}
          />
        </NavBadgeProvider>
      </GuardProfileProvider>
    );
  }

  return (
    <GuardProfileProvider profile={loadingProfile}>
      <NavBadgeProvider>{children}</NavBadgeProvider>
    </GuardProfileProvider>
  );
}
