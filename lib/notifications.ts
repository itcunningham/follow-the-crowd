import { supabase } from "@/lib/supabaseClient";
import type { UserRole } from "@/lib/user/currentUser";

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

export function notifyNavigationBadgesRefresh(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ftc-notifications-updated"));
  }
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string | null,
  link: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("create_notification", {
    p_user_id: userId,
    p_type: type,
    p_title: title,
    p_body: body,
    p_link: link,
  });

  if (error) {
    console.error("Failed to create notification:", error);
    return;
  }

  notifyNavigationBadgesRefresh();
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

export async function getNavBadgeCounts(
  userId: string,
  role: UserRole | null,
): Promise<NavBadgeCounts> {
  const messageTypes: NotificationType[] = ["message", "booking_request"];
  const bookingTypes: NotificationType[] = ["booking_update"];

  if (role !== "dj") {
    bookingTypes.unshift("booking_request");
  }

  const [messageNotifications, bookingNotifications, totalUnread] = await Promise.all([
    getUnreadNotifications(userId, messageTypes),
    role === "dj" ? Promise.resolve([] as Notification[]) : getUnreadNotifications(userId, bookingTypes),
    getTotalUnreadCount(userId),
  ]);

  const counts: NavBadgeCounts = {
    messages: messageNotifications.length,
    bookings: bookingNotifications.length,
    total: totalUnread,
  };

  console.log("[notifications] Message badge count for", userId, counts.messages);
  console.log("[notifications] Bookings badge count for", userId, counts.bookings);

  return counts;
}

export async function markNotificationsReadForLink(
  userId: string,
  link: string,
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("link", link)
    .eq("read", false);

  if (error) {
    console.error("Failed to mark notifications read for link:", error);
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
