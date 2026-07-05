"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import NotificationsBellLink from "@/app/components/NotificationsBellLink";
import DiscoverFeaturedProfileCard from "@/app/components/discover/DiscoverFeaturedProfileCard";
import DiscoverGenreChips, {
  type DiscoverGenreFilter,
} from "@/app/components/discover/DiscoverGenreChips";
import DiscoverProfileListRow from "@/app/components/discover/DiscoverProfileListRow";
import DiscoverSearchBar from "@/app/components/discover/DiscoverSearchBar";
import DiscoverSectionHeader from "@/app/components/discover/DiscoverSectionHeader";
import { getNavBadgeCounts } from "@/lib/notifications";
import { startDm } from "@/lib/startDm";
import {
  getCurrentUserId,
  getCurrentUserProfile,
  listDiscoverUsers,
  type UserProfile,
} from "@/lib/user/currentUser";

function matchesGenreFilter(user: UserProfile, filter: DiscoverGenreFilter): boolean {
  if (filter === "All") {
    return true;
  }

  const genre = user.genre?.trim().toLowerCase() ?? "";
  return genre.includes(filter.toLowerCase());
}

function matchesSearchQuery(user: UserProfile, query: string): boolean {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  const haystack = [
    user.display_name,
    user.bio,
    user.genre,
    user.location,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

export default function DiscoverPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messagingUserId, setMessagingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState<DiscoverGenreFilter>("All");
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    async function loadDiscoverUsers() {
      setLoading(true);
      setError(null);

      try {
        const profile = await getCurrentUserProfile();

        if (!profile?.role) {
          setUsers([]);
          setLoading(false);
          return;
        }

        const discoverUsers = await listDiscoverUsers(profile.role);
        setUsers(discoverUsers);

        const userId = await getCurrentUserId();
        const counts = await getNavBadgeCounts(userId, profile.role);
        setNotificationCount(counts.total);
      } catch (loadError) {
        console.error("Failed to load discover users:", loadError);
        setError(loadError instanceof Error ? loadError.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    }

    void loadDiscoverUsers();
  }, []);

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) => matchesSearchQuery(user, searchQuery) && matchesGenreFilter(user, genreFilter),
      ),
    [users, searchQuery, genreFilter],
  );

  const featuredUser = filteredUsers[0] ?? null;
  const upcomingUsers = filteredUsers.slice(1);

  async function handleMessageUser(targetUserId: string) {
    setMessagingUserId(targetUserId);
    setError(null);

    try {
      const currentUserId = await getCurrentUserId();
      const conversationId = await startDm(currentUserId, targetUserId);
      router.push(`/dm/${conversationId}`);
    } catch (messageError) {
      console.error("startDm failed from /discover:", messageError);
      setError(messageError instanceof Error ? messageError.message : "Failed to start message");
      setMessagingUserId(null);
    }
  }

  return (
    <OnboardingGuard>
      <div
        className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
      >
        <AppNavigation />

        <header className="px-4 pb-2 pt-4 sm:px-6 md:pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ftc-text-muted">
                Melbourne
              </p>
              <h1 className="mt-1 text-[2rem] font-bold leading-none tracking-tight text-ftc-text sm:text-[2.125rem]">
                Discover
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-2 pt-1">
              <button
                type="button"
                aria-label="Filters"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-ftc-border-subtle bg-ftc-surface text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-[18px] w-[18px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                >
                  <path d="M4 7h16" />
                  <path d="M7 12h10" />
                  <path d="M10 17h4" />
                </svg>
              </button>
              <NotificationsBellLink count={notificationCount} />
            </div>
          </div>
        </header>

        <div className="space-y-5 px-4 pb-6 pt-3 sm:px-6">
          <DiscoverSearchBar value={searchQuery} onChange={setSearchQuery} />
          <DiscoverGenreChips active={genreFilter} onChange={setGenreFilter} />

          {loading ? (
            <p className="pt-2 text-sm text-ftc-text-muted">Loading...</p>
          ) : error ? (
            <p className="pt-2 text-sm text-red-400">{error}</p>
          ) : filteredUsers.length === 0 ? (
            <p className="pt-2 text-sm text-ftc-text-muted">
              {users.length === 0 ? "No profiles to discover yet." : "No matches for this search."}
            </p>
          ) : (
            <>
              <section aria-label="This Week">
                <DiscoverSectionHeader title="This Week" />
                {featuredUser ? (
                  <DiscoverFeaturedProfileCard
                    user={featuredUser}
                    messaging={messagingUserId === featuredUser.user_id}
                    onMessage={() => handleMessageUser(featuredUser.user_id)}
                  />
                ) : null}
              </section>

              {upcomingUsers.length > 0 ? (
                <section aria-label="Upcoming">
                  <DiscoverSectionHeader title="Upcoming" />
                  <ul className="space-y-2.5">
                    {upcomingUsers.map((user) => (
                      <DiscoverProfileListRow key={user.user_id} user={user} />
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </OnboardingGuard>
  );
}
