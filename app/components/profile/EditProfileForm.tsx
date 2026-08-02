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
  getUsernameFormatError,
  addEventBrandTag,
  applyBioInputLimit,
  applyDisplayNameInputLimit,
  createProfileFormInputFromProfile,
  MAX_PROFILE_BIO_LENGTH,
  MAX_PROFILE_BIO_LINES,
  MAX_PROFILE_DISPLAY_NAME_LENGTH,
  MAX_PROFILE_GENRE_TAGS,
  normalizeInstagramInput,
  normalizeSoundCloudInput,
  normalizeTikTokInput,
  normalizeUsername,
  parseStoredEventBrands,
  parseStoredGenreTags,
  serializeEventBrands,
  serializeGenreTags,
} from "@/lib/user/profileFormUtils";
import {
  createProfileEditBaseline,
  hasUnsavedProfileEdits,
} from "@/lib/user/profileEditDirtyState";
import { shouldBlockMultilineEnter } from "@/lib/cappedMultilineInput";
import { countUnicodeCharacters } from "@/lib/textInputLimits";
import ProfileFormField from "@/app/components/profile/ProfileFormField";
import ProfileGenrePicker from "@/app/components/profile/ProfileGenrePicker";
import ProfileEventBrandsField from "@/app/components/profile/ProfileEventBrandsField";
import { isAllowedProfileImageType, uploadProfileImage } from "@/lib/user/uploadProfileImage";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "dj", label: "DJ / Artist" },
  { value: "promoter", label: "Promoter / Event Planner" },
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
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<UserProfileInput>(() => createProfileFormInputFromProfile(profile));
  const [role, setRole] = useState<UserRole>(initialRole);
  const [savedRole] = useState<UserRole | null>(profile.role);
  const [genreTags, setGenreTags] = useState<string[]>(() => parseStoredGenreTags(profile.genre));
  const [brandTags, setBrandTags] = useState<string[]>(() =>
    parseStoredEventBrands(profile.promoter_brand_name),
  );
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [usernameLiveMessage, setUsernameLiveMessage] = useState<string | null>(null);
  const [usernameLiveTone, setUsernameLiveTone] = useState<"muted" | "success" | "error">("muted");
  const usernameCheckSeqRef = useRef(0);
  const usernameEditedRef = useRef(false);
  const isComposingBioRef = useRef(false);
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
    if (!onDirtyChange) {
      return;
    }

    onDirtyChange(
      hasUnsavedProfileEdits(editBaselineRef.current, {
        form,
        role,
        genreTags,
        brandTags,
        hasPendingPhoto: selectedFile !== null,
      }),
    );
  }, [form, role, genreTags, brandTags, selectedFile, onDirtyChange]);

  useEffect(() => {
    const normalized = normalizeUsername(form.username);

    if (!form.username.trim()) {
      setUsernameLiveMessage(null);
      return;
    }

    if (!usernameEditedRef.current) {
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
      setUsernameLiveMessage(null);
      return;
    }

    setUsernameLiveTone("muted");
    setUsernameLiveMessage("Checking");

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
      usernameCheckSeqRef.current += 1;
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
          genre: `Choose up to ${MAX_PROFILE_GENRE_TAGS} genres`,
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

  function addBrandTag(rawName: string) {
    const result = addEventBrandTag(brandTags, rawName);

    setBrandTags(result.brands);
    setFieldErrors((errors) => {
      if (!result.error && !errors.promoter_brand_name) {
        return errors;
      }

      const next = { ...errors };

      if (result.error) {
        next.promoter_brand_name = result.error;
      } else {
        delete next.promoter_brand_name;
      }

      return next;
    });
  }

  function removeBrandTag(brand: string) {
    setBrandTags((prev) => prev.filter((item) => item !== brand));
    setFieldErrors((errors) => {
      if (!errors.promoter_brand_name) {
        return errors;
      }

      const next = { ...errors };
      delete next.promoter_brand_name;
      return next;
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
      setUploadError("Please choose a JPG, PNG, or WebP image");
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
        return "That username is already taken";
      }
    } catch (checkError) {
      console.error("Username availability check failed:", checkError);
      return "Could not verify username. Try again.";
    }

    return null;
  }

  function handleDisplayNameChange(nextDisplayName: string) {
    const limited = applyDisplayNameInputLimit(form.display_name, nextDisplayName);

    if (limited === null) {
      return;
    }

    updateField("display_name", limited);
  }

  function handleBioChange(nextBio: string) {
    // Mid-composition (e.g. CJK IME), let the browser own the raw value —
    // capping mid-keystroke by newline/length can corrupt an in-progress
    // composition. The real limit is enforced on composition end below.
    if (isComposingBioRef.current) {
      updateField("bio", nextBio);
      return;
    }

    const limitedBio = applyBioInputLimit(form.bio, nextBio);

    if (limitedBio === null) {
      return;
    }

    updateField("bio", limitedBio);
  }

  function handleBioKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }

    if (shouldBlockMultilineEnter(form.bio, MAX_PROFILE_BIO_LINES)) {
      event.preventDefault();
    }
  }

  function handleBioCompositionEnd(event: React.CompositionEvent<HTMLTextAreaElement>) {
    isComposingBioRef.current = false;

    const limitedBio = applyBioInputLimit(form.bio, event.currentTarget.value);

    if (limitedBio !== null) {
      updateField("bio", limitedBio);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setUploadError(null);

    const nextErrors: Partial<Record<string, string>> = {};

    if (!form.display_name.trim()) {
      nextErrors.display_name = "Display name is required";
    } else if (form.display_name.length > MAX_PROFILE_DISPLAY_NAME_LENGTH) {
      nextErrors.display_name = `Display name must be ${MAX_PROFILE_DISPLAY_NAME_LENGTH} characters or fewer`;
    }

    const usernameError = await validateUsernameField(form.username);

    if (usernameError) {
      nextErrors.username = usernameError;
    }

    if (countUnicodeCharacters(form.bio) > MAX_PROFILE_BIO_LENGTH) {
      nextErrors.bio = "Bio must be 150 characters or fewer. Shorten your bio to save.";
    }

    if (needsRoleChangeAck && !roleChangeAcknowledged) {
      setError("Confirm the role change warning before saving");
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
        instagramError instanceof Error ? instagramError.message : "Invalid Instagram link";
    }

    try {
      normalizedTikTok = normalizeTikTokInput(form.tiktok_url);
    } catch (tiktokError) {
      nextErrors.tiktok_url =
        tiktokError instanceof Error ? tiktokError.message : "Invalid TikTok link";
    }

    if (showDjFields && form.soundcloud_url.trim()) {
      try {
        normalizedSoundCloud = normalizeSoundCloudInput(form.soundcloud_url);
      } catch (soundCloudError) {
        nextErrors.soundcloud_url =
          soundCloudError instanceof Error ? soundCloudError.message : "Invalid SoundCloud link";
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
          setUploadError("Image upload failed");
          setSaving(false);
          return;
        }
      }

      const payload: UserProfileInput = {
        ...form,
        genre: showDjFields ? serializeGenreTags(genreTags) : form.genre.trim(),
        promoter_brand_name: showPromoterFields
          ? serializeEventBrands(brandTags)
          : form.promoter_brand_name.trim(),
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
        saveError instanceof Error ? saveError.message : "Failed to save profile";

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
        <div className="relative flex flex-col items-center">
          <button
            type="button"
            aria-label="Change profile photo"
            onClick={() => photoInputRef.current?.click()}
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

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
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
            Username
          </span>
          <input
            type="text"
            value={form.username}
            onChange={(event) => {
              usernameEditedRef.current = true;
              updateField("username", event.target.value);
            }}
            placeholder="Username"
            className="ftc-input px-3.5 py-2.5"
          />
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
          {fieldErrors.username && !(usernameLiveMessage && usernameLiveTone === "error") ? (
            <p className="mt-2 text-sm text-red-400">{fieldErrors.username}</p>
          ) : null}
        </div>

        <ProfileFormField
          label="Display name"
          value={form.display_name}
          onChange={handleDisplayNameChange}
          placeholder="Display name"
          maxLength={MAX_PROFILE_DISPLAY_NAME_LENGTH}
          error={fieldErrors.display_name}
        />

        {/* Bio only: border/radius live on this `.ftc-input-shell` wrapper (the
         * same shared shell pattern BookingRateField.tsx already uses) instead
         * of on the textarea itself. Safari fails to clip an element's own
         * scrolling content to that same element's border-radius when both are
         * set on one box -- confirmed via live computed styles (the textarea
         * had `overflow-y: auto` and `border-radius: 16px` on the same node) --
         * which clips the custom focus border on older iOS Safari. Moving the
         * border/radius to a non-scrolling wrapper removes the conflicting
         * combination entirely. Scoped to bio only -- ProfileFormField and
         * every other textarea are untouched.
         *
         * No native `maxLength` here (matches BookingFormField's textarea,
         * which never had one): the DOM's own maxlength enforcement counts
         * raw UTF-16 units, so it would silently re-cap typing below 150 for
         * any bio containing an emoji, exactly the bug this fix removes from
         * the JS-side limit. `applyBioInputLimit`'s onChange enforcement is
         * the sole source of truth, same as the booking-notes field. */}
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
            Bio
          </span>
          <div className="ftc-input-shell rounded-[var(--ftc-radius-lg)]">
            <textarea
              value={form.bio}
              onChange={(event) => handleBioChange(event.target.value)}
              onKeyDown={handleBioKeyDown}
              onCompositionStart={() => {
                isComposingBioRef.current = true;
              }}
              onCompositionEnd={handleBioCompositionEnd}
              placeholder="Bio"
              rows={5}
              className="ftc-fixed-scroll-textarea w-full border-0 bg-transparent px-3.5 py-2.5 text-sm text-ftc-text outline-none placeholder:text-ftc-text-muted"
            />
          </div>
          <div className="mt-1">
            <p
              className={`text-xs ${
                countUnicodeCharacters(form.bio) > MAX_PROFILE_BIO_LENGTH
                  ? "text-red-400"
                  : "text-ftc-text-muted"
              }`}
            >
              {countUnicodeCharacters(form.bio)}/{MAX_PROFILE_BIO_LENGTH}
            </p>
          </div>
          {fieldErrors.bio ? <p className="mt-2 text-sm text-red-400">{fieldErrors.bio}</p> : null}
        </label>

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
                but your saved details stay on your account
              </p>
              <label className="mt-3 flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={roleChangeAcknowledged}
                  onChange={(event) => setRoleChangeAcknowledged(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-ftc-primary"
                />
                <span>I understand my hidden details will be preserved</span>
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
        </fieldset>
      ) : null}

      {showPromoterFields ? (
        <fieldset className="space-y-4 rounded-2xl border border-ftc-border bg-ftc-surface/40 p-4 sm:p-5">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ftc-primary">
            Promoter details
          </legend>

          <ProfileEventBrandsField
            brands={brandTags}
            onAddBrand={addBrandTag}
            onRemoveBrand={removeBrandTag}
            error={fieldErrors.promoter_brand_name}
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
          placeholder="Instagram"
          error={fieldErrors.instagram_url}
        />

        <ProfileFormField
          label="TikTok"
          value={form.tiktok_url}
          onChange={(value) => updateField("tiktok_url", value)}
          placeholder="TikTok"
          error={fieldErrors.tiktok_url}
        />

        {showDjFields ? (
          <ProfileFormField
            label="SoundCloud"
            value={form.soundcloud_url}
            onChange={(value) => updateField("soundcloud_url", value)}
            placeholder="SoundCloud"
            error={fieldErrors.soundcloud_url}
          />
        ) : null}
      </fieldset>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="w-full ftc-btn-primary px-5 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {saving ? "Saving" : isEditing ? "Save changes" : "Save profile"}
      </button>
    </form>
  );
}
