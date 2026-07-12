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
  getCachedGigsPendingCount,
  readNavigationBadgeCache,
  readRuntimeBadgeFetchedAt,
  readRuntimeGigsPendingCount,
  readRuntimeNavBadgeSnapshot,
  writeNavigationBadgeCache,
  writeRuntimeBadgeFetchedAt,
  writeRuntimeGigsPendingCount,
  writeRuntimeNavBadgeSnapshot,
  type NavigationBadgeCache,
} from "@/lib/navigationBadgeCache";
import { readCachedNavigation } from "@/lib/navigationRoleCache";
import { canViewGigsSubNav } from "@/lib/plannerEventsNav";
import type { NavBadgeCounts } from "@/lib/notifications";
import { supabase } from "@/lib/supabaseClient";
import type { UserRole } from "@/lib/user/currentUser";

const NAV_BADGE_REFRESH_INTERVAL_MS = 20_000;

type NavBadgeContextValue = {
  badgeCounts: NavBadgeCounts;
  gigsPendingCount: number;
  badgesReady: boolean;
  reserveBadgeSpace: boolean;
  reserveGigsBadgeSpace: boolean;
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

function readRuntimeSnapshot(
  userId: string | null,
  role: UserRole | null,
): NavBadgeContextValue | null {
  const snapshot = readRuntimeNavBadgeSnapshot(userId, role);

  if (!snapshot) {
    return null;
  }

  return {
    badgeCounts: {
      messages: snapshot.messages,
      bookings: snapshot.bookings,
      total: snapshot.messages + snapshot.bookings,
    },
    gigsPendingCount: snapshot.gigsPending,
    badgesReady: snapshot.badgesReady,
    reserveBadgeSpace: snapshot.reserveBadgeSpace,
    reserveGigsBadgeSpace: snapshot.reserveGigsBadgeSpace,
  };
}

function writeRuntimeSnapshot(
  userId: string,
  role: UserRole,
  state: NavBadgeContextValue,
): void {
  writeRuntimeNavBadgeSnapshot({
    userId,
    role,
    messages: state.badgeCounts.messages,
    bookings: state.badgeCounts.bookings,
    gigsPending: state.gigsPendingCount,
    updatedAt: Date.now(),
    badgesReady: state.badgesReady,
    reserveBadgeSpace: state.reserveBadgeSpace,
    reserveGigsBadgeSpace: state.reserveGigsBadgeSpace,
  });
}

function buildInitialState(userId: string | null, role: UserRole | null): NavBadgeContextValue {
  const runtimeSnapshot = readRuntimeSnapshot(userId, role);

  if (runtimeSnapshot) {
    return runtimeSnapshot;
  }

  const cached = readNavigationBadgeCache(userId, role);
  const canViewGigs = canViewGigsSubNav(role);

  if (!cached) {
    return {
      badgeCounts: { messages: 0, bookings: 0, total: 0 },
      gigsPendingCount: 0,
      badgesReady: false,
      reserveBadgeSpace: Boolean(userId && role),
      reserveGigsBadgeSpace: Boolean(userId && canViewGigs),
    };
  }

  writeRuntimeGigsPendingCount(cached.userId, cached.role, cached.gigsPending);

  return {
    badgeCounts: {
      messages: cached.messages,
      bookings: cached.bookings,
      total: cached.messages + cached.bookings,
    },
    gigsPendingCount: cached.gigsPending,
    badgesReady: true,
    reserveBadgeSpace: false,
    reserveGigsBadgeSpace: false,
  };
}

function applyBadgeState(
  userId: string,
  role: UserRole,
  nextState: NavBadgeContextValue,
): NavBadgeContextValue {
  writeRuntimeSnapshot(userId, role, nextState);
  writeRuntimeGigsPendingCount(userId, role, nextState.gigsPendingCount);
  return nextState;
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
  const badgeLastFetchedAtRef = useRef(readRuntimeBadgeFetchedAt());
  const badgeRefreshInFlightRef = useRef<Promise<void> | null>(null);
  const previousIdentityRef = useRef<{ userId: string | null; role: UserRole | null }>({
    userId,
    role,
  });

  useEffect(() => {
    const nextIdentity = resolveBadgeIdentity(guardProfile);

    setIdentity((current) =>
      current.userId === nextIdentity.userId && current.role === nextIdentity.role
        ? current
        : nextIdentity,
    );
  }, [guardProfile?.role, guardProfile?.user_id]);

  useEffect(() => {
    const previousIdentity = previousIdentityRef.current;

    if (previousIdentity.userId === userId && previousIdentity.role === role) {
      return;
    }

    previousIdentityRef.current = { userId, role };

    if (!userId || !role) {
      setState({
        badgeCounts: { messages: 0, bookings: 0, total: 0 },
        gigsPendingCount: 0,
        badgesReady: false,
        reserveBadgeSpace: false,
        reserveGigsBadgeSpace: false,
      });
      return;
    }

    setState(buildInitialState(userId, role));
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
          const fetchedAt = Date.now();
          badgeLastFetchedAtRef.current = fetchedAt;
          writeRuntimeBadgeFetchedAt(fetchedAt);

          setState(
            applyBadgeState(userId, role, {
              badgeCounts: {
                messages: data.messages,
                bookings: data.bookings,
                total: data.total,
              },
              gigsPendingCount: data.gigsPending,
              badgesReady: true,
              reserveBadgeSpace: false,
              reserveGigsBadgeSpace: false,
            }),
          );
        } catch (error) {
          console.error("[NavBadgeProvider] Failed to refresh navigation badges:", error);
          setState((current) =>
            applyBadgeState(userId, role, {
              ...current,
              badgesReady: true,
              reserveBadgeSpace: false,
              reserveGigsBadgeSpace: false,
            }),
          );
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

    const hasCachedCounts =
      Boolean(readRuntimeSnapshot(userId, role)?.badgesReady) ||
      Boolean(readNavigationBadgeCache(userId, role));
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
  const initialState = buildInitialState(userId, role);
  const cachedGigsPending = getCachedGigsPendingCount(userId, role);
  const runtimeGigsPending = readRuntimeGigsPendingCount(userId, role);

  if (cachedGigsPending == null && runtimeGigsPending == null) {
    return initialState;
  }

  return {
    ...initialState,
    gigsPendingCount: runtimeGigsPending ?? cachedGigsPending ?? initialState.gigsPendingCount,
    badgesReady: initialState.badgesReady || cachedGigsPending != null || runtimeGigsPending != null,
    reserveGigsBadgeSpace:
      initialState.reserveGigsBadgeSpace &&
      cachedGigsPending == null &&
      runtimeGigsPending == null,
  };
}
