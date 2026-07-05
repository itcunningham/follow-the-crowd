"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import {
  DISCOVER_PATH,
  getCurrentAuthUser,
  getCurrentUserId,
  getCurrentUserProfile,
  getDefaultRouteForRole,
  LOGIN_PATH,
  needsOnboarding,
  needsProfileSetup,
  saveUserProfile,
  type UserProfileInput,
  type UserRole,
} from "@/lib/user/currentUser";
import { isAllowedProfileImageType, uploadProfileImage } from "@/lib/user/uploadProfileImage";

const emptyProfile: UserProfileInput = {
  display_name: "",
  bio: "",
  genre: "",
  location: "",
  instagram_url: "",
  soundcloud_url: "",
  dj_availability: "",
  dj_past_gigs: "",
  promoter_venues_used: "",
  promoter_upcoming_events: "",
  promoter_past_events: "",
};

export default function ProfileSetupPage() {
  const router = useRouter();
  const [form, setForm] = useState<UserProfileInput>(emptyProfile);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showDjFields = role === "dj" || role === "both";
  const showPromoterFields = role === "promoter" || role === "both";

  useEffect(() => {
    getCurrentUserProfile()
      .then((profile) => {
        if (needsOnboarding(profile)) {
          router.replace("/onboarding");
          return;
        }

        setIsEditing(Boolean(profile?.display_name?.trim()));
        setExistingAvatarUrl(profile?.avatar_url ?? null);
        setRole(profile?.role ?? null);
        setForm({
          display_name: profile?.display_name ?? "",
          bio: profile?.bio ?? "",
          genre: profile?.genre ?? "",
          location: profile?.location ?? "",
          instagram_url: profile?.instagram_url ?? "",
          soundcloud_url: profile?.soundcloud_url ?? "",
          dj_availability: profile?.dj_availability ?? "",
          dj_past_gigs: profile?.dj_past_gigs ?? "",
          promoter_venues_used: profile?.promoter_venues_used ?? "",
          promoter_upcoming_events: profile?.promoter_upcoming_events ?? "",
          promoter_past_events: profile?.promoter_past_events ?? "",
        });
        setLoading(false);
      })
      .catch((loadError) => {
        console.error("Failed to load profile:", loadError);
        setError(loadError instanceof Error ? loadError.message : "Failed to load profile");
        setLoading(false);
      });
  }, [router]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function updateField<Key extends keyof UserProfileInput>(
    key: Key,
    value: UserProfileInput[Key],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setUploadError(null);

    if (!file) {
      return;
    }

    if (!isAllowedProfileImageType(file.type)) {
      setUploadError("Please choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.display_name.trim()) {
      setError("Display name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setUploadError(null);

    try {
      let avatarUrl = existingAvatarUrl;

      if (selectedFile) {
        try {
          avatarUrl = await uploadProfileImage(selectedFile);
        } catch (imageError) {
          console.error("Profile image upload failed:", imageError);
          setUploadError("Image upload failed");
          setSaving(false);
          return;
        }
      }

      await saveUserProfile(form, { avatarUrl });
      const profile = await getCurrentUserProfile();

      if (needsOnboarding(profile)) {
        console.error("[profile/setup] Profile still needs onboarding after save:", profile);
        setError("Your role did not save correctly. Please choose your role again.");
        setSaving(false);
        router.replace("/onboarding");
        return;
      }

      if (needsProfileSetup(profile)) {
        console.error("[profile/setup] Display name missing after save:", profile);
        setError("Failed to save your profile. Please try again.");
        setSaving(false);
        return;
      }

      const userId = await getCurrentUserId();
      const destination = isEditing
        ? `/profile/${userId}`
        : profile?.role === "dj"
          ? DISCOVER_PATH
          : getDefaultRouteForRole(profile?.role ?? null);
      router.replace(destination);
    } catch (saveError) {
      console.error("Failed to save profile:", saveError);

      if (saveError && typeof saveError === "object") {
        console.error("Profile save error details:", saveError);
      }

      setError(saveError instanceof Error ? saveError.message : "Failed to save profile");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-ftc-bg text-sm text-ftc-text-muted">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-ftc-bg px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] font-sans text-ftc-text sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ftc-primary">
          Profile
        </p>
        <h1 className="mt-3 text-3xl font-bold text-ftc-text sm:text-4xl">
          {isEditing ? "Edit your profile" : "Set up your profile"}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ftc-text-secondary sm:text-base">
          Add a few details so other DJs and promoters can find and message you.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="rounded-2xl border border-ftc-border bg-ftc-surface/40 p-4 sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
              Profile photo
            </p>
            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <ProfileAvatar
                name={form.display_name || "Profile"}
                avatarUrl={previewUrl ?? existingAvatarUrl}
                size="xl"
              />
              <div className="text-center sm:text-left">
                <label className="inline-block cursor-pointer ftc-btn-primary px-4 py-2.5 text-sm uppercase tracking-wide">
                  Choose photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
                <p className="mt-2 text-xs text-ftc-text-muted">JPG, PNG, or WebP</p>
              </div>
            </div>
            {uploadError ? <p className="mt-3 text-sm text-red-400">{uploadError}</p> : null}
          </div>

          <div className="space-y-4">
            <ProfileField
              label="Display name"
              value={form.display_name}
              onChange={(value) => updateField("display_name", value)}
              placeholder="Your scene name"
              required
            />
            <ProfileField
              label="Bio"
              value={form.bio}
              onChange={(value) => updateField("bio", value)}
              placeholder="Tell people what you do in the scene"
              multiline
            />
            <ProfileField
              label={showPromoterFields && !showDjFields ? "Event style / genre" : "Genre"}
              value={form.genre}
              onChange={(value) => updateField("genre", value)}
              placeholder="techno, house, warehouse raves..."
            />
            <ProfileField
              label="Location"
              value={form.location}
              onChange={(value) => updateField("location", value)}
              placeholder="Melbourne"
            />
            <ProfileField
              label="Instagram URL"
              value={form.instagram_url}
              onChange={(value) => updateField("instagram_url", value)}
              placeholder="https://instagram.com/yourhandle"
            />
            {showDjFields ? (
              <ProfileField
                label="SoundCloud URL"
                value={form.soundcloud_url}
                onChange={(value) => updateField("soundcloud_url", value)}
                placeholder="https://soundcloud.com/yourhandle"
              />
            ) : null}
          </div>

          {showDjFields ? (
            <fieldset className="space-y-4 rounded-2xl border border-ftc-border bg-ftc-surface/40 p-4 sm:p-5">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ftc-primary">
                DJ / Artist
              </legend>
              <ProfileField
                label="Availability"
                value={form.dj_availability}
                onChange={(value) => updateField("dj_availability", value)}
                placeholder="Fridays and Saturdays, open for warehouse gigs..."
                multiline
              />
              <ProfileField
                label="Past gigs"
                value={form.dj_past_gigs}
                onChange={(value) => updateField("dj_past_gigs", value)}
                placeholder="Berghain (2024), Boiler Room Melbourne (2023)..."
                multiline
              />
            </fieldset>
          ) : null}

          {showPromoterFields ? (
            <fieldset className="space-y-4 rounded-2xl border border-ftc-border bg-ftc-surface/40 p-4 sm:p-5">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ftc-primary">
                Promoter
              </legend>
              <ProfileField
                label="Venues used"
                value={form.promoter_venues_used}
                onChange={(value) => updateField("promoter_venues_used", value)}
                placeholder="The Warehouse, Revolver Upstairs, Miscellania..."
                multiline
              />
              <ProfileField
                label="Upcoming events"
                value={form.promoter_upcoming_events}
                onChange={(value) => updateField("promoter_upcoming_events", value)}
                placeholder="Synergy x Warehouse — 12 July, Melbourne..."
                multiline
              />
              <ProfileField
                label="Past events"
                value={form.promoter_past_events}
                onChange={(value) => updateField("promoter_past_events", value)}
                placeholder="Midnight Mass — March 2025, Boiler Room pop-up..."
                multiline
              />
            </fieldset>
          ) : null}

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="w-full ftc-btn-primary px-5 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {saving ? "Saving..." : isEditing ? "Save changes" : "Save profile"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={4}
          className="ftc-input px-3.5 py-2.5"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className="ftc-input px-3.5 py-2.5"
        />
      )}
    </label>
  );
}
