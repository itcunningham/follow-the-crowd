import { getDefaultRouteForRole, type UserRole } from "@/lib/user/currentUser";

export function buildProfileHref(
  userId: string,
  options?: { returnTo?: string | null },
): string {
  const base = `/profile/${userId}`;
  const returnTo = options?.returnTo?.trim();

  if (!returnTo) {
    return base;
  }

  const params = new URLSearchParams({
    from: "chat",
    returnTo,
  });

  return `${base}?${params.toString()}`;
}

export function resolveProfileBackNavigation(
  returnTo: string | null | undefined,
  role: UserRole | null,
): { href: string; label: string } {
  const fallbackHref = getDefaultRouteForRole(role);
  const fallbackLabel = role === "dj" ? "Back to Messages" : "Back to Events";
  const trimmed = returnTo?.trim();

  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return { href: fallbackHref, label: fallbackLabel };
  }

  if (trimmed.startsWith("/profile/")) {
    return { href: fallbackHref, label: fallbackLabel };
  }

  return { href: trimmed, label: "Back to chat" };
}

export function buildChatReturnTo(pathname: string, search: string): string {
  const query = search.startsWith("?") ? search.slice(1) : search;

  return query ? `${pathname}?${query}` : pathname;
}
