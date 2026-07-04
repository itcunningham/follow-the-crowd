import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export const LOGIN_PATH = "/login";
export const SIGNUP_PATH = "/signup";
export const PROFILE_SETUP_PATH = "/profile/setup";
export const SETTINGS_PATH = "/settings";
export const BOOKING_PLANS_PATH = "/booking-plans";
export const DISCOVER_PATH = "/discover";

export type UserRole = "dj" | "promoter" | "both";

export type UserProfile = {
  user_id: string;
  role: UserRole | null;
  onboarding_complete: boolean;
  display_name: string | null;
  bio: string | null;
  genre: string | null;
  instagram_url: string | null;
  soundcloud_url: string | null;
  location: string | null;
  avatar_url: string | null;
  dj_availability: string | null;
  dj_past_gigs: string | null;
  promoter_venues_used: string | null;
  promoter_upcoming_events: string | null;
  promoter_past_events: string | null;
};

export type UserProfileInput = {
  display_name: string;
  bio: string;
  genre: string;
  location: string;
  instagram_url: string;
  soundcloud_url: string;
  dj_availability: string;
  dj_past_gigs: string;
  promoter_venues_used: string;
  promoter_upcoming_events: string;
  promoter_past_events: string;
};

const PROFILE_FIELDS =
  "user_id, role, onboarding_complete, display_name, bio, genre, instagram_url, soundcloud_url, location, avatar_url, dj_availability, dj_past_gigs, promoter_venues_used, promoter_upcoming_events, promoter_past_events";

export function getDefaultRouteForRole(role: UserRole | null): string {
  return role === "dj" ? "/dm" : "/";
}

export function needsOnboarding(profile: UserProfile | null): boolean {
  if (!profile) {
    return true;
  }

  return !profile.onboarding_complete || !profile.role;
}

export function needsProfileSetup(profile: UserProfile | null): boolean {
  return !profile?.display_name?.trim();
}

function isAuthSessionMissingError(error: { name?: string; message?: string }): boolean {
  const label = `${error.name ?? ""} ${error.message ?? ""}`;
  return label.includes("AuthSessionMissingError") || error.message === "Auth session missing!";
}

export async function getCurrentAuthUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (isAuthSessionMissingError(error)) {
      return null;
    }

    console.error("[auth] getUser failed:", error);
    return null;
  }

  return data.user;
}

export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentAuthUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return user;
}

export async function getCurrentUserId(): Promise<string> {
  const user = await requireCurrentUser();
  return user.id;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });

  if (error) {
    throw error;
  }

  if (data.session && data.user) {
    await ensureUserProfileRow(data.user.id);
  }

  return data;
}

export async function ensureAuthenticatedUserProfileRow(): Promise<void> {
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    return;
  }

  await ensureUserProfileRow(authUser.id);
}

export async function ensureUserProfileRow(userId: string): Promise<void> {
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    console.error("[users] Skipping profile row creation without authenticated session", {
      requestedUserId: userId,
    });
    return;
  }

  if (authUser.id !== userId) {
    console.error("[users] Skipping profile row creation for mismatched auth user", {
      requestedUserId: userId,
      authenticatedUserId: authUser.id,
    });
    return;
  }

  const { data: existing, error: selectError } = await supabase
    .from("users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) {
    console.error("[users] Failed to check for existing profile row:", {
      userId,
      message: selectError.message,
      code: selectError.code,
      details: selectError.details,
      hint: selectError.hint,
    });
    throw selectError;
  }

  if (existing) {
    return;
  }

  const { error } = await supabase.from("users").insert({
    user_id: userId,
    onboarding_complete: false,
  });

  if (error) {
    if (error.code === "23505") {
      return;
    }

    console.error("[users] Failed to create profile row:", {
      userId,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }
}

export async function getPostAuthRedirectPath(): Promise<string> {
  await ensureAuthenticatedUserProfileRow();
  const profile = await getCurrentUserProfile();

  if (needsOnboarding(profile)) {
    return "/onboarding";
  }

  if (needsProfileSetup(profile)) {
    return PROFILE_SETUP_PATH;
  }

  return getDefaultRouteForRole(profile?.role ?? null);
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("users")
    .select(PROFILE_FIELDS)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as UserProfile | null) ?? null;
}

export async function getUserProfileById(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("users")
    .select(PROFILE_FIELDS)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as UserProfile | null) ?? null;
}

export async function saveUserRole(role: UserRole): Promise<void> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        user_id: userId,
        role,
        onboarding_complete: true,
      },
      { onConflict: "user_id", defaultToNull: false },
    )
    .select("user_id, role, onboarding_complete")
    .maybeSingle();

  if (error) {
    console.error("[users] Failed to save role during onboarding:", {
      userId,
      role,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  if (!data?.role || !data.onboarding_complete) {
    console.error("[users] Role save did not persist expected onboarding state:", {
      userId,
      role,
      savedRole: data?.role ?? null,
      onboarding_complete: data?.onboarding_complete ?? null,
    });
    throw new Error("Failed to save your role. Please try again.");
  }

  notifyRoleUpdated();
}

export function notifyRoleUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ftc-role-updated"));
  }
}

export async function saveUserProfile(
  input: UserProfileInput,
  options?: { avatarUrl?: string | null },
): Promise<void> {
  const userId = await getCurrentUserId();
  const existing = await getCurrentUserProfile();

  if (!existing?.role || !existing.onboarding_complete) {
    throw new Error("Complete role onboarding before saving your profile.");
  }

  const updatePayload: Record<string, string> = {
    display_name: input.display_name.trim(),
    bio: input.bio.trim(),
    genre: input.genre.trim(),
    location: input.location.trim(),
    instagram_url: input.instagram_url.trim(),
    soundcloud_url: input.soundcloud_url.trim(),
    dj_availability: input.dj_availability.trim(),
    dj_past_gigs: input.dj_past_gigs.trim(),
    promoter_venues_used: input.promoter_venues_used.trim(),
    promoter_upcoming_events: input.promoter_upcoming_events.trim(),
    promoter_past_events: input.promoter_past_events.trim(),
  };

  if (options && "avatarUrl" in options) {
    updatePayload.avatar_url = options.avatarUrl?.trim() ?? "";
  }

  const { data, error } = await supabase
    .from("users")
    .update(updatePayload)
    .eq("user_id", userId)
    .select("user_id, role, onboarding_complete, display_name")
    .maybeSingle();

  if (error) {
    console.error("[users] Failed to save profile:", {
      userId,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  if (!data) {
    console.error("[users] Profile update matched no row for current user:", { userId });
    throw new Error("Profile row not found for the current user.");
  }

  if (!data.display_name?.trim()) {
    console.error("[users] Profile save did not persist display name:", {
      userId,
      display_name: data.display_name,
    });
    throw new Error("Failed to save your profile. Please try again.");
  }
}

export type UserAvatarProfile = Pick<UserProfile, "user_id" | "display_name" | "avatar_url">;

export type BookingRecipientProfile = Pick<
  UserProfile,
  "user_id" | "display_name" | "avatar_url" | "genre" | "role"
>;

export async function getUserAvatarProfilesByIds(
  userIds: string[],
): Promise<Map<string, UserAvatarProfile>> {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  if (uniqueUserIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("users")
    .select("user_id, display_name, avatar_url")
    .in("user_id", uniqueUserIds);

  if (error) {
    throw error;
  }

  return new Map(
    ((data ?? []) as UserAvatarProfile[]).map((profile) => [profile.user_id, profile]),
  );
}

export async function getBookingRecipientProfilesByIds(
  userIds: string[],
): Promise<Map<string, BookingRecipientProfile>> {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  if (uniqueUserIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("users")
    .select("user_id, display_name, avatar_url, genre, role")
    .in("user_id", uniqueUserIds);

  if (error) {
    throw error;
  }

  return new Map(
    ((data ?? []) as BookingRecipientProfile[]).map((profile) => [profile.user_id, profile]),
  );
}

function getDiscoverPriority(currentRole: UserRole, targetRole: UserRole | null): number {
  if (currentRole === "both" || !targetRole) {
    return 0;
  }

  if (currentRole === "promoter") {
    if (targetRole === "dj") {
      return 0;
    }

    if (targetRole === "both") {
      return 1;
    }

    return 2;
  }

  if (targetRole === "promoter") {
    return 0;
  }

  if (targetRole === "both") {
    return 1;
  }

  return 2;
}

export async function listDiscoverUsers(currentRole: UserRole): Promise<UserProfile[]> {
  const currentUserId = await getCurrentUserId();

  const { data, error } = await supabase.from("users").select(PROFILE_FIELDS);

  if (error) {
    console.error("[discover] Failed to load users:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  const rows = (data ?? []) as UserProfile[];

  const users = rows.filter(
    (user) =>
      user.user_id !== currentUserId &&
      user.onboarding_complete === true &&
      Boolean(user.display_name?.trim()),
  );

  if (rows.length > 0 && users.length === 0) {
    console.warn(
      "[discover] Profiles were loaded but none are discoverable yet. Check onboarding_complete, display_name, and role on other accounts.",
      rows.map((user) => ({
        user_id: user.user_id,
        role: user.role,
        onboarding_complete: user.onboarding_complete,
        display_name: user.display_name,
      })),
    );
  }

  return users.sort((a, b) => {
    const priorityDiff =
      getDiscoverPriority(currentRole, a.role) - getDiscoverPriority(currentRole, b.role);

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return (a.display_name ?? "").localeCompare(b.display_name ?? "");
  });
}

export function getRoleLabel(role: UserRole | null): string {
  if (role === "dj") {
    return "DJ / Artist";
  }

  if (role === "promoter") {
    return "Promoter";
  }

  if (role === "both") {
    return "Both";
  }

  return "Member";
}

export function canAccessBookings(role: UserRole | null): boolean {
  return role === "dj" || role === "promoter" || role === "both";
}

export function canAccessBookingPlans(role: UserRole | null): boolean {
  return role === "promoter" || role === "both";
}

export function canManageEvents(role: UserRole | null): boolean {
  return role === "promoter" || role === "both";
}

export async function listBookableDjs(): Promise<UserProfile[]> {
  const currentUserId = await getCurrentUserId();

  const { data, error } = await supabase.from("users").select(PROFILE_FIELDS);

  if (error) {
    throw error;
  }

  return ((data ?? []) as UserProfile[])
    .filter(
      (user) =>
        user.user_id !== currentUserId &&
        user.onboarding_complete &&
        Boolean(user.display_name?.trim()) &&
        (user.role === "dj" || user.role === "both"),
    )
    .sort((a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? ""));
}
