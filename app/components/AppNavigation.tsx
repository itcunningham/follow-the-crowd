"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useNavBadges } from "@/app/components/navigation/NavBadgeProvider";
import type { NavBadgeCounts } from "@/lib/notifications";
import { isMessagesInboxPath } from "@/lib/groupChats";
import { isGigsAreaPath, isPlannerEventsAreaPath } from "@/lib/plannerEventsNav";
import {
  cacheNavigationRole,
  readCachedNavigation,
} from "@/lib/navigationRoleCache";
import {
  getCurrentUserId,
  getCurrentUserProfile,
  PROFILE_SETUP_PATH,
  SETTINGS_PATH,
  type UserRole,
} from "@/lib/user/currentUser";
import { useGuardProfile } from "@/app/components/GuardProfileContext";

type NavIconKey = "home" | "events" | "gigs" | "messages" | "profile";

type NavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
  badgeKey?: keyof NavBadgeCounts;
  isPrimary: boolean;
  isActive: (pathname: string) => boolean;
};

function getNavItems(role: UserRole, currentUserId: string | null): NavItem[] {
  const events: NavItem = {
    href: "/events",
    label: "Events",
    icon: "events",
    isPrimary: true,
    isActive: (pathname) => isPlannerEventsAreaPath(pathname),
  };

  const gigs: NavItem = {
    href: "/bookings",
    label: "Gigs",
    icon: "gigs",
    badgeKey: "bookings",
    isPrimary: true,
    isActive: (pathname) => isGigsAreaPath(pathname),
  };

  const messages: NavItem = {
    href: "/dm",
    label: "Messages",
    icon: "messages",
    badgeKey: "messages",
    isPrimary: true,
    isActive: (pathname) => isMessagesInboxPath(pathname),
  };

  const profile: NavItem = {
    href: currentUserId ? `/profile/${currentUserId}` : PROFILE_SETUP_PATH,
    label: "Profile",
    icon: "profile",
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
    return [gigs, messages, profile];
  }

  return [events, messages, profile];
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
    return "relative flex min-h-11 min-w-11 flex-1 items-center justify-center rounded-lg text-ftc-primary after:absolute after:bottom-1.5 after:h-0.5 after:w-5 after:rounded-full after:bg-ftc-primary";
  }

  return "relative flex min-h-11 min-w-11 flex-1 items-center justify-center rounded-lg text-ftc-text-muted transition hover:text-ftc-primary";
}

function NavTabIcon({ icon, active }: { icon: NavIconKey; active: boolean }) {
  const className = `h-6 w-6 ${active ? "text-ftc-primary" : "currentColor"}`;

  switch (icon) {
    case "home":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m3 10 9-7 9 7" />
          <path d="M5 10v10h14V10" />
        </svg>
      );
    case "gigs":
    case "events":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "messages":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 2 2 0 0 1-1.8 1.1h-3.7l-3 3v-3H8a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" />
        </svg>
      );
    case "profile":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 19.5c1.2-3 3.4-4.5 7-4.5s5.8 1.5 7 4.5" />
        </svg>
      );
  }
}

function NavBadge({ count, reserveSpace }: { count: number; reserveSpace?: boolean }) {
  if (count <= 0) {
    if (!reserveSpace) {
      return null;
    }

    return (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 z-10 h-4 min-w-4 translate-x-1/3 opacity-0"
      />
    );
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

function MobileNavBadge({ count, reserveSpace }: { count: number; reserveSpace?: boolean }) {
  if (count <= 0) {
    if (!reserveSpace) {
      return null;
    }

    return (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-0.5 top-0.5 z-10 h-3.5 min-w-3.5 opacity-0"
      />
    );
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

export default function AppNavigation() {
  const pathname = usePathname();
  const guardProfile = useGuardProfile();
  const { badgeCounts, reserveBadgeSpace } = useNavBadges();
  const [cachedNavigation] = useState(readCachedNavigation);
  const [role, setRole] = useState<UserRole | null>(
    () => guardProfile?.role ?? cachedNavigation.role,
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    () => guardProfile?.user_id ?? cachedNavigation.userId,
  );

  const loadNavigation = useCallback(async () => {
    try {
      const [userId, profile] = await Promise.all([
        getCurrentUserId(),
        getCurrentUserProfile(),
      ]);
      const userRole = profile?.role ?? null;

      setCurrentUserId(userId);
      setRole(userRole);

      if (!userRole) {
        return;
      }

      cacheNavigationRole(userRole, userId);
    } catch (error) {
      console.error("[AppNavigation] Failed to load navigation:", error);
    }
  }, []);

  useEffect(() => {
    if (guardProfile?.role) {
      setRole(guardProfile.role);
    }

    if (guardProfile?.user_id) {
      setCurrentUserId(guardProfile.user_id);
    }
  }, [guardProfile?.role, guardProfile?.user_id]);

  useEffect(() => {
    const hasGuardProfile = Boolean(guardProfile?.role && guardProfile.user_id);

    if (!hasGuardProfile) {
      void loadNavigation();
    }
  }, [guardProfile?.role, guardProfile?.user_id, loadNavigation]);

  const effectiveRole = role ?? guardProfile?.role ?? cachedNavigation.role ?? "both";
  const effectiveUserId = currentUserId ?? guardProfile?.user_id ?? cachedNavigation.userId;
  const navItems = effectiveRole ? getNavItems(effectiveRole, effectiveUserId) : [];

  return (
    <>
      <nav
        aria-label="Main navigation"
        className="ftc-nav-bar sticky top-0 z-40 hidden border-b md:block"
      >
        <div className="mx-auto flex h-12 max-w-2xl items-center justify-between gap-1 px-4 sm:px-6 md:max-w-5xl">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {navItems.map((item) => {
              const isActive = item.isActive(pathname);
              const badgeCount = getBadgeCount(item, badgeCounts);
              const showBadgeSlot = Boolean(item.badgeKey) && reserveBadgeSpace;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navLinkClassName(isActive, "desktop")}
                >
                  {item.label}
                  <NavBadge count={badgeCount} reserveSpace={showBadgeSlot} />
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <nav
        aria-label="Mobile navigation"
        className="ftc-nav-bar fixed inset-x-0 bottom-0 z-40 border-t md:hidden"
      >
        <div className="mx-auto flex max-w-2xl items-stretch px-0.5 pb-[env(safe-area-inset-bottom)]">
          {navItems.map((item) => {
            const isActive = item.isActive(pathname);
            const badgeCount = getBadgeCount(item, badgeCounts);
            const showBadgeSlot = Boolean(item.badgeKey) && reserveBadgeSpace;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                title={item.label}
                className={navLinkClassName(isActive, "mobile")}
              >
                <NavTabIcon icon={item.icon} active={isActive} />
                <MobileNavBadge count={badgeCount} reserveSpace={showBadgeSlot} />
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
