"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import {
  getCurrentUserId,
  isUsernameAvailable,
  saveUserProfile,
  saveUserRole,
  type UserProfile,
  type UserProfileInput,
  type UserRole,
} from "@/lib/user/currentUser";
import {
  formatPublicUsername,
  isValidUsername,
  MAX_PROFILE_GENRE_TAGS,
  normalizeExternalUrl,
  normalizeInstagramInput,
  normalizeTikTokInput,
  normalizeUsername,
  parseStoredGenreTags,
  PROFILE_GENRE_OPTIONS,
  serializeGenreTags,
  suggestUsernameFromDisplayName,
} from "@/lib/user/profileFormUtils";
import { isAllowedProfileImageType, uploadProfileImage } from "@/lib/user/uploadProfileImage";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "dj", label: "DJ / Artist" },
  { value: "promoter", label: "Event Planner" },
  { value: "both", label: "Both" },
];

function profileToFormInput(profile: UserProfile): UserProfileInput {
  const displayName = profile.display_name?.trim() ?? "";

  return {
    username: profile.username?.trim() ?? suggestUsernameFromDisplayName(displayName),
    display_name: displayName,
    bio: profile.bio?.trim() ?? "",
    genre: profile.genre?.trim() ?? "",
    location: profile.location?.trim() ?? "",
    instagram_url: profile.instagram_url?.trim() ?? "",
    tiktok_url: profile.tiktok_url?.trim() ?? "",
    soundcloud_url: profile.soundcloud_url?.trim() ?? "",
    website_url: profile.website_url?.trim() ?? "",
    artist_name: profile.artist_name?.trim() ?? "",
    dj_booking_contact_name: profile.dj_booking_contact_name?.trim() ?? "",
    promoter_brand_name: profile.promoter_brand_name?.trim() ?? "",
    promoter_brand_description: profile.promoter_brand_description?.trim() ?? "",
    dj_availability: profile.dj_availability?.trim() ?? "",
    dj_past_gigs: profile.dj_past_gigs?.trim() ?? "",
    promoter_venues_used: profile.promoter_venues_used?.trim() ?? "",
    promoter_upcoming_events: profile.promoter_upcoming_events?.trim() ?? "",
    promoter_past_events: profile.promoter_past_events?.trim() ?? "",
  };
}

function roleNarrowsFromBoth(previousRole: UserRole | null, nextRole: UserRole): boolean {
  return previousRole === "both" && (nextRole === "dj" || nextRole === "promoter");
}

export default function EditProfileForm({
  profile,
  isEditing,
  onSaved,
}: {
  profile: UserProfile;
  isEditing: boolean;
  onSaved: () => void;
}) {
  const initialRole = profile.role ?? "dj";
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<UserProfileInput>(() => profileToFormInput(profile));
  const [role, setRole] = useState<UserRole>(initialRole);
  const [savedRole] = useState<UserRole | null>(profile.role);
  const [genreTags, setGenreTags] = useState<string[]>(() => parseStoredGenreTags(profile.genre));
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [roleChangeAcknowledged, setRoleChangeAcknowledged] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showDjFields = role === "dj" || role === "both";
  const showPromoterFields = role === "promoter" || role === "both";
  const needsRoleChangeAck = roleNarrowsFromBoth(savedRole, role);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const updateField = useCallback(
    <Key extends keyof UserProfileInput>(key: Key, value: UserProfileInput[Key]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setFieldErrors((prev) => {
        if (!prev[key]) {
          return prev;
        }

        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  function toggleGenreTag(tag: string) {
    setGenreTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((item) => item !== tag);
      }

      if (prev.length >= MAX_PROFILE_GENRE_TAGS) {
        setFieldErrors((errors) => ({
          ...errors,
          genre: `Choose up to ${MAX_PROFILE_GENRE_TAGS} genres.`,
        }));
        return prev;
      }

      setFieldErrors((errors) => {
        if (!errors.genre) {
          return errors;
        }

        const next = { ...errors };
        delete next.genre;
        return next;
      });

      return [...prev, tag];
    });
  }

  function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setUploadError(null);
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!isAllowedProfileImageType(file.type)) {
      setUploadError("Please choose a JPG, PNG, or WebP image.");
      return;
    }

    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleRoleChange(nextRole: UserRole) {
    setRole(nextRole);

    if (!roleNarrowsFromBoth(savedRole, nextRole)) {
      setRoleChangeAcknowledged(false);
    }
  }

  async function validateUsernameField(username: string): Promise<string | null> {
    const normalized = normalizeUsername(username);

    if (!normalized) {
      return "Username is required.";
    }

    if (!isValidUsername(normalized)) {
      return "Use 3–30 lowercase letters, numbers, or underscores.";
    }

    setUsernameChecking(true);

    try {
      const userId = await getCurrentUserId();
      const available = await isUsernameAvailable(normalized, userId);

      if (!available) {
        return "That username is already taken.";
      }
    } catch (checkError) {
      console.error("Username availability check failed:", checkError);
      return "Could not verify username. Try again.";
    } finally {
      setUsernameChecking(false);
    }

    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setUploadError(null);

    const nextErrors: Partial<Record<string, string>> = {};

    if (!form.display_name.trim()) {
      nextErrors.display_name = "Display name is required.";
    }

    const usernameError = await validateUsernameField(form.username);

    if (usernameError) {
      nextErrors.username = usernameError;
    }

    if (needsRoleChangeAck && !roleChangeAcknowledged) {
      setError("Confirm the role change warning before saving.");
      setFieldErrors(nextErrors);
      return;
    }

    let normalizedInstagram = "";
    let normalizedTikTok = "";
    let normalizedSoundCloud = "";

    try {
      normalizedInstagram = normalizeInstagramInput(form.instagram_url);
    } catch (instagramError) {
      nextErrors.instagram_url =
        instagramError instanceof Error ? instagramError.message : "Invalid Instagram link.";
    }

    try {
      normalizedTikTok = normalizeTikTokInput(form.tiktok_url);
    } catch (tiktokError) {
      nextErrors.tiktok_url =
        tiktokError instanceof Error ? tiktokError.message : "Invalid TikTok link.";
    }

    if (showDjFields && form.soundcloud_url.trim()) {
      try {
        normalizedSoundCloud = normalizeExternalUrl(form.soundcloud_url, {
          label: "SoundCloud link",
          allowedHosts: ["soundcloud.com"],
        });
      } catch (soundCloudError) {
        nextErrors.soundcloud_url =
          soundCloudError instanceof Error ? soundCloudError.message : "Invalid SoundCloud link.";
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setSaving(true);

    try {
      let avatarUrl = existingAvatarUrl;

      if (selectedFile) {
        try {
          avatarUrl = await uploadProfileImage(selectedFile);
          setExistingAvatarUrl(avatarUrl);
        } catch (imageError) {
          console.error("Profile image upload failed:", imageError);
          setUploadError("Image upload failed.");
          setSaving(false);
          return;
        }
      }

      const payload: UserProfileInput = {
        ...form,
        genre: showDjFields ? serializeGenreTags(genreTags) : form.genre.trim(),
        instagram_url: normalizedInstagram,
        tiktok_url: normalizedTikTok,
        soundcloud_url: showDjFields ? normalizedSoundCloud : form.soundcloud_url.trim(),
      };

      if (role !== savedRole) {
        await saveUserRole(role);
      }

      await saveUserProfile(payload, { avatarUrl });
      onSaved();
    } catch (saveError) {
      console.error("Failed to save profile:", saveError);

      const message =
        saveError instanceof Error ? saveError.message : "Failed to save profile.";

      if (message.toLowerCase().includes("username")) {
        setFieldErrors((prev) => ({ ...prev, username: message }));
      } else {
        setError(message);
      }

      setSaving(false);
    }
  }

  return (
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
          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="ftc-btn-primary px-4 py-2.5 text-sm uppercase tracking-wide"
            >
              Take photo
            </button>
            <button
              type="button"
              onClick={() => libraryInputRef.current?.click()}
              className="rounded-xl border border-ftc-border-subtle bg-ftc-bg px-4 py-2.5 text-sm font-medium text-ftc-text transition hover:border-ftc-border-strong"
            >
              Choose photo
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              onChange={handleImageSelect}
              className="hidden"
            />
            <input
              ref={libraryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>
        </div>
        {uploadError ? <p className="mt-3 text-sm text-red-400">{uploadError}</p> : null}
      </div>

      <fieldset className="space-y-4 rounded-2xl border border-ftc-border bg-ftc-surface/40 p-4 sm:p-5">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ftc-primary">
          Basic details
        </legend>

        <ProfileField
          label="Username"
          value={form.username}
          onChange={(value) => updateField("username", value)}
          onBlur={() => {
            void validateUsernameField(form.username).then((usernameError) => {
              if (usernameError) {
                setFieldErrors((prev) => ({ ...prev, username: usernameError }));
              }
            });
          }}
          placeholder="breakerbreaker or @breakerbreaker"
          required
          error={fieldErrors.username}
          suffix={
            usernameChecking ? (
              <span className="text-xs text-ftc-text-muted">Checking...</span>
            ) : form.username.trim() ? (
              <span className="text-xs text-ftc-text-secondary">
                {formatPublicUsername(form.username)}
              </span>
            ) : null
          }
        />

        <ProfileField
          label="Display name"
          value={form.display_name}
          onChange={(value) => updateField("display_name", value)}
          placeholder="Your scene name"
          required
          error={fieldErrors.display_name}
        />

        <ProfileField
          label="Bio"
          value={form.bio}
          onChange={(value) => updateField("bio", value)}
          placeholder="Tell people what you do in the scene"
          multiline
        />

        <div>
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
            Role
          </span>
          <div className="grid gap-2">
            {ROLE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm transition ${
                  role === option.value
                    ? "border-ftc-primary bg-ftc-bg-elevated text-ftc-text"
                    : "border-ftc-border-subtle bg-ftc-bg text-ftc-text-secondary hover:border-ftc-border-strong"
                }`}
              >
                <input
                  type="radio"
                  name="profile-role"
                  value={option.value}
                  checked={role === option.value}
                  onChange={() => handleRoleChange(option.value)}
                  className="h-4 w-4 accent-ftc-primary"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {needsRoleChangeAck ? (
            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              <p>
                Changing from Both to a single role hides the other role&apos;s profile sections,
                but your saved details stay on your account.
              </p>
              <label className="mt-3 flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={roleChangeAcknowledged}
                  onChange={(event) => setRoleChangeAcknowledged(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-ftc-primary"
                />
                <span>I understand my hidden details will be preserved.</span>
              </label>
            </div>
          ) : null}
        </div>
      </fieldset>

      {showDjFields ? (
        <fieldset className="space-y-4 rounded-2xl border border-ftc-border bg-ftc-surface/40 p-4 sm:p-5">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ftc-primary">
            DJ / Artist details
          </legend>

          <div>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
              Music genres / styles
            </span>
            <div className="flex flex-wrap gap-2">
              {PROFILE_GENRE_OPTIONS.map((tag) => {
                const selected = genreTags.includes(tag);

                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleGenreTag(tag)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      selected
                        ? "border-ftc-primary bg-ftc-bg-elevated text-ftc-text"
                        : "border-ftc-border-subtle bg-ftc-bg text-ftc-text-secondary hover:border-ftc-border-strong"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            {fieldErrors.genre ? (
              <p className="mt-2 text-sm text-red-400">{fieldErrors.genre}</p>
            ) : null}
          </div>

          <ProfileField
            label="SoundCloud"
            value={form.soundcloud_url}
            onChange={(value) => updateField("soundcloud_url", value)}
            placeholder="https://soundcloud.com/yourhandle"
            error={fieldErrors.soundcloud_url}
          />
        </fieldset>
      ) : null}

      {showPromoterFields ? (
        <fieldset className="space-y-4 rounded-2xl border border-ftc-border bg-ftc-surface/40 p-4 sm:p-5">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ftc-primary">
            Promoter details
          </legend>

          <ProfileField
            label="Event brand name"
            value={form.promoter_brand_name}
            onChange={(value) => updateField("promoter_brand_name", value)}
            placeholder="Your event brand"
          />
        </fieldset>
      ) : null}

      <fieldset className="space-y-4 rounded-2xl border border-ftc-border bg-ftc-surface/40 p-4 sm:p-5">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ftc-primary">
          Links
        </legend>

        <ProfileField
          label="Instagram"
          value={form.instagram_url}
          onChange={(value) => updateField("instagram_url", value)}
          placeholder="@username, username, or full URL"
          error={fieldErrors.instagram_url}
        />

        <ProfileField
          label="TikTok"
          value={form.tiktok_url}
          onChange={(value) => updateField("tiktok_url", value)}
          placeholder="@username, username, or full URL"
          error={fieldErrors.tiktok_url}
        />
      </fieldset>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        type="submit"
        disabled={saving || usernameChecking}
        className="w-full ftc-btn-primary px-5 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {saving ? "Saving..." : isEditing ? "Save changes" : "Save profile"}
      </button>
    </form>
  );
}

function ProfileField({
  label,
  hint,
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  multiline = false,
  error,
  suffix,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  required?: boolean;
  multiline?: boolean;
  error?: string;
  suffix?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
        {label}
        {required ? " *" : ""}
      </span>
      {hint ? <p className="mb-2 text-xs text-ftc-text-muted">{hint}</p> : null}
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={4}
          className="ftc-input px-3.5 py-2.5"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          className="ftc-input px-3.5 py-2.5"
        />
      )}
      {suffix ? <div className="mt-1.5">{suffix}</div> : null}
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </label>
  );
}
