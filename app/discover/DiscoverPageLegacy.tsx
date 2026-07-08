"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import { DiscoverSkeleton } from "@/app/components/skeleton/Skeleton";
import NotificationsBellLink from "@/app/components/NotificationsBellLink";
import DiscoverFeaturedProfileCard from "@/app/components/discover/DiscoverFeaturedProfileCard";
import DiscoverGenreChips, {
  type DiscoverGenreFilter,
} from "@/app/components/discover/DiscoverGenreChips";
import DiscoverProfileListRow from "@/app/components/discover/DiscoverProfileListRow";
import DiscoverSearchBar from "@/app/components/discover/DiscoverSearchBar";
import DiscoverSectionHeader from "@/app/components/discover/DiscoverSectionHeader";
import { getTotalUnreadCount } from "@/lib/notifications";
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

const DISCOVER_USERS_CACHE_KEY = "ftc-discover-users-v1";

function readDiscoverUsersCache(): UserProfile[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(DISCOVER_USERS_CACHE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;

    return Array.isArray(parsed) ? (parsed as UserProfile[]) : [];
  } catch (cacheError) {
    console.error("[discover] Failed to read users cache:", cacheError);
    return [];
  }
}

function writeDiscoverUsersCache(users: UserProfile[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(DISCOVER_USERS_CACHE_KEY, JSON.stringify(users));
  } catch (cacheError) {
    console.error("[discover] Failed to write users cache:", cacheError);
  }
}

export default function DiscoverPageLegacy() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messagingUserId, setMessagingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState<DiscoverGenreFilter>("All");
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const cachedUsers = readDiscoverUsersCache();

    if (cachedUsers.length > 0) {
      setUsers(cachedUsers);
      setLoading(false);
    }

    async function loadDiscoverUsers() {
      if (cachedUsers.length === 0) {
        setLoading(true);
      }

      setError(null);

      try {
        const profile = await getCurrentUserProfile();

        if (!profile?.role) {
          setUsers([]);
          setLoading(false);
          return;
        }

        const [discoverUsers, userId] = await Promise.all([
          listDiscoverUsers(profile.role),
          getCurrentUserId(),
        ]);

        setUsers(discoverUsers);
        writeDiscoverUsersCache(discoverUsers);

        void getTotalUnreadCount(userId).then(setNotificationCount).catch((countError) => {
          console.error("Failed to load discover notification count:", countError);
        });
      } catch (loadError) {
        console.error("Failed to load discover users:", loadError);
        setError(loadError instanceof Error ? loadError.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    }

    void loadDiscoverUsers();
  }, []);

  useEffect(() => {
    function handleNotificationsUpdated() {
      void getCurrentUserId()
        .then((userId) => getTotalUnreadCount(userId))
        .then(setNotificationCount)
        .catch((countError) => {
          console.error("Failed to refresh discover notification count:", countError);
        });
    }

    window.addEventListener("ftc-notifications-updated", handleNotificationsUpdated);

    return () => {
      window.removeEventListener("ftc-notifications-updated", handleNotificationsUpdated);
    };
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
      router.push(`/dm/${conversationId}?from=discover`);
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
            <DiscoverSkeleton />
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
