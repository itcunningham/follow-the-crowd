const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type UserDisplayNameSource = {
  display_name?: string | null;
  artist_name?: string | null;
  username?: string | null;
};

export function looksLikeUserId(value: string | null | undefined): boolean {
  const trimmed = value?.trim();

  if (!trimmed) {
    return false;
  }

  return UUID_PATTERN.test(trimmed);
}

function pickDisplayField(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed || looksLikeUserId(trimmed)) {
    return null;
  }

  return trimmed;
}

export function resolveUserDisplayName(
  profile?: UserDisplayNameSource | null,
  options?: { fallback?: string },
): string {
  const fallback = options?.fallback ?? "Deleted user";

  return (
    pickDisplayField(profile?.display_name) ??
    pickDisplayField(profile?.artist_name) ??
    pickDisplayField(profile?.username) ??
    fallback
  );
}
