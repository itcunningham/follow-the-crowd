import { supabase } from "@/lib/supabaseClient";
import type { UserRole } from "@/lib/user/currentUser";
import { getInboxUnreadCounts } from "@/lib/inboxUnread";

export type NotificationType = "message" | "booking_request" | "booking_update";

export type Notification = {
  id: string;
  created_at: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
};

export type NavBadgeCounts = {
  messages: number;
  bookings: number;
  total: number;
};

const NOTIFICATION_PREVIEW_MAX_LENGTH = 120;

/**
 * Collapses newlines/whitespace and truncates so a long message can't produce
 * a huge lock-screen push body. Reused by every message-type notification.
 */
export function formatNotificationPreview(
  text: string,
  maxLength: number = NOTIFICATION_PREVIEW_MAX_LENGTH,
): string {
  const collapsed = text.replace(/\s+/g, " ").trim();

  if (collapsed.length <= maxLength) {
    return collapsed;
  }

  return `${collapsed.slice(0, maxLength - 1).trimEnd()}…`;
}

/**
 * "<event name> at <venue>" for push bodies -- venue can be an empty string
 * (planner left it blank), and "<event> at " reads as broken copy. Falls
 * back to the event name alone rather than showing an empty/awkward venue.
 */
export function formatEventVenueLine(eventName: string, venue: string): string {
  const trimmedVenue = venue.trim();
  return trimmedVenue ? `${eventName} at ${trimmedVenue}` : eventName;
}

export function notifyNavigationBadgesRefresh(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ftc-notifications-updated"));
  }
}

const IS_DEV = process.env.NODE_ENV === "development";

export type NotificationCreateContext = {
  type: NotificationType;
  recipientUserId: string;
  link: string | null;
  title: string;
};

export class NotificationCreateError extends Error {
  readonly type: NotificationType;
  readonly recipientUserId: string;
  readonly link: string | null;
  readonly code?: string;

  constructor(message: string, context: Omit<NotificationCreateContext, "title"> & { code?: string }) {
    super(message);
    this.name = "NotificationCreateError";
    this.type = context.type;
    this.recipientUserId = context.recipientUserId;
    this.link = context.link;
    this.code = context.code;
  }
}

function logNotificationCreateFailure(
  error: { message?: string; code?: string; details?: string; hint?: string },
  context: NotificationCreateContext,
): void {
  const payload = {
    type: context.type,
    recipientUserId: context.recipientUserId,
    link: context.link,
    title: context.title,
    code: error.code ?? null,
    message: error.message ?? "Unknown notification error",
  };

  if (IS_DEV) {
    console.error("[notifications] create_notification failed:", {
      ...payload,
      details: error.details ?? null,
      hint: error.hint ?? null,
    });
    return;
  }

  console.error("[notifications] create_notification failed:", payload);
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string | null,
  link: string | null,
  reactionId?: string | null,
): Promise<string> {
  const context: NotificationCreateContext = {
    type,
    recipientUserId: userId,
    link,
    title,
  };

  const { data, error } = await supabase.rpc("create_notification", {
    p_user_id: userId,
    p_type: type,
    p_title: title,
    p_body: body,
    p_link: link,
    // Always send p_reaction_id (null for non-reactions). Omitting it makes
    // Postgres fail when both the legacy 5-arg and 6-arg overloads exist.
    p_reaction_id: reactionId ?? null,
  });

  if (error) {
    logNotificationCreateFailure(error, context);
    throw new NotificationCreateError(error.message ?? "Failed to create notification", {
      type,
      recipientUserId: userId,
      link,
      code: error.code,
    });
  }

  if (typeof data !== "string" || !data.trim()) {
    const missingIdMessage =
      "create_notification completed without a notification id. Run scripts/fixCreateNotification.sql in Supabase.";
    logNotificationCreateFailure({ message: missingIdMessage }, context);
    throw new NotificationCreateError(missingIdMessage, {
      type,
      recipientUserId: userId,
      link,
    });
  }

  notifyNavigationBadgesRefresh();
  return data;
}

export function getNotificationCreateErrorMessage(error: unknown): string {
  if (error instanceof NotificationCreateError) {
    if (error.message.includes("Could not choose the best candidate function")) {
      return "Notification setup needs an update. Run scripts/fixCreateNotification.sql in the Supabase SQL Editor, then try again.";
    }

    if (error.message.includes("Not allowed to create booking_update notification")) {
      return "The planner could not be notified about this booking update. Run scripts/fixCreateNotification.sql in the Supabase SQL Editor, then try again.";
    }

    if (error.message.includes("Not allowed to create booking_request notification")) {
      return "The DJ could not be notified about this booking request. Run scripts/fixCreateNotification.sql in the Supabase SQL Editor, then try again.";
    }

    return error.message;
  }

  if (error && typeof error === "object") {
    const supabaseError = error as { message?: string };

    if (supabaseError.message?.includes("Could not choose the best candidate function")) {
      return "Notification setup needs an update. Run scripts/fixCreateNotification.sql in the Supabase SQL Editor, then try again.";
    }

    if (supabaseError.message?.includes("Not allowed to create booking_update notification")) {
      return "The planner could not be notified about this booking update. Run scripts/fixCreateNotification.sql in the Supabase SQL Editor, then try again.";
    }

    if (supabaseError.message) {
      return supabaseError.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Failed to create notification";
}

export async function getUnreadNotifications(
  userId: string,
  types?: NotificationType[],
): Promise<Notification[]> {
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("read", false);

  if (types && types.length > 0) {
    query = query.in("type", types);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error(
      "[notifications] Supabase error loading unread notifications for",
      userId,
      error,
    );
    return [];
  }

  const notifications = (data ?? []) as Notification[];

  console.log(
    "[notifications] Unread notifications for",
    userId,
    notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      read: notification.read,
      link: notification.link,
    })),
  );

  return notifications;
}

export async function getUnreadNotificationCount(
  userId: string,
  types?: NotificationType[],
): Promise<number> {
  const notifications = await getUnreadNotifications(userId, types);
  return notifications.length;
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[notifications] Failed to load notifications for", userId, error);
    return [];
  }

  return (data ?? []) as Notification[];
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("read", false);

  if (error) {
    console.error("[notifications] Failed to mark notification read:", notificationId, error);
    return;
  }

  notifyNavigationBadgesRefresh();
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) {
    console.error("[notifications] Failed to mark all notifications read for", userId, error);
    return;
  }

  notifyNavigationBadgesRefresh();
}

export async function getTotalUnreadCount(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("read", false);

  if (error) {
    console.error("[notifications] Failed to load total unread count for", userId, error);
    return 0;
  }

  return data?.length ?? 0;
}

// Both types are always relevant to whoever owns the row: booking_request's
// recipient is always the DJ, booking_update goes to whichever party the
// action affects. getUnreadNotifications already scopes to this user's own
// rows, so querying both for every role finds nothing for the type a given
// role never receives -- it was never a role distinction worth making. A
// prior version skipped this query entirely for role === "dj" (nothing in
// the DJ nav bar reads badgeCounts.bookings, so it looked like a safe no-op),
// which silently zeroed a DJ's unread booking_request/booking_update count --
// invisible in the old DJ-only nav-badge use, but wrong the moment
// badgeCounts.total started feeding the OS Home Screen badge too, since a DJ
// getting a new booking request is exactly the case that badge must reflect.
export async function getNavBadgeCounts(
  userId: string,
  role: UserRole | null,
): Promise<NavBadgeCounts> {
  const bookingTypes: NotificationType[] = ["booking_request", "booking_update"];

  const [inboxUnread, bookingNotifications] = await Promise.all([
    getInboxUnreadCounts(userId, role),
    getUnreadNotifications(userId, bookingTypes),
  ]);

  const counts: NavBadgeCounts = {
    messages: inboxUnread.total,
    bookings: bookingNotifications.length,
    total: inboxUnread.total + bookingNotifications.length,
  };

  if (process.env.NODE_ENV !== "production") {
    console.log("[notifications] Message badge count for", userId, counts.messages);
    console.log("[notifications] Bookings badge count for", userId, counts.bookings);
  }

  return counts;
}

export async function markNotificationsReadForLink(
  userId: string,
  link: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("link", link)
    .eq("read", false)
    .select("id");

  if (error) {
    console.error("Failed to mark notifications read for link:", error);
    return;
  }

  // Inbox unread sync marks already-read DM links every refresh. Notifying on
  // zero-row updates re-fired ftc-notifications-updated → /dm hard-reloaded
  // Crew Chats → unread sync again (skeleton ↔ empty flicker).
  if ((data?.length ?? 0) === 0) {
    return;
  }

  notifyNavigationBadgesRefresh();
}

export async function markNotificationsReadByType(
  userId: string,
  types: NotificationType[],
): Promise<void> {
  if (types.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .in("type", types)
    .eq("read", false);

  if (error) {
    console.error("Failed to mark notifications read by type:", error);
    return;
  }

  notifyNavigationBadgesRefresh();
}
