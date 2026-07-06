"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getNavBadgeCounts, type NavBadgeCounts } from "@/lib/notifications";
import { isMessagesInboxPath } from "@/lib/groupChats";
import { isGigsAreaPath, isPlannerEventsAreaPath } from "@/lib/plannerEventsNav";
import { supabase } from "@/lib/supabaseClient";
import {
  getCurrentUserId,
  getCurrentUserProfile,
  PROFILE_SETUP_PATH,
  SETTINGS_PATH,
  type UserRole,
} from "@/lib/user/currentUser";

type NavItem = {
  href: string;
  label: string;
  mobileLabel?: string;
  showIconOnMobile?: boolean;
  badgeKey?: keyof NavBadgeCounts;
  isPrimary: boolean;
  isActive: (pathname: string) => boolean;
};

function getNavItems(role: UserRole, currentUserId: string | null): NavItem[] {
  const home: NavItem = {
    href: "/",
    label: "Home",
    mobileLabel: "Home",
    isPrimary: true,
    isActive: (pathname) => pathname === "/",
  };

  const discover: NavItem = {
    href: "/discover",
    label: "Discover",
    mobileLabel: "Discover",
    isPrimary: true,
    isActive: (pathname) => pathname === "/discover" || pathname.startsWith("/discover/"),
  };

  const events: NavItem = {
    href: "/events",
    label: "Events",
    mobileLabel: "Events",
    isPrimary: true,
    isActive: (pathname) => isPlannerEventsAreaPath(pathname),
  };

  const gigs: NavItem = {
    href: "/bookings",
    label: "Gigs",
    mobileLabel: "Gigs",
    badgeKey: "bookings",
    isPrimary: true,
    isActive: (pathname) => isGigsAreaPath(pathname),
  };

  const messages: NavItem = {
    href: "/dm",
    label: "Messages",
    mobileLabel: "Messages",
    badgeKey: "messages",
    isPrimary: true,
    isActive: (pathname) => isMessagesInboxPath(pathname),
  };

  const profile: NavItem = {
    href: currentUserId ? `/profile/${currentUserId}` : PROFILE_SETUP_PATH,
    label: "Profile",
    mobileLabel: "Profile",
    showIconOnMobile: true,
    isPrimary: true,
    isActive: (pathname) =>
      currentUserId
        ? pathname === `/profile/${currentUserId}` ||
          pathname.startsWith(`/profile/${currentUserId}/`) ||
          pathname === SETTINGS_PATH ||
          pathname.startsWith(`${SETTINGS_PATH}/`)
        : pathname === PROFILE_SETUP_PATH,
  };

  if (role === "dj") {
    return [discover, gigs, messages, profile];
  }

  return [home, discover, events, messages, profile];
}

export const MOBILE_NAV_OFFSET_CLASS = "pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0";

function navLinkClassName(isActive: boolean, variant: "desktop" | "mobile") {
  if (variant === "desktop") {
    if (isActive) {
      return "relative rounded-lg px-2.5 py-1.5 text-sm font-semibold text-ftc-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-ftc-primary";
    }

    return "relative rounded-lg px-2.5 py-1.5 text-sm font-semibold text-ftc-text-secondary transition hover:text-ftc-primary";
  }

  if (isActive) {
    return "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-2 text-[10px] font-semibold text-ftc-primary";
  }

  return "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-2 text-[10px] font-semibold text-ftc-text-secondary transition hover:text-ftc-primary";
}

function ProfileNavIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${active ? "text-ftc-primary" : "text-ftc-text-muted"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c1.2-3 3.4-4.5 7-4.5s5.8 1.5 7 4.5" strokeLinecap="round" />
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
      className="absolute right-0 top-0 z-10 flex h-4 min-w-4 translate-x-1/3 items-center justify-center rounded-full bg-ftc-primary px-1 text-[10px] font-bold leading-none text-ftc-bg"
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
      className="absolute right-0.5 top-0.5 z-10 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-ftc-primary px-0.5 text-[9px] font-bold leading-none text-ftc-bg"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

function getBadgeCount(item: NavItem, badgeCounts: NavBadgeCounts): number {
  if (!item.badgeKey) {
    return 0;
  }

  return badgeCounts[item.badgeKey];
}

function NavSkeleton({ variant }: { variant: "desktop" | "mobile" }) {
  const count = variant === "desktop" ? 5 : 4;

  if (variant === "desktop") {
    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className="h-4 w-14 animate-pulse rounded-md bg-ftc-surface-raised/90"
          />
        ))}
      </>
    );
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="mx-auto flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 py-2"
        >
          <span className="h-5 w-5 animate-pulse rounded-full bg-ftc-surface-raised/90" />
          <span className="h-2 w-10 animate-pulse rounded bg-ftc-surface-raised/90" />
        </span>
      ))}
    </>
  );
}

export default function AppNavigation() {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);
  const [navReady, setNavReady] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [badgeCounts, setBadgeCounts] = useState<NavBadgeCounts>({
    messages: 0,
    bookings: 0,
    total: 0,
  });

  const loadNavigation = useCallback(async () => {
    try {
      const userId = await getCurrentUserId();
      const profile = await getCurrentUserProfile();
      const userRole = profile?.role ?? null;

      setCurrentUserId(userId);
      setRole(userRole);
      setNavReady(Boolean(userRole));

      if (!userRole) {
        return;
      }

      const counts = await getNavBadgeCounts(userId, userRole);
      setBadgeCounts(counts);
    } catch (error) {
      console.error("[AppNavigation] Failed to load navigation:", error);
    }
  }, []);

  const refreshBadgeCounts = useCallback(async () => {
    if (!role) {
      return;
    }

    try {
      const userId = await getCurrentUserId();
      const counts = await getNavBadgeCounts(userId, role);
      setBadgeCounts(counts);
    } catch (error) {
      console.error("[AppNavigation] Failed to refresh navigation badges:", error);
    }
  }, [role]);

  useEffect(() => {
    void loadNavigation();

    function handleNavigationRefresh() {
      void loadNavigation();
    }

    window.addEventListener("ftc-notifications-updated", handleNavigationRefresh);
    window.addEventListener("ftc-role-updated", handleNavigationRefresh);
    window.addEventListener("ftc-message-reads-updated", handleNavigationRefresh);

    return () => {
      window.removeEventListener("ftc-notifications-updated", handleNavigationRefresh);
      window.removeEventListener("ftc-role-updated", handleNavigationRefresh);
      window.removeEventListener("ftc-message-reads-updated", handleNavigationRefresh);
    };
  }, [loadNavigation]);

  useEffect(() => {
    if (!navReady) {
      return;
    }

    void refreshBadgeCounts();
  }, [pathname, navReady, refreshBadgeCounts]);

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
          void refreshBadgeCounts();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, refreshBadgeCounts]);

  const navItems = navReady && role ? getNavItems(role, currentUserId) : [];

  return (
    <>
      <nav
        aria-label="Main navigation"
        className="ftc-nav-bar sticky top-0 z-40 hidden border-b md:block"
      >
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-1 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {!navReady ? (
              <NavSkeleton variant="desktop" />
            ) : (
              navItems.map((item) => {
                const isActive = item.isActive(pathname);
                const badgeCount = getBadgeCount(item, badgeCounts);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={navLinkClassName(isActive, "desktop")}
                  >
                    {item.label}
                    <NavBadge count={badgeCount} />
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </nav>

      <nav
        aria-label="Mobile navigation"
        className="ftc-nav-bar fixed inset-x-0 bottom-0 z-40 border-t md:hidden"
      >
        <div className="mx-auto flex max-w-2xl items-stretch px-0.5 pb-[env(safe-area-inset-bottom)]">
          {!navReady ? (
            <NavSkeleton variant="mobile" />
          ) : (
            navItems.map((item) => {
              const isActive = item.isActive(pathname);
              const mobileLabel = item.mobileLabel ?? item.label;
              const badgeCount = getBadgeCount(item, badgeCounts);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  className={navLinkClassName(isActive, "mobile")}
                >
                  {item.showIconOnMobile ? <ProfileNavIcon active={isActive} /> : null}
                  <span className="max-w-full truncate">{mobileLabel}</span>
                  <MobileNavBadge count={badgeCount} />
                </Link>
              );
            })
          )}
        </div>
      </nav>
    </>
  );
}
