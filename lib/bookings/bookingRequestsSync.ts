import { supabase } from "@/lib/supabaseClient";
import { notifyNavigationBadgesRefresh } from "@/lib/notifications";

/**
 * Single reconciliation point for `booking_requests` status changes.
 *
 * Before this existed, a status change (accept / decline / cancel / rate
 * proposal) only fired the `ftc-notifications-updated` window event. That event
 * refreshes views that are *currently mounted*, which is why accepting from the
 * DM left the gig under Incoming: the Gigs list is unmounted while the user is
 * in the DM, so nothing dropped its module-scoped snapshot cache, and the next
 * mount re-read the stale one. A full page load was the only thing that cleared
 * it.
 *
 * Caches register an invalidator here instead of the notifier importing them
 * directly — `gigsListSnapshotPrefetch` imports `bookingRequests`, so a direct
 * import would close an initialisation cycle back through this module. It also
 * means a new cache can participate without editing this file.
 */
type BookingRequestsChangeListener = () => void;

const listeners = new Set<BookingRequestsChangeListener>();

export function registerBookingRequestsChangeListener(
  listener: BookingRequestsChangeListener,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Invalidate every registered booking cache, then let mounted views refetch.
 *
 * Call this from both sides so local mutations and realtime events reconcile
 * through exactly one path: the acting client calls it after its own write, and
 * the shared subscription below calls it for changes made by anyone else.
 */
export function notifyBookingRequestsChanged(): void {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (listenerError) {
      console.error("[bookings] booking change listener failed:", listenerError);
    }
  }

  notifyNavigationBadgesRefresh();
}

export function clearBookingRequestsChangeListenersForTests(): void {
  listeners.clear();
}

/**
 * App-wide subscription to this user's `booking_requests` rows.
 *
 * Two registrations are required because PostgREST realtime filters match a
 * single column: a booking is visible to the planner via `sender_id` and to the
 * DJ via `recipient_id`, and a "both" account can be either side. Without the
 * sender-side registration the planner would never hear that a DJ accepted.
 *
 * `event: "*"` covers INSERT (new request) and UPDATE (status change) alike, and
 * the handler is deliberately payload-agnostic: it invalidates and lets each
 * view refetch from the database rather than trying to patch a row into local
 * state from the payload. That keeps the database the source of truth for every
 * account, and means correctness does not depend on which columns Realtime
 * chooses to include in an UPDATE payload.
 *
 * Requires `booking_requests` to be in the `supabase_realtime` publication —
 * see scripts/setupBookingRequestsRealtime.sql. Without that the channel
 * subscribes successfully but never receives an event.
 */
export function subscribeToBookingRequestChanges(
  userId: string,
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel(`booking-requests:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "booking_requests",
        filter: `recipient_id=eq.${userId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "booking_requests",
        filter: `sender_id=eq.${userId}`,
      },
      onChange,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
