"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getCurrentAuthUser,
  getCurrentUserProfile,
  getPostAuthRedirectPath,
  LOGIN_PATH,
  needsOnboarding,
  needsProfileSetup,
  PROFILE_SETUP_PATH,
  SIGNUP_PATH,
} from "@/lib/user/currentUser";

const AUTH_PATHS = [LOGIN_PATH, SIGNUP_PATH];
const SETUP_PATHS = ["/onboarding", PROFILE_SETUP_PATH];

export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

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

        const profile = await getCurrentUserProfile();

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
          router.replace("/dm");
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
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#070708] text-sm text-zinc-500">
        Loading...
      </div>
    );
  }

  return children;
}
