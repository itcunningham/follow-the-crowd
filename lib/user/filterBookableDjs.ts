import type { UserProfile } from "@/lib/user/currentUser";

export function filterBookableDjsBySearchQuery(
  djs: UserProfile[],
  query: string,
): UserProfile[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return djs;
  }

  return djs.filter((dj) => {
    const haystack = [
      dj.display_name ?? "",
      dj.genre ?? "",
      dj.location ?? "",
      dj.user_id,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}
