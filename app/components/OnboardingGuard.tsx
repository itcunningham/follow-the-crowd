"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import FtcAppSplashScreen from "@/app/components/brand/FtcAppSplashScreen";
import { GuardProfileProvider } from "@/app/components/GuardProfileContext";
import { NavBadgeProvider } from "@/app/components/navigation/NavBadgeProvider";
import { AppLoadingShell } from "@/app/components/skeleton/Skeleton";
import { ensureGigsPendingPrefetched, ensureNavMessagesPrefetched, ensureNavigationBadgesPrefetched } from "@/lib/navigationBadgePrefetch";
import { cacheNavigationRole, readCachedNavigation } from "@/lib/navigationRoleCache";
import { readSupabaseSessionUserIdSync } from "@/lib/auth/sessionUserId";
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
  readCachedUserProfileSync,
  SIGNUP_PATH,
  type UserProfile,
} from "@/lib/user/currentUser";

const AUTH_PATHS = [LOGIN_PATH, SIGNUP_PATH];
const SETUP_PATHS = ["/onboarding", PROFILE_SETUP_PATH];
const HOME_PATH = "/";

// Same timeout value and Promise.race pattern as withGroupChatsLoadTimeout
// (app/dm/page.tsx). Nothing in the Supabase client's fetch calls has a
// timeout of its own, and a stalled request (most likely on a device's very
// first, cold-DNS/cold-TLS connection to the Supabase domain) never rejects
// on its own — it just never resolves. Without this, checkAccess's own
// try/catch (which only handles rejections) would never fire, `ready` would
// stay false, and the splash screen below would spin forever.
export const ONBOARDING_ACCESS_CHECK_TIMEOUT_MS = 15_000;

/** Exported (only) so a regression test can verify the timeout actually rejects. */
export async function withOnboardingAccessCheckTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = ONBOARDING_ACCESS_CHECK_TIMEOUT_MS,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Checking your session took too long."));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

const cachedNavigationOnLoad = readCachedNavigation();
if (cachedNavigationOnLoad.role) {
  if (cachedNavigationOnLoad.role === "dj" || cachedNavigationOnLoad.role === "both") {
    void ensureGigsPendingPrefetched(cachedNavigationOnLoad.role);
  }

  void ensureNavMessagesPrefetched(
    cachedNavigationOnLoad.userId,
    cachedNavigationOnLoad.role,
  );

  void ensureNavigationBadgesPrefetched(
    cachedNavigationOnLoad.userId,
    cachedNavigationOnLoad.role,
  );
}

function buildOptimisticProfile(): UserProfile | null {
  const cachedProfile = readCachedUserProfileSync();
  if (cachedProfile) {
    return cachedProfile;
  }

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
  if (AUTH_PATHS.includes(pathname) || SETUP_PATHS.includes(pathname) || pathname === HOME_PATH) {
    return false;
  }

  const { role, userId } = readCachedNavigation();

  return role != null && userId != null;
}

function resolveInitialReady(pathname: string, sessionReady: boolean): boolean {
  if (AUTH_PATHS.includes(pathname)) {
    return true;
  }

  if (pathname === HOME_PATH) {
    return false;
  }

  return sessionReady;
}

export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sessionReadyRef = useRef(canOptimisticallyRender(pathname));
  const [ready, setReady] = useState(() =>
    resolveInitialReady(pathname, sessionReadyRef.current),
  );
  const [homeSplashExiting, setHomeSplashExiting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState<UserProfile | null>(buildOptimisticProfile);

  useEffect(() => {
    let cancelled = false;
    const canOptimistic = canOptimisticallyRender(pathname);

    if (canOptimistic) {
      sessionReadyRef.current = true;
      setReady(true);
    } else if (!AUTH_PATHS.includes(pathname) && pathname !== HOME_PATH) {
      sessionReadyRef.current = false;
      setReady(false);
    } else if (pathname === HOME_PATH) {
      sessionReadyRef.current = false;
      setReady(false);
      setHomeSplashExiting(false);
    }

    async function checkAccess() {
      try {
        await withOnboardingAccessCheckTimeout(
          (async () => {
            const syncUserId = readSupabaseSessionUserIdSync();
            const authPromise = getCurrentAuthUser();
            const profilePromise = syncUserId ? getCurrentUserProfile() : Promise.resolve(null);
            const authUser = await authPromise;

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

            let profile = await profilePromise;

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

            if (pathname === HOME_PATH && profile?.role) {
              const defaultRoute = getDefaultRouteForRole(profile.role);

              if (defaultRoute !== HOME_PATH) {
                sessionReadyRef.current = false;
                router.replace(defaultRoute);
                return;
              }
            }

            sessionReadyRef.current = true;
            if (pathname === HOME_PATH) {
              setHomeSplashExiting(true);
              window.setTimeout(() => {
                if (!cancelled) {
                  setReady(true);
                }
              }, 280);
              return;
            }

            setReady(true);
          })(),
        );
      } catch (error) {
        console.error("Onboarding check failed:", error);

        if (!cancelled) {
          sessionReadyRef.current = false;
          router.replace(LOGIN_PATH);
        }
      }
    }

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    if (pathname === HOME_PATH) {
      return <FtcAppSplashScreen exiting={homeSplashExiting} />;
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
      <NavBadgeProvider>
        <div className={pathname === HOME_PATH ? "ftc-app-content-enter" : undefined}>
          {children}
        </div>
      </NavBadgeProvider>
    </GuardProfileProvider>
  );
}
