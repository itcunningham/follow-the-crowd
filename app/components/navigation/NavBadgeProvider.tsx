"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useGuardProfile } from "@/app/components/GuardProfileContext";
import { loadNavigationBadgeData } from "@/lib/navigationBadges";
import {
  readNavigationBadgeCache,
  writeNavigationBadgeCache,
  type NavigationBadgeCache,
} from "@/lib/navigationBadgeCache";
import { readCachedNavigation } from "@/lib/navigationRoleCache";
import type { NavBadgeCounts } from "@/lib/notifications";
import { supabase } from "@/lib/supabaseClient";
import type { UserRole } from "@/lib/user/currentUser";

const NAV_BADGE_REFRESH_INTERVAL_MS = 20_000;

type NavBadgeContextValue = {
  badgeCounts: NavBadgeCounts;
  gigsPendingCount: number;
  badgesReady: boolean;
  reserveBadgeSpace: boolean;
};

const NavBadgeContext = createContext<NavBadgeContextValue | null>(null);

function resolveBadgeIdentity(profile: ReturnType<typeof useGuardProfile>): {
  userId: string | null;
  role: UserRole | null;
} {
  const cached = readCachedNavigation();

  return {
    userId: profile?.user_id ?? cached.userId,
    role: profile?.role ?? cached.role,
  };
}

function buildInitialState(userId: string | null, role: UserRole | null): NavBadgeContextValue {
  const cached = readNavigationBadgeCache(userId, role);

  if (!cached) {
    return {
      badgeCounts: { messages: 0, bookings: 0, total: 0 },
      gigsPendingCount: 0,
      badgesReady: false,
      reserveBadgeSpace: Boolean(userId && role),
    };
  }

  return {
    badgeCounts: {
      messages: cached.messages,
      bookings: cached.bookings,
      total: cached.messages + cached.bookings,
    },
    gigsPendingCount: cached.gigsPending,
    badgesReady: true,
    reserveBadgeSpace: false,
  };
}

function toCacheEntry(
  userId: string,
  role: UserRole,
  data: Awaited<ReturnType<typeof loadNavigationBadgeData>>,
): NavigationBadgeCache {
  return {
    userId,
    role,
    messages: data.messages,
    bookings: data.bookings,
    gigsPending: data.gigsPending,
    updatedAt: Date.now(),
  };
}

export function NavBadgeProvider({ children }: { children: ReactNode }) {
  const guardProfile = useGuardProfile();
  const [{ userId, role }, setIdentity] = useState(() => resolveBadgeIdentity(guardProfile));
  const [state, setState] = useState<NavBadgeContextValue>(() =>
    buildInitialState(userId, role),
  );
  const badgeLastFetchedAtRef = useRef(0);
  const badgeRefreshInFlightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const nextIdentity = resolveBadgeIdentity(guardProfile);

    setIdentity((current) =>
      current.userId === nextIdentity.userId && current.role === nextIdentity.role
        ? current
        : nextIdentity,
    );
  }, [guardProfile?.role, guardProfile?.user_id]);

  useEffect(() => {
    setState(buildInitialState(userId, role));
    badgeLastFetchedAtRef.current = 0;
  }, [userId, role]);

  const refreshBadgeCounts = useCallback(
    async (options?: { force?: boolean }) => {
      if (!userId || !role) {
        return;
      }

      if (
        !options?.force &&
        Date.now() - badgeLastFetchedAtRef.current < NAV_BADGE_REFRESH_INTERVAL_MS
      ) {
        return;
      }

      if (badgeRefreshInFlightRef.current) {
        return badgeRefreshInFlightRef.current;
      }

      const refreshPromise = (async () => {
        try {
          const data = await loadNavigationBadgeData(userId, role);

          writeNavigationBadgeCache(toCacheEntry(userId, role, data));
          badgeLastFetchedAtRef.current = Date.now();

          setState({
            badgeCounts: {
              messages: data.messages,
              bookings: data.bookings,
              total: data.total,
            },
            gigsPendingCount: data.gigsPending,
            badgesReady: true,
            reserveBadgeSpace: false,
          });
        } catch (error) {
          console.error("[NavBadgeProvider] Failed to refresh navigation badges:", error);
          setState((current) => ({
            ...current,
            badgesReady: true,
            reserveBadgeSpace: false,
          }));
        }
      })();

      badgeRefreshInFlightRef.current = refreshPromise;

      try {
        await refreshPromise;
      } finally {
        if (badgeRefreshInFlightRef.current === refreshPromise) {
          badgeRefreshInFlightRef.current = null;
        }
      }
    },
    [role, userId],
  );

  useEffect(() => {
    if (!userId || !role) {
      return;
    }

    const hasCachedCounts = Boolean(readNavigationBadgeCache(userId, role));
    void refreshBadgeCounts({ force: !hasCachedCounts });
  }, [userId, role, refreshBadgeCounts]);

  useEffect(() => {
    function handleNavigationRefresh() {
      void refreshBadgeCounts({ force: true });
    }

    window.addEventListener("ftc-notifications-updated", handleNavigationRefresh);
    window.addEventListener("ftc-role-updated", handleNavigationRefresh);
    window.addEventListener("ftc-message-reads-updated", handleNavigationRefresh);

    return () => {
      window.removeEventListener("ftc-notifications-updated", handleNavigationRefresh);
      window.removeEventListener("ftc-role-updated", handleNavigationRefresh);
      window.removeEventListener("ftc-message-reads-updated", handleNavigationRefresh);
    };
  }, [refreshBadgeCounts]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const channel = supabase
      .channel(`nav-notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refreshBadgeCounts({ force: true });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refreshBadgeCounts]);

  return <NavBadgeContext.Provider value={state}>{children}</NavBadgeContext.Provider>;
}

export function useNavBadges(): NavBadgeContextValue {
  const context = useContext(NavBadgeContext);

  if (context) {
    return context;
  }

  const { userId, role } = readCachedNavigation();
  return buildInitialState(userId, role);
}
