"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getNavBadgeCounts, type NavBadgeCounts } from "@/lib/notifications";
import { hasDjEventInvites } from "@/lib/events";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentUserId, getCurrentUserProfile, type UserRole } from "@/lib/user/currentUser";
const NOTIFICATIONS_PATH = "/notifications";

type NavItem = {
  href: string;
  label: string;
  mobileLabel?: string;
  showIconOnMobile?: boolean;
  showBellIcon?: boolean;
  badgeKey?: keyof NavBadgeCounts;
  isPrimary: boolean;
  isActive: (pathname: string) => boolean;
};

function getNavItems(
  role: UserRole | null,
  currentUserId: string | null,
  showEventsForDj: boolean,
): NavItem[] {
  const eventAi: NavItem = {
    href: "/",
    label: "Event AI",
    isPrimary: role === "promoter" || role === "both",
    isActive: (pathname) => pathname === "/",
  };

  const discover: NavItem = {
    href: "/discover",
    label: "Discover",
    isPrimary: true,
    isActive: (pathname) => pathname === "/discover" || pathname.startsWith("/discover/"),
  };

  const events: NavItem = {
    href: "/events",
    label: "Events",
    isPrimary: true,
    isActive: (pathname) => pathname === "/events" || pathname.startsWith("/events/"),
  };

  const bookingPlans: NavItem = {
    href: "/booking-plans",
    label: "Booking Plans",
    mobileLabel: "Plans",
    isPrimary: true,
    isActive: (pathname) =>
      pathname === "/booking-plans" || pathname.startsWith("/booking-plans/"),
  };

  const bookings: NavItem = {
    href: "/bookings",
    label: "Bookings",
    mobileLabel: "Book",
    badgeKey: "bookings",
    isPrimary: true,
    isActive: (pathname) => pathname === "/bookings" || pathname.startsWith("/bookings/"),
  };

  const messages: NavItem = {
    href: "/dm",
    label: "Messages",
    badgeKey: "messages",
    isPrimary: role === "dj" || role === "both",
    isActive: (pathname) => pathname === "/dm" || pathname.startsWith("/dm/"),
  };

  const notifications: NavItem = {
    href: NOTIFICATIONS_PATH,
    label: "Notifications",
    mobileLabel: "Alerts",
    showBellIcon: true,
    badgeKey: "total",
    isPrimary: true,
    isActive: (pathname) =>
      pathname === NOTIFICATIONS_PATH || pathname.startsWith(`${NOTIFICATIONS_PATH}/`),
  };

  const myProfile: NavItem = {
    href: currentUserId ? `/profile/${currentUserId}` : "/profile/setup",
    label: "My Profile",
    mobileLabel: "Profile",
    showIconOnMobile: true,
    isPrimary: false,
    isActive: (pathname) =>
      currentUserId
        ? pathname === `/profile/${currentUserId}` || pathname.startsWith(`/profile/${currentUserId}/`)
        : pathname === "/profile/setup",
  };

  if (role === "dj") {
    const items = [messages, discover, bookings, myProfile];

    if (showEventsForDj) {
      items.splice(2, 0, events);
    }

    return items;
  }

  if (role === "promoter") {
    return [eventAi, discover, events, bookingPlans, bookings, messages, notifications, myProfile];
  }

  return [eventAi, discover, events, bookingPlans, bookings, messages, notifications, myProfile];
}

export const MOBILE_NAV_OFFSET_CLASS = "pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0";

function navLinkClassName(
  isActive: boolean,
  variant: "desktop" | "mobile",
  isPrimary: boolean,
) {
  if (variant === "desktop") {
    if (isActive) {
      return "relative rounded-lg px-3 py-1.5 text-sm font-semibold text-blue-300 shadow-[0_0_18px_rgba(59,130,246,0.14)] after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-blue-500 after:shadow-[0_0_10px_rgba(59,130,246,0.55)]";
    }

    return isPrimary
      ? "relative rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-300 transition hover:text-blue-400"
      : "relative rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:text-blue-400";
  }

  if (isActive) {
    return "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-semibold text-blue-400";
  }

  return isPrimary
    ? "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-semibold text-zinc-400 transition hover:text-blue-300"
    : "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium text-zinc-600 transition hover:text-blue-300";
}

function ProfileNavIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${active ? "text-blue-400" : "text-zinc-500"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c1.2-3 3.4-4.5 7-4.5s5.8 1.5 7 4.5" strokeLinecap="round" />
    </svg>
  );
}

function BellNavIcon({ active, withDot }: { active: boolean; withDot?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-4 w-4 shrink-0 ${active ? "text-blue-400" : "text-zinc-400"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      {withDot ? <circle cx="18" cy="5" r="2.5" fill="currentColor" stroke="none" /> : null}
    </svg>
  );
}

function NavBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      aria-label={`${count} unread`}
      className="absolute right-0 top-0 z-10 flex h-4 min-w-4 translate-x-1/3 items-center justify-center rounded-full border border-blue-400/50 bg-blue-600 px-1 text-[10px] font-bold leading-none text-white shadow-[0_0_10px_rgba(59,130,246,0.45)]"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function MobileNavBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      aria-label={`${count} unread`}
      className="absolute right-1 top-1 z-10 flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-blue-400/50 bg-blue-600 px-0.5 text-[9px] font-bold leading-none text-white shadow-[0_0_10px_rgba(59,130,246,0.45)]"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

function MobileNotificationsBellLink({
  count,
  active,
}: {
  count: number;
  active: boolean;
}) {
  const className = active
    ? "relative flex h-11 w-11 items-center justify-center rounded-full bg-blue-600/15 text-blue-300 shadow-[0_0_16px_rgba(59,130,246,0.15)]"
    : "relative flex h-11 w-11 items-center justify-center rounded-full bg-[#070708]/95 text-zinc-400 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition hover:text-blue-400";

  return (
    <Link
      href={NOTIFICATIONS_PATH}
      aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      className={className}
    >
      <BellNavIcon active={active} withDot={count > 0} />
      <MobileNavBadge count={count} />
    </Link>
  );
}

function getBadgeCount(item: NavItem, badgeCounts: NavBadgeCounts): number {
  if (!item.badgeKey) {
    return 0;
  }

  return badgeCounts[item.badgeKey];
}

export default function AppNavigation() {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showEventsForDj, setShowEventsForDj] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState<NavBadgeCounts>({
    messages: 0,
    bookings: 0,
    total: 0,
  });

  const loadBadgeCounts = useCallback(async () => {
    try {
      const userId = await getCurrentUserId();
      setCurrentUserId(userId);

      const profile = await getCurrentUserProfile();
      const userRole = profile?.role ?? null;
      setRole(userRole);

      if (userRole === "dj") {
        const invited = await hasDjEventInvites(userId);
        setShowEventsForDj(invited);
      } else {
        setShowEventsForDj(false);
      }

      const counts = await getNavBadgeCounts(userId, userRole);
      setBadgeCounts(counts);
    } catch (error) {
      console.error("[AppNavigation] Failed to load navigation badges:", error);
    }
  }, []);

  useEffect(() => {
    loadBadgeCounts();

    function handleBadgeRefresh() {
      loadBadgeCounts();
    }

    window.addEventListener("ftc-notifications-updated", handleBadgeRefresh);
    window.addEventListener("ftc-role-updated", handleBadgeRefresh);

    return () => {
      window.removeEventListener("ftc-notifications-updated", handleBadgeRefresh);
      window.removeEventListener("ftc-role-updated", handleBadgeRefresh);
    };
  }, [loadBadgeCounts, pathname]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const channel = supabase
      .channel(`nav-notifications:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          loadBadgeCounts();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, loadBadgeCounts]);

  const navItems = getNavItems(role, currentUserId, showEventsForDj);
  const notificationsActive =
    pathname === NOTIFICATIONS_PATH || pathname.startsWith(`${NOTIFICATIONS_PATH}/`);

  return (
    <>
      {!notificationsActive ? (
        <div className="fixed right-3 top-3 z-50 md:hidden">
          <MobileNotificationsBellLink count={badgeCounts.total} active={notificationsActive} />
        </div>
      ) : null}

      <nav
        aria-label="Main navigation"
        className="sticky top-0 z-40 hidden border-b border-zinc-800/80 bg-[#070708]/95 backdrop-blur-md md:block"
      >
        <div className="mx-auto flex h-12 max-w-6xl items-center gap-1 px-4 sm:gap-2 sm:px-6">
          {navItems.map((item) => {
            const isActive = item.isActive(pathname);
            const badgeCount = getBadgeCount(item, badgeCounts);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={navLinkClassName(isActive, "desktop", item.isPrimary)}
              >
                <span className="flex items-center gap-1.5">
                  {item.showBellIcon ? (
                    <BellNavIcon active={isActive} withDot={badgeCount > 0} />
                  ) : null}
                  {item.label}
                </span>
                <NavBadge count={badgeCount} />
              </Link>
            );
          })}
        </div>
      </nav>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800/80 bg-[#070708]/95 backdrop-blur-md md:hidden"
      >
        <div className="mx-auto flex max-w-2xl items-stretch px-1 pb-[env(safe-area-inset-bottom)]">
          {navItems.map((item) => {
            const isActive = item.isActive(pathname);
            const mobileLabel = item.mobileLabel ?? item.label;
            const badgeCount = getBadgeCount(item, badgeCounts);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={navLinkClassName(isActive, "mobile", item.isPrimary)}
              >
                {item.showIconOnMobile ? <ProfileNavIcon active={isActive} /> : null}
                {item.showBellIcon ? <BellNavIcon active={isActive} withDot={badgeCount > 0} /> : null}
                <span className="max-w-full truncate">{mobileLabel}</span>
                <MobileNavBadge count={badgeCount} />
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
