"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EditProfileForm from "@/app/components/profile/EditProfileForm";
import EditProfileSetupHeader from "@/app/components/profile/EditProfileSetupHeader";
import {
  getCurrentUserId,
  getCurrentUserProfile,
  getDefaultRouteForRole,
  needsOnboarding,
  needsProfileSetup,
  type UserProfile,
  type UserRole,
} from "@/lib/user/currentUser";

function getProfileSetupBackHref(
  isEditing: boolean,
  userId: string | null,
  role: UserRole | null,
): string {
  if (isEditing && userId) {
    return `/profile/${userId}`;
  }

  return getDefaultRouteForRole(role);
}

function getProfileSetupBackLabel(isEditing: boolean, role: UserRole | null): string {
  if (isEditing) {
    return "Back to profile";
  }

  return role === "dj" ? "Back to Messages" : "Back to Home";
}

export default function ProfileSetupPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleDirtyChange = useCallback((dirty: boolean) => {
    setHasUnsavedChanges(dirty);
  }, []);

  useEffect(() => {
    Promise.all([getCurrentUserProfile(), getCurrentUserId()])
      .then(([loadedProfile, loadedUserId]) => {
        if (needsOnboarding(loadedProfile)) {
          router.replace("/onboarding");
          return;
        }

        if (!loadedProfile?.role) {
          router.replace("/onboarding");
          return;
        }

        setUserId(loadedUserId);
        setIsEditing(Boolean(loadedProfile.display_name?.trim()));
        setProfile(loadedProfile);
        setLoading(false);
      })
      .catch((loadError) => {
        console.error("Failed to load profile:", loadError);
        setError(loadError instanceof Error ? loadError.message : "Failed to load profile");
        setLoading(false);
      });
  }, [router]);

  async function handleSaved() {
    const updatedProfile = await getCurrentUserProfile();

    if (needsOnboarding(updatedProfile)) {
      setError("Your role did not save correctly. Please choose your role again.");
      router.replace("/onboarding");
      return;
    }

    if (needsProfileSetup(updatedProfile)) {
      setError("Failed to save your profile. Please try again.");
      return;
    }

    const savedUserId = await getCurrentUserId();
    const destination = isEditing
      ? `/profile/${savedUserId}`
      : getDefaultRouteForRole(updatedProfile?.role ?? null);
    router.replace(destination);
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-ftc-bg text-sm text-ftc-text-muted">
        Loading...
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-ftc-bg px-4 text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const backHref = getProfileSetupBackHref(isEditing, userId, profile.role);
  const backLabel = getProfileSetupBackLabel(isEditing, profile.role);

  return (
    <div className="min-h-[100dvh] bg-ftc-bg px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] font-sans text-ftc-text sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <EditProfileSetupHeader
          backHref={backHref}
          backLabel={backLabel}
          hasUnsavedChanges={hasUnsavedChanges}
        />

        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ftc-primary">
          Profile
        </p>
        <h1 className="mt-3 text-3xl font-bold text-ftc-text sm:text-4xl">
          {isEditing ? "Edit profile" : "Set up your profile"}
        </h1>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        <EditProfileForm
          profile={profile}
          isEditing={isEditing}
          onSaved={handleSaved}
          onDirtyChange={handleDirtyChange}
        />
      </div>
    </div>
  );
}
