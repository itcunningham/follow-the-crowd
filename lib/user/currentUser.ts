import { supabase } from "@/lib/supabaseClient";

export const CURRENT_USER_ID = "demo-user";
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

export function getDefaultRouteForRole(role: UserRole): string {
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

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("users")
    .select(PROFILE_FIELDS)
    .eq("user_id", CURRENT_USER_ID)
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
  const { error } = await supabase.from("users").upsert(
    {
      user_id: CURRENT_USER_ID,
      role,
      onboarding_complete: true,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
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
  const payload: Record<string, string> = {
    user_id: CURRENT_USER_ID,
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
    payload.avatar_url = options.avatarUrl?.trim() ?? "";
  }

  const { error } = await supabase.from("users").upsert(payload, { onConflict: "user_id" });

  if (error) {
    throw error;
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
  const { data, error } = await supabase.from("users").select(PROFILE_FIELDS);

  if (error) {
    throw error;
  }

  const users = ((data ?? []) as UserProfile[]).filter(
    (user) =>
      user.user_id !== CURRENT_USER_ID &&
      user.onboarding_complete &&
      Boolean(user.display_name?.trim()),
  );

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

export async function listBookableDjs(): Promise<UserProfile[]> {
  const { data, error } = await supabase.from("users").select(PROFILE_FIELDS);

  if (error) {
    throw error;
  }

  return ((data ?? []) as UserProfile[])
    .filter(
      (user) =>
        user.user_id !== CURRENT_USER_ID &&
        user.onboarding_complete &&
        Boolean(user.display_name?.trim()) &&
        (user.role === "dj" || user.role === "both"),
    )
    .sort((a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? ""));
}
