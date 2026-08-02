"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentAuthUser,
  getCurrentUserProfile,
  getDefaultRouteForRole,
  LOGIN_PATH,
  needsProfileSetup,
  PROFILE_SETUP_PATH,
  saveUserRole,
  type UserRole,
} from "@/lib/user/currentUser";

const ROLE_OPTIONS: {
  role: UserRole;
  title: string;
  description: string;
}[] = [
  {
    role: "dj",
    title: "DJ / Artist",
    description: "Get booked, chat with promoters, and manage your gigs",
  },
  {
    role: "promoter",
    title: "Promoter / Event Planner",
    description: "Create events, book DJs, and manage your event team",
  },
  {
    role: "both",
    title: "DJ & Promoter",
    description: "Book DJs, get booked, and manage everything from one account",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [loadingRole, setLoadingRole] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);

  useEffect(() => {
    async function checkExisting() {
      try {
        const authUser = await getCurrentAuthUser();

        if (!authUser) {
          router.replace(LOGIN_PATH);
          return;
        }

        const profile = await getCurrentUserProfile();

        if (profile?.onboarding_complete && profile.role) {
          if (needsProfileSetup(profile)) {
            router.replace(PROFILE_SETUP_PATH);
            return;
          }

          router.replace(getDefaultRouteForRole(profile.role));
          return;
        }

        setCheckingExisting(false);
      } catch (loadError) {
        console.error("Failed to load user profile:", loadError);
        setCheckingExisting(false);
      }
    }

    checkExisting();
  }, [router]);

  async function handleSelectRole(role: UserRole) {
    setLoadingRole(role);
    setError(null);

    try {
      await saveUserRole(role);
      router.replace(PROFILE_SETUP_PATH);
    } catch (saveError) {
      console.error("Failed to save role:", saveError);

      if (saveError && typeof saveError === "object") {
        console.error("Role save error details:", saveError);
      }

      setError(saveError instanceof Error ? saveError.message : "Failed to save role");
      setLoadingRole(null);
    }
  }

  if (checkingExisting) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-ftc-bg text-sm text-ftc-text-muted">
        Loading
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-ftc-bg px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] font-sans text-ftc-text sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-ftc-text sm:text-4xl">Choose your role</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ftc-text-secondary sm:text-base">
          Select the account that best fits you.
        </p>

        {/* Grid rather than a plain stack so every card is the height of the
            tallest one — the descriptions wrap to different line counts at
            narrow widths, which previously left the three cards uneven. */}
        <div className="mt-8 grid auto-rows-fr gap-4">
          {ROLE_OPTIONS.map((option) => {
            const isLoading = loadingRole === option.role;

            return (
              <button
                key={option.role}
                type="button"
                disabled={loadingRole !== null}
                onClick={() => handleSelectRole(option.role)}
                className="w-full cursor-pointer rounded-2xl border border-ftc-border bg-ftc-surface/80 px-5 py-6 text-left transition hover:border-ftc-border-strong hover:bg-ftc-bg-elevated active:bg-ftc-surface-raised focus-visible:border-ftc-border-strong focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                <p className="text-lg font-semibold text-ftc-text">{option.title}</p>
                <p className="mt-2.5 text-sm leading-relaxed text-ftc-text-secondary">
                  {option.description}
                </p>
                {isLoading ? (
                  <p className="mt-3 text-xs font-medium uppercase tracking-wide text-ftc-primary">
                    Saving
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      </div>
    </div>
  );
}
