"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import {
  getCurrentUserProfile,
  getDiscoverRetiredRedirectPath,
  LOGIN_PATH,
} from "@/lib/user/currentUser";

export default function DiscoverPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function redirectFromDiscover() {
      try {
        const profile = await getCurrentUserProfile();

        if (cancelled) {
          return;
        }

        router.replace(getDiscoverRetiredRedirectPath(profile?.role ?? null));
      } catch (error) {
        console.error("Failed to redirect retired Discover route:", error);

        if (!cancelled) {
          router.replace(LOGIN_PATH);
        }
      }
    }

    void redirectFromDiscover();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <OnboardingGuard>
      <div className="min-h-[100dvh] bg-ftc-bg" aria-hidden="true" />
    </OnboardingGuard>
  );
}
