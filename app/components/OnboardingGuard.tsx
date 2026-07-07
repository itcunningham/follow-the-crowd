"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import FtcBrandMotionLazy from "@/app/components/brand/FtcBrandMotionLazy";
import { AppLoadingShell } from "@/app/components/skeleton/Skeleton";
import {
  ensureAuthenticatedUserProfileRow,
  getCurrentAuthUser,
  getCurrentUserProfile,
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

export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState<UserProfile | null>(null);

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

          setReady(true);
          return;
        }

        if (!authUser) {
          router.replace(LOGIN_PATH);
          return;
        }

        await ensureAuthenticatedUserProfileRow();
        const profile = await getCurrentUserProfile();
        setLoadingProfile(profile);

        if (cancelled) {
          return;
        }

        if (SETUP_PATHS.includes(pathname)) {
          setReady(true);
          return;
        }

        if (needsOnboarding(profile)) {
          router.replace("/onboarding");
          return;
        }

        if (needsProfileSetup(profile)) {
          router.replace(PROFILE_SETUP_PATH);
          return;
        }

        if (profile?.role === "dj" && pathname === "/") {
          router.replace("/discover");
          return;
        }

        setReady(true);
      } catch (error) {
        console.error("Onboarding check failed:", error);

        if (!cancelled) {
          router.replace(LOGIN_PATH);
        }
      }
    }

    setReady(false);
    checkAccess();

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

    return (
      <AppLoadingShell
        pathname={pathname}
        role={loadingProfile?.role}
        search={typeof window !== "undefined" ? window.location.search : ""}
      />
    );
  }

  return children;
}
