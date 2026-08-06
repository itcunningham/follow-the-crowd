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
import {
  notifyBookingRequestsChanged,
  subscribeToBookingRequestChanges,
} from "@/lib/bookings/bookingRequestsSync";
import { isBookingAcceptanceDmSystemMessage, isEventCancellationDmActivityMessage } from "@/lib/dm/dmBookingSystemMessages";
import { isOwnChatMessage } from "@/lib/messageReads";
import { loadNavigationBadgeData } from "@/lib/navigationBadges";
import {
  ensureGigsPendingPrefetched,
  ensureNavMessagesPrefetched,
  ensureNavigationBadgesPrefetched,
  subscribeNavigationBadgeListeners,
} from "@/lib/navigationBadgePrefetch";
import {
  getCachedGigsPendingCount,
  getCachedNavMessagesCount,
  readNavigationBadgeCache,
  resolveNavigationBadgeCache,
  readRuntimeBadgeFetchedAt,
  readRuntimeGigsPendingCount,
  readRuntimeNavBadgeSnapshot,
  writeRuntimeGigsPendingCount,
  writeRuntimeNavBadgeSnapshot,
} from "@/lib/navigationBadgeCache";
import { readCachedNavigation } from "@/lib/navigationRoleCache";
import { canViewGigsSubNav } from "@/lib/plannerEventsNav";
import type { NavBadgeCounts } from "@/lib/notifications";
import { notifyNavigationBadgesRefresh } from "@/lib/notifications";
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

  const cached = resolveNavigationBadgeCache(userId, role);
  const canViewGigs = canViewGigsSubNav(role);
  const gigsFromStore = getCachedGigsPendingCount(userId, role);
  const messagesFromStore = getCachedNavMessagesCount(userId, role);
  const hasIdentity = Boolean(userId && role);
  const hasMessagesCache = messagesFromStore != null;

  if (!cached && !hasMessagesCache) {
    return {
      badgeCounts: { messages: 0, bookings: 0, total: 0 },
      gigsPendingCount: gigsFromStore ?? 0,
      badgesReady: false,
      reserveBadgeSpace: hasIdentity,
      reserveGigsBadgeSpace: Boolean(hasIdentity && canViewGigs && gigsFromStore == null),
    };
  }

  const messagesCount = messagesFromStore ?? cached?.messages ?? 0;
  const bookingsCount = cached?.bookings ?? 0;
  const resolvedGigsPending = gigsFromStore ?? cached?.gigsPending ?? 0;

  if (cached) {
    writeRuntimeGigsPendingCount(cached.userId, cached.role, resolvedGigsPending);
  }

  return {
    badgeCounts: {
      messages: messagesCount,
      bookings: bookingsCount,
      total: messagesCount + bookingsCount,
    },
    gigsPendingCount: resolvedGigsPending,
    badgesReady: hasMessagesCache,
    reserveBadgeSpace: hasIdentity && !hasMessagesCache,
    reserveGigsBadgeSpace: Boolean(hasIdentity && canViewGigs && gigsFromStore == null),
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

export function NavBadgeProvider({ children }: { children: ReactNode }) {
  const guardProfile = useGuardProfile();
  const [{ userId, role }, setIdentity] = useState(() => resolveBadgeIdentity(guardProfile));
  const [state, setState] = useState<NavBadgeContextValue>(() =>
    buildInitialState(userId, role),
  );
  const badgeLastFetchedAtRef = useRef(readRuntimeBadgeFetchedAt());
  const badgeRefreshInFlightRef = useRef<Promise<void> | null>(null);
  const prefetchStartedForRef = useRef<string | null>(null);
  const previousIdentityRef = useRef<{ userId: string | null; role: UserRole | null }>({
    userId,
    role,
  });

  const identityKey = userId && role ? `${userId}:${role}` : null;
  if (identityKey && prefetchStartedForRef.current !== identityKey) {
    prefetchStartedForRef.current = identityKey;
    if (canViewGigsSubNav(role)) {
      void ensureGigsPendingPrefetched(role);
    }
    void ensureNavMessagesPrefetched(userId, role);
    void ensureNavigationBadgesPrefetched(userId, role);
  }

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

      const refreshPromise = ensureNavigationBadgesPrefetched(userId, role, options).then(() => {
        const cached = readNavigationBadgeCache(userId, role);
        const runtime = readRuntimeSnapshot(userId, role);

        if (runtime?.badgesReady) {
          setState(runtime);
          badgeLastFetchedAtRef.current = readRuntimeBadgeFetchedAt();
          return;
        }

        if (cached) {
          badgeLastFetchedAtRef.current = readRuntimeBadgeFetchedAt();
          setState(
            applyBadgeState(userId, role, {
              badgeCounts: {
                messages: cached.messages,
                bookings: cached.bookings,
                total: cached.messages + cached.bookings,
              },
              gigsPendingCount: cached.gigsPending,
              badgesReady: true,
              reserveBadgeSpace: false,
              reserveGigsBadgeSpace: false,
            }),
          );
        }
      });

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

    return subscribeNavigationBadgeListeners(() => {
      const nextState = buildInitialState(userId, role);
      setState(nextState);
      if (nextState.badgesReady) {
        badgeLastFetchedAtRef.current = readRuntimeBadgeFetchedAt();
      }
    });
  }, [userId, role]);

  useEffect(() => {
    if (!userId || !role) {
      return;
    }

    const hasCachedCounts =
      Boolean(readRuntimeSnapshot(userId, role)?.badgesReady) ||
      getCachedNavMessagesCount(userId, role) != null ||
      Boolean(resolveNavigationBadgeCache(userId, role));
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
          // Fan out to mounted views (Crew Chats inbox, Event Details unlock,
          // Gigs, etc.). createNotification only dispatches on the sender's
          // tab — recipients need the same signal when the row lands.
          notifyNavigationBadgesRefresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refreshBadgeCounts]);

  /**
   * App-wide `messages` subscription.
   *
   * The Messages badge is derived from the unread system —
   * `getNavBadgeCounts` -> `getInboxUnreadCounts` -> `getUnreadConversationIds`
   * / `getUnreadEventChatIds` — which reads `messages` and `message_reads`.
   * Until this existed, the badge's only remote trigger was the `notifications`
   * channel above, so a new message moved the badge only if a notification row
   * happened to be written for it. That is a different subsystem with its own
   * failure modes, and it is where DM and Crew Chat diverged: the inbox has had
   * its own `messages` subscription all along (`dm-inbox:messages`) and updates
   * correctly, while anywhere else in the app the badge waited on a
   * notification that Crew Chat does not reliably produce.
   *
   * Subscribing the badge to the same table its count is computed from removes
   * that indirection, so unread state has one source of truth rather than two.
   * RLS scopes the stream to rows this user is allowed to read — the same
   * property the inbox's own unfiltered subscription already relies on. The
   * handler only invalidates; the database stays the source of truth.
   */
  useEffect(() => {
    if (!userId) {
      return;
    }

    const channel = supabase
      .channel(`nav-messages:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const row = payload.new as {
            user_id?: string | null;
            text?: string | null;
          };

          // Your own message never makes a thread unread (`isChatUnread` short-
          // circuits on it), so refreshing for one is a guaranteed no-op round
          // trip. Reusing that helper keeps the two agreeing by construction.
          if (isOwnChatMessage(row.user_id, userId)) {
            return;
          }

          void refreshBadgeCounts({ force: true });

          // Booking outcome system DMs land on `messages` (already in Realtime).
          // `booking_requests` / `events` may not be published yet, and event
          // cancel does not UPDATE accepted booking rows at all — the open DM
          // card reads cancelled state from event artwork. Fan these notices
          // into the shared booking reconciler so DM / Gigs / Event Details
          // refetch without waiting on those publications.
          if (
            typeof row.text === "string" &&
            (isBookingAcceptanceDmSystemMessage(row.text) ||
              isEventCancellationDmActivityMessage(row.text))
          ) {
            notifyBookingRequestsChanged();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refreshBadgeCounts]);

  /**
   * App-wide `booking_requests` subscription.
   *
   * This provider is mounted for every signed-in user on every page, so one
   * subscription here covers the planner's event views, the DJ's Gigs list and
   * counts, the Calendar and any open DM — instead of each screen wiring its own
   * (and the screens that never had one silently going stale). The handler only
   * invalidates and lets each view refetch, so the database stays the source of
   * truth for every account and device.
   */
  useEffect(() => {
    if (!userId) {
      return;
    }

    return subscribeToBookingRequestChanges(userId, notifyBookingRequestsChanged);
  }, [userId]);

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
  const cachedMessages = getCachedNavMessagesCount(userId, role);

  if (
    cachedGigsPending == null &&
    runtimeGigsPending == null &&
    cachedMessages == null
  ) {
    return initialState;
  }

  const messagesCount = cachedMessages ?? initialState.badgeCounts.messages;
  const bookingsCount = initialState.badgeCounts.bookings;

  return {
    ...initialState,
    badgeCounts: {
      messages: messagesCount,
      bookings: bookingsCount,
      total: messagesCount + bookingsCount,
    },
    gigsPendingCount: runtimeGigsPending ?? cachedGigsPending ?? initialState.gigsPendingCount,
    badgesReady: initialState.badgesReady || cachedMessages != null,
    reserveBadgeSpace:
      initialState.reserveBadgeSpace && cachedMessages == null,
    reserveGigsBadgeSpace:
      initialState.reserveGigsBadgeSpace &&
      cachedGigsPending == null &&
      runtimeGigsPending == null,
  };
}
