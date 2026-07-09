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
  getUsernameFormatError,
  applyBioInputLimit,
  createProfileFormInputFromProfile,
  MAX_PROFILE_BIO_LENGTH,
  MAX_PROFILE_GENRE_TAGS,
  normalizeExternalUrl,
  normalizeInstagramInput,
  normalizeTikTokInput,
  normalizeUsername,
  parseStoredGenreTags,
  serializeGenreTags,
} from "@/lib/user/profileFormUtils";
import {
  createProfileEditBaseline,
  hasUnsavedProfileEdits,
} from "@/lib/user/profileEditDirtyState";
import ProfileFormField from "@/app/components/profile/ProfileFormField";
import ProfileGenrePicker from "@/app/components/profile/ProfileGenrePicker";
import { isAllowedProfileImageType, uploadProfileImage } from "@/lib/user/uploadProfileImage";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "dj", label: "DJ / Artist" },
  { value: "promoter", label: "Event Planner" },
  { value: "both", label: "Both" },
];

function roleNarrowsFromBoth(previousRole: UserRole | null, nextRole: UserRole): boolean {
  return previousRole === "both" && (nextRole === "dj" || nextRole === "promoter");
}

function preventImplicitEnterSubmit(event: React.KeyboardEvent<HTMLFormElement>) {
  if (event.key !== "Enter" || event.nativeEvent.isComposing) {
    return;
  }

  const target = event.target;

  if (target instanceof HTMLTextAreaElement) {
    return;
  }

  if (target instanceof HTMLButtonElement && target.type === "submit") {
    return;
  }

  event.preventDefault();
}

export default function EditProfileForm({
  profile,
  isEditing,
  onSaved,
  onDirtyChange,
}: {
  profile: UserProfile;
  isEditing: boolean;
  onSaved: () => void;
  onDirtyChange?: (hasUnsavedChanges: boolean) => void;
}) {
  const editBaselineRef = useRef(createProfileEditBaseline(profile));
  const initialRole = profile.role ?? "dj";
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const photoPickerRef = useRef<HTMLDivElement>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [form, setForm] = useState<UserProfileInput>(() => createProfileFormInputFromProfile(profile));
  const [role, setRole] = useState<UserRole>(initialRole);
  const [savedRole] = useState<UserRole | null>(profile.role);
  const [genreTags, setGenreTags] = useState<string[]>(() => parseStoredGenreTags(profile.genre));
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [usernameLiveMessage, setUsernameLiveMessage] = useState<string | null>(null);
  const [usernameLiveTone, setUsernameLiveTone] = useState<"muted" | "success" | "error">("muted");
  const usernameCheckSeqRef = useRef(0);
  const savedUsername = normalizeUsername(profile.username ?? "");
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

  useEffect(() => {
    if (!photoMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target;

      if (!(target instanceof Node) || !photoPickerRef.current?.contains(target)) {
        setPhotoMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPhotoMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [photoMenuOpen]);

  useEffect(() => {
    if (!onDirtyChange) {
      return;
    }

    onDirtyChange(
      hasUnsavedProfileEdits(editBaselineRef.current, {
        form,
        role,
        genreTags,
        hasPendingPhoto: selectedFile !== null,
      }),
    );
  }, [form, role, genreTags, selectedFile, onDirtyChange]);

  useEffect(() => {
    const normalized = normalizeUsername(form.username);

    if (!form.username.trim()) {
      setUsernameLiveMessage(null);
      return;
    }

    const formatError = getUsernameFormatError(normalized);

    if (formatError) {
      setUsernameLiveTone("error");
      setUsernameLiveMessage(formatError);
      return;
    }

    if (normalized === savedUsername) {
      setUsernameLiveTone("success");
      setUsernameLiveMessage("Available");
      return;
    }

    setUsernameLiveTone("muted");
    setUsernameLiveMessage("Checking…");

    const checkSeq = ++usernameCheckSeqRef.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const userId = await getCurrentUserId();

          if (checkSeq !== usernameCheckSeqRef.current) {
            return;
          }

          const available = await isUsernameAvailable(normalized, userId);

          if (checkSeq !== usernameCheckSeqRef.current) {
            return;
          }

          if (available) {
            setUsernameLiveTone("success");
            setUsernameLiveMessage("Available");
          } else {
            setUsernameLiveTone("error");
            setUsernameLiveMessage("That username is already taken");
          }
        } catch (checkError) {
          console.error("Username availability check failed:", checkError);

          if (checkSeq !== usernameCheckSeqRef.current) {
            return;
          }

          setUsernameLiveTone("error");
          setUsernameLiveMessage("Could not verify username. Try again.");
        }
      })();
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [form.username, savedUsername]);

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
        setFieldErrors((errors) => {
          if (!errors.genre) {
            return errors;
          }

          const next = { ...errors };
          delete next.genre;
          return next;
        });
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
    setPhotoMenuOpen(false);
  }

  function handleRoleChange(nextRole: UserRole) {
    setRole(nextRole);

    if (!roleNarrowsFromBoth(savedRole, nextRole)) {
      setRoleChangeAcknowledged(false);
    }
  }

  async function validateUsernameField(username: string): Promise<string | null> {
    const normalized = normalizeUsername(username);
    const formatError = getUsernameFormatError(normalized);

    if (formatError) {
      return formatError;
    }

    if (normalized === savedUsername) {
      return null;
    }

    try {
      const userId = await getCurrentUserId();
      const available = await isUsernameAvailable(normalized, userId);

      if (!available) {
        return "That username is already taken.";
      }
    } catch (checkError) {
      console.error("Username availability check failed:", checkError);
      return "Could not verify username. Try again.";
    }

    return null;
  }

  function handleBioChange(nextBio: string) {
    const limitedBio = applyBioInputLimit(form.bio, nextBio);

    if (limitedBio === null) {
      return;
    }

    updateField("bio", limitedBio);
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

    if (form.bio.length > MAX_PROFILE_BIO_LENGTH) {
      nextErrors.bio = "Bio must be 150 characters or fewer. Shorten your bio to save.";
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
    <form
      onSubmit={handleSubmit}
      onKeyDown={preventImplicitEnterSubmit}
      className="mt-6 space-y-6"
    >
      <div className="flex flex-col items-center">
        <div ref={photoPickerRef} className="relative flex flex-col items-center">
            <button
              type="button"
              aria-label="Change profile photo"
              aria-expanded={photoMenuOpen}
              aria-haspopup="menu"
              onClick={() => setPhotoMenuOpen((open) => !open)}
              className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ftc-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ftc-bg"
            >
              <ProfileAvatar
                name={form.display_name || "Profile"}
                avatarUrl={previewUrl ?? existingAvatarUrl}
                size="xl"
                className="h-24 w-24 sm:h-28 sm:w-28"
              />
              <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-ftc-border-subtle bg-ftc-bg-elevated text-ftc-primary">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                  <path d="M3 8V7a2 2 0 0 1 2-2h1.2a1 1 0 0 0 .98-.804l.36-1.8A1 1 0 0 1 8.52 2h7a1 1 0 0 1 .98.804l.36 1.8A1 1 0 0 0 17.8 5H19a2 2 0 0 1 2 2v1" />
                  <path d="M3 16v1a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" />
                </svg>
              </span>
            </button>

            {photoMenuOpen ? (
              <div
                role="menu"
                className="absolute top-full z-10 mt-2 w-52 overflow-hidden rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated shadow-ftc-md"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    cameraInputRef.current?.click();
                    setPhotoMenuOpen(false);
                  }}
                  className="flex min-h-11 w-full items-center px-3.5 text-sm text-ftc-text transition hover:bg-ftc-surface"
                >
                  Take photo
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    libraryInputRef.current?.click();
                    setPhotoMenuOpen(false);
                  }}
                  className="flex min-h-11 w-full items-center border-t border-ftc-border-subtle px-3.5 text-sm text-ftc-text transition hover:bg-ftc-surface"
                >
                  Choose from library
                </button>
              </div>
            ) : null}

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
        {uploadError ? (
          <p className="mt-2 text-center text-sm text-red-400">{uploadError}</p>
        ) : null}
      </div>

      <fieldset className="space-y-4 rounded-2xl border border-ftc-border bg-ftc-surface/40 p-4 sm:p-5">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ftc-primary">
          Basic details
        </legend>

        <div className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
            Username *
          </span>
          <input
            type="text"
            value={form.username}
            onChange={(event) => updateField("username", event.target.value)}
            placeholder="Username"
            required
            className="ftc-input px-3.5 py-2.5"
          />
          {form.username.trim() ? (
            <p className="mt-1 text-xs text-ftc-text-secondary">
              {formatPublicUsername(form.username)}
            </p>
          ) : null}
          {usernameLiveMessage ? (
            <p
              className={`mt-1 text-xs ${
                usernameLiveTone === "success"
                  ? "text-ftc-primary"
                  : usernameLiveTone === "error"
                    ? "text-red-400"
                    : "text-ftc-text-muted"
              }`}
            >
              {usernameLiveMessage}
            </p>
          ) : null}
          {fieldErrors.username ? (
            <p className="mt-2 text-sm text-red-400">{fieldErrors.username}</p>
          ) : null}
        </div>

        <ProfileFormField
          label="Display name"
          value={form.display_name}
          onChange={(value) => updateField("display_name", value)}
          placeholder="Display name"
          required
          error={fieldErrors.display_name}
        />

        <ProfileFormField
          label="Bio"
          value={form.bio}
          onChange={handleBioChange}
          placeholder="Bio"
          multiline
          textareaClassName="ftc-profile-bio-textarea"
          footer={
            <p
              className={`text-xs ${
                form.bio.length > MAX_PROFILE_BIO_LENGTH
                  ? "text-red-400"
                  : "text-ftc-text-muted"
              }`}
            >
              {form.bio.length}/{MAX_PROFILE_BIO_LENGTH}
            </p>
          }
          error={fieldErrors.bio}
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

          <ProfileGenrePicker
            selectedTags={genreTags}
            onToggleTag={toggleGenreTag}
            error={fieldErrors.genre}
          />

          <ProfileFormField
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

          <ProfileFormField
            label="Event brand name"
            value={form.promoter_brand_name}
            onChange={(value) => updateField("promoter_brand_name", value)}
            placeholder="Event brand name"
          />
        </fieldset>
      ) : null}

      <fieldset className="space-y-4 rounded-2xl border border-ftc-border bg-ftc-surface/40 p-4 sm:p-5">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ftc-primary">
          Links
        </legend>

        <ProfileFormField
          label="Instagram"
          value={form.instagram_url}
          onChange={(value) => updateField("instagram_url", value)}
          placeholder="@username, username, or full URL"
          error={fieldErrors.instagram_url}
        />

        <ProfileFormField
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
        disabled={saving}
        className="w-full ftc-btn-primary px-5 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {saving ? "Saving..." : isEditing ? "Save changes" : "Save profile"}
      </button>
    </form>
  );
}
