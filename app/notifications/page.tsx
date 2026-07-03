"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import { supabase } from "@/lib/supabaseClient";
import {
  getNotifications,
  markNotificationRead,
  notifyNavigationBadgesRefresh,
  type Notification,
} from "@/lib/notifications";
import { getCurrentUserId } from "@/lib/user/currentUser";

function formatNotificationTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  if (diffHours < 24 && date.toDateString() === now.toDateString()) {
    return `${diffHours}h ago`;
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleString("en-AU", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getNotificationTypeLabel(type: Notification["type"]) {
  switch (type) {
    case "message":
      return "Message";
    case "booking_request":
      return "Booking request";
    case "booking_update":
      return "Booking update";
    default:
      return "Notification";
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setError(null);

    try {
      const userId = await getCurrentUserId();
      setCurrentUserId(userId);
      const rows = await getNotifications(userId);
      setNotifications(rows);
    } catch (loadError) {
      console.error("Failed to load notifications:", loadError);
      setError(loadError instanceof Error ? loadError.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    function handleRefresh() {
      loadNotifications();
    }

    window.addEventListener("ftc-notifications-updated", handleRefresh);

    return () => {
      window.removeEventListener("ftc-notifications-updated", handleRefresh);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const channel = supabase
      .channel(`notifications:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          loadNotifications();
          notifyNavigationBadgesRefresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, loadNotifications]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  async function handleNotificationClick(notification: Notification) {
    if (openingId) {
      return;
    }

    setOpeningId(notification.id);

    try {
      if (!notification.read) {
        await markNotificationRead(notification.id);
        setNotifications((prev) =>
          prev.map((row) =>
            row.id === notification.id ? { ...row, read: true } : row,
          ),
        );
      }

      if (notification.link) {
        router.push(notification.link);
      }
    } catch (clickError) {
      console.error("Failed to open notification:", clickError);
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <OnboardingGuard>
      <div
        className={`mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col bg-[#070708] font-sans text-zinc-100 ${MOBILE_NAV_OFFSET_CLASS}`}
      >
        <AppNavigation />
        <header className="sticky top-0 z-10 border-b border-zinc-800/80 bg-[#070708]/95 px-4 py-4 backdrop-blur-md sm:px-6 md:top-12">
          <div>
            <h1 className="text-xl font-semibold text-zinc-50">Notifications</h1>
            <p className="mt-0.5 text-xs text-zinc-500">
              {unreadCount > 0
                ? `${unreadCount} unread`
                : "Messages, booking requests, and updates"}
            </p>
          </div>
        </header>

        <div className="flex-1">
          {loading ? (
            <p className="px-4 py-6 text-sm text-zinc-500 sm:px-6">Loading notifications...</p>
          ) : error ? (
            <p className="px-4 py-6 text-sm text-red-400 sm:px-6">{error}</p>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/80">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-6 w-6 text-zinc-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <path
                    d="M12 3a5 5 0 0 0-5 5v2.2c0 .7-.2 1.4-.6 2L5 14.5h14l-1.4-2.3a4 4 0 0 1-.6-2V8a5 5 0 0 0-5-5Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M10 18a2 2 0 0 0 4 0" strokeLinecap="round" />
                </svg>
              </div>
              <p className="mt-4 text-base font-semibold text-zinc-200">You&apos;re all caught up.</p>
              <p className="mt-2 max-w-xs text-sm text-zinc-500">
                New messages and booking updates will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800/80">
              {notifications.map((notification) => {
                const isUnread = !notification.read;

                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      disabled={openingId === notification.id}
                      className={`flex w-full items-start gap-3 px-4 py-4 text-left transition sm:px-6 ${
                        isUnread
                          ? "bg-blue-600/10 hover:bg-blue-600/15"
                          : "hover:bg-zinc-900/70"
                      } disabled:cursor-wait disabled:opacity-70`}
                    >
                      <div className="mt-1.5 shrink-0">
                        {isUnread ? (
                          <span
                            aria-hidden="true"
                            className="block h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.55)]"
                          />
                        ) : (
                          <span aria-hidden="true" className="block h-2.5 w-2.5 rounded-full bg-transparent" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              className={`truncate text-[15px] ${
                                isUnread ? "font-semibold text-zinc-50" : "font-medium text-zinc-200"
                              }`}
                            >
                              {notification.title}
                            </p>
                            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-blue-400/80">
                              {getNotificationTypeLabel(notification.type)}
                            </p>
                          </div>
                          <time
                            dateTime={notification.created_at}
                            className="shrink-0 text-xs text-zinc-500"
                          >
                            {formatNotificationTime(notification.created_at)}
                          </time>
                        </div>

                        {notification.body ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-400">
                            {notification.body}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </OnboardingGuard>
  );
}
