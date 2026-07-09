import type { UserProfile, UserProfileInput, UserRole } from "@/lib/user/currentUser";
import {
  createProfileFormInputFromProfile,
  normalizeUsername,
  parseStoredGenreTags,
  serializeGenreTags,
} from "@/lib/user/profileFormUtils";

export type ProfileEditDirtyState = {
  form: UserProfileInput;
  role: UserRole;
  genreTags: string[];
  hasPendingPhoto: boolean;
};

export function createProfileEditBaseline(profile: UserProfile): ProfileEditDirtyState {
  return {
    form: createProfileFormInputFromProfile(profile),
    role: profile.role ?? "dj",
    genreTags: parseStoredGenreTags(profile.genre),
    hasPendingPhoto: false,
  };
}

export function hasUnsavedProfileEdits(
  baseline: ProfileEditDirtyState,
  current: ProfileEditDirtyState,
): boolean {
  if (current.hasPendingPhoto) {
    return true;
  }

  if (baseline.role !== current.role) {
    return true;
  }

  if (serializeGenreTags(baseline.genreTags) !== serializeGenreTags(current.genreTags)) {
    return true;
  }

  const formKeys = Object.keys(baseline.form) as (keyof UserProfileInput)[];

  for (const key of formKeys) {
    const baselineValue =
      key === "username"
        ? normalizeUsername(baseline.form.username)
        : baseline.form[key].trim();
    const currentValue =
      key === "username" ? normalizeUsername(current.form.username) : current.form[key].trim();

    if (baselineValue !== currentValue) {
      return true;
    }
  }

  return false;
}
