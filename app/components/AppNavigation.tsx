"use client";

import "@/lib/navigationBadgePrefetch";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useNavBadges } from "@/app/components/navigation/NavBadgeProvider";
import type { NavBadgeCounts } from "@/lib/notifications";
import { readSupabaseSessionUserIdSync } from "@/lib/auth/sessionUserId";
import { isMessagesInboxPath } from "@/lib/groupChats";
import {
  canViewEventsSubNav,
  isPlannerEventsAreaPath,
  isStandaloneEventDetailPath,
} from "@/lib/plannerEventsNav";
import {
  formatGigsTabCountAriaCount,
  formatGigsTabCountDisplay,
  shouldRenderGigsTabCount,
} from "@/lib/bookings/gigsTabCountDisplay";
import { useWorkspaceGigsPendingCount } from "@/lib/navigation/useWorkspaceGigsPendingCount";
import {
  getCachedNavMessagesCount,
} from "@/lib/navigationBadgeCache";
import {
  ensureNavMessagesPrefetched,
  getNavigationBadgeCacheVersion,
  subscribeNavigationBadgeListeners,
} from "@/lib/navigationBadgePrefetch";
import {
  readCachedNavigation,
} from "@/lib/navigationRoleCache";
import { PROFILE_SETUP_PATH, SETTINGS_PATH, type UserRole } from "@/lib/user/currentUser";
import { useGuardProfile } from "@/app/components/GuardProfileContext";
import {
  subscribeMobileSoftwareKeyboard,
  syncMobileSoftwareKeyboardDocumentState,
} from "@/lib/navigation/mobileSoftwareKeyboard";

type NavIconKey = "home" | "events" | "gigs" | "messages" | "profile";

type NavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
  badgeKey?: keyof NavBadgeCounts;
  isPrimary: boolean;
  isActive: (pathname: string) => boolean;
  /**
   * Workspace-selector tabs are entry points into a multi-page workspace
   * (isActive spans several distinct hrefs). Tapping one while already on
   * its landing `href` is a no-op; tapping from a nested path in that
   * workspace (event detail, Calendar, DM, Settings, etc.) navigates to
   * `href` — Instagram-style pop-to-root. Events (isPlannerEventsAreaPath),
   * Messages (isMessagesInboxPath), and Profile qualify.
   */
  isWorkspaceSelector?: boolean;
  /** Pending-incoming-gigs count badge (DJ workspace tab only). */
  showGigsPendingCount?: boolean;
};

function getNavItems(currentUserId: string | null, role: UserRole | null): NavItem[] {
  /**
   * One workspace-selector item per role, differing only in label and landing
   * href. DJ-only accounts have no Events tab, so their workspace entry point
   * is Gigs; every other role keeps Events. `isActive` stays the whole-area
   * check for both, so the item highlights across Calendar/Gigs/Event Plans.
   * Nested paths still navigate to `href` on tap; only the landing href no-ops.
   */
  const workspace: NavItem = canViewEventsSubNav(role)
    ? {
        href: "/events",
        label: "Events",
        icon: "events",
        isPrimary: true,
        isActive: (pathname) => isPlannerEventsAreaPath(pathname),
        isWorkspaceSelector: true,
      }
    : {
        href: "/bookings",
        label: "Gigs",
        icon: "gigs",
        isPrimary: true,
        isActive: (pathname) => isPlannerEventsAreaPath(pathname),
        isWorkspaceSelector: true,
        showGigsPendingCount: true,
      };

  const messages: NavItem = {
    href: "/dm",
    label: "Messages",
    icon: "messages",
    badgeKey: "messages",
    isPrimary: true,
    isActive: (pathname) => isMessagesInboxPath(pathname),
    isWorkspaceSelector: true,
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
    isWorkspaceSelector: true,
  };

  return [workspace, messages, profile];
}

export { MOBILE_NAV_OFFSET_CLASS } from "@/lib/design/plannerWorkspaceTokens";

export const MOBILE_NAV_Z_CLASS = "z-50";

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
        className="pointer-events-none absolute -right-1.5 -top-1.5 z-10 h-3.5 min-w-3.5 opacity-0"
      />
    );
  }

  return (
    <span
      aria-label={`${count} unread`}
      className="absolute -right-1.5 -top-1.5 z-10 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-ftc-primary px-0.5 text-[9px] font-bold leading-none text-ftc-bg"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

/**
 * Pending-incoming-gigs count on the DJ workspace nav tab. Same numbers and
 * 99+ cap as the workspace sub-nav Gigs pill and the Gigs Incoming tab (shared
 * gigsTabCountDisplay formatter). Absolutely positioned like the other nav
 * badges, so the count appearing, changing width, or clearing never reflows the
 * tab row; `tabular-nums` keeps 1-, 2- and 3-glyph values the same width.
 */
function GigsNavCountBadge({
  count,
  variant,
}: {
  count: number;
  variant: "desktop" | "mobile";
}) {
  if (!shouldRenderGigsTabCount(count)) {
    return null;
  }

  const positionClass =
    variant === "desktop"
      ? "right-0 top-0 translate-x-1/3 text-[10px]"
      : "-right-2 -top-1.5 text-[9px]";

  return (
    <span
      aria-label={`${formatGigsTabCountAriaCount(count)} incoming gig${count === 1 ? "" : "s"}`}
      className={`pointer-events-none absolute ${positionClass} z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-ftc-primary px-1 font-bold leading-none tabular-nums text-ftc-bg`}
    >
      {formatGigsTabCountDisplay(count)}
    </span>
  );
}

function getBadgeCount(item: NavItem, badgeCounts: NavBadgeCounts): number {
  if (!item.badgeKey) {
    return 0;
  }

  return badgeCounts[item.badgeKey];
}

function MobileNavTab({
  href,
  label,
  icon,
  isActive,
  isWorkspaceSelector,
  badgeCount,
  showBadgeSlot,
  gigsPendingCount,
}: {
  href: string;
  label: string;
  icon: NavIconKey;
  isActive: boolean;
  isWorkspaceSelector: boolean;
  badgeCount: number;
  showBadgeSlot: boolean;
  gigsPendingCount: number | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const activatedThisGestureRef = useRef(false);
  const activeGestureRef = useRef<{
    pointerId: number;
    cancelled: boolean;
  } | null>(null);

  const navigate = useCallback(() => {
    // Pop-to-root only when already on the landing href; nested workspace
    // paths (e.g. /events/[id] after View Event from crew chat) must navigate.
    if (isWorkspaceSelector && isActive && pathname === href) {
      return;
    }

    router.push(href, { scroll: false });
  }, [href, isActive, isWorkspaceSelector, pathname, router]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLAnchorElement>) => {
    if (!event.isPrimary) {
      return;
    }

    activatedThisGestureRef.current = false;
    activeGestureRef.current = {
      pointerId: event.pointerId,
      cancelled: false,
    };
  }, []);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLAnchorElement>) => {
      const gesture = activeGestureRef.current;

      if (!gesture || event.pointerId !== gesture.pointerId || gesture.cancelled) {
        return;
      }

      activeGestureRef.current = null;

      if (event.pointerType === "touch") {
        activatedThisGestureRef.current = true;
        event.preventDefault();
        navigate();
      }
    },
    [navigate],
  );

  const handlePointerCancel = useCallback((event: React.PointerEvent<HTMLAnchorElement>) => {
    const gesture = activeGestureRef.current;

    if (gesture && event.pointerId === gesture.pointerId) {
      gesture.cancelled = true;
      activeGestureRef.current = null;
    }
  }, []);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (activatedThisGestureRef.current) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      navigate();
    },
    [navigate],
  );

  return (
    <Link
      href={href}
      prefetch
      aria-label={label}
      title={label}
      aria-current={isActive ? "page" : undefined}
      className={`${navLinkClassName(isActive, "mobile")} touch-manipulation`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
    >
      <span className="relative inline-flex items-center justify-center">
        <NavTabIcon icon={icon} active={isActive} />
        {gigsPendingCount === null ? (
          <MobileNavBadge count={badgeCount} reserveSpace={showBadgeSlot} />
        ) : (
          <GigsNavCountBadge count={gigsPendingCount} variant="mobile" />
        )}
      </span>
    </Link>
  );
}

export default function AppNavigation() {
  const pathname = usePathname();
  const guardProfile = useGuardProfile();
  const { badgeCounts, reserveBadgeSpace } = useNavBadges();
  const cachedNavigation = readCachedNavigation();
  const role = guardProfile?.role ?? cachedNavigation.role;
  const currentUserId =
    guardProfile?.user_id ?? cachedNavigation.userId ?? readSupabaseSessionUserIdSync();

  const resolvedRole = role;
  const resolvedUserId = currentUserId;
  const navItems = getNavItems(resolvedUserId, resolvedRole);
  const gigsPendingCount = useWorkspaceGigsPendingCount(resolvedUserId, resolvedRole);
  const badgeCacheVersion = useSyncExternalStore(
    subscribeNavigationBadgeListeners,
    getNavigationBadgeCacheVersion,
    () => 0,
  );
  // View Event from crew chat: keep Messages selected on Event Details.
  // Read search from window (not useSearchParams) so static pages like
  // /discover keep building without a Suspense boundary on every nav mount.
  const [eventDetailFromCrewChat, setEventDetailFromCrewChat] = useState(false);

  useEffect(() => {
    if (!isStandaloneEventDetailPath(pathname)) {
      setEventDetailFromCrewChat(false);
      return;
    }

    setEventDetailFromCrewChat(
      new URLSearchParams(window.location.search).get("from") === "crew-chat",
    );
  }, [pathname]);

  function resolveNavItemActive(item: NavItem): boolean {
    if (item.icon === "messages" && eventDetailFromCrewChat) {
      return true;
    }

    return item.isActive(pathname);
  }

  useEffect(() => {
    if (!resolvedRole) {
      return;
    }

    void ensureNavMessagesPrefetched(resolvedUserId, resolvedRole);
  }, [resolvedRole, resolvedUserId]);

  useEffect(() => {
    let frameId = 0;

    const scheduleSync = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        syncMobileSoftwareKeyboardDocumentState();
      });
    };

    scheduleSync();
    const unsubscribe = subscribeMobileSoftwareKeyboard(scheduleSync);

    return () => {
      cancelAnimationFrame(frameId);
      unsubscribe();
      document.documentElement.removeAttribute("data-mobile-keyboard-open");
    };
  }, []);

  const displayMessagesCount = useMemo(() => {
    const cachedCount = getCachedNavMessagesCount(resolvedUserId, resolvedRole);
    if (cachedCount != null) {
      return cachedCount;
    }

    return badgeCounts.messages;
  }, [badgeCacheVersion, badgeCounts.messages, resolvedRole, resolvedUserId]);

  const hasKnownMessagesCount =
    getCachedNavMessagesCount(resolvedUserId, resolvedRole) != null;

  const shouldReserveMessagesBadgeSpace =
    !hasKnownMessagesCount && reserveBadgeSpace;

  return (
    <>
      <nav
        aria-label="Main navigation"
        className="ftc-nav-bar sticky top-0 z-40 hidden border-b md:block"
      >
        <div className="mx-auto flex h-12 max-w-2xl items-center justify-between gap-1 px-4 sm:px-6 md:max-w-5xl">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {navItems.map((item) => {
              const isActive = resolveNavItemActive(item);
              const badgeCount =
                item.badgeKey === "messages"
                  ? displayMessagesCount
                  : getBadgeCount(item, badgeCounts);
              const showBadgeSlot =
                item.badgeKey === "messages"
                  ? shouldReserveMessagesBadgeSpace
                  : Boolean(item.badgeKey) && reserveBadgeSpace;

              return (
                <Link
                  key={item.icon}
                  href={item.href}
                  className={navLinkClassName(isActive, "desktop")}
                  onClick={(event) => {
                    if (item.isWorkspaceSelector && isActive && pathname === item.href) {
                      event.preventDefault();
                    }
                  }}
                >
                  {item.label}
                  {item.showGigsPendingCount ? (
                    <GigsNavCountBadge count={gigsPendingCount} variant="desktop" />
                  ) : (
                    <NavBadge count={badgeCount} reserveSpace={showBadgeSlot} />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <nav
        aria-label="Mobile navigation"
        className={`ftc-nav-bar ftc-mobile-nav-bar fixed inset-x-0 bottom-0 ${MOBILE_NAV_Z_CLASS} border-t md:hidden`}
      >
        <div className="mx-auto flex max-w-2xl items-stretch px-0.5 pb-[env(safe-area-inset-bottom)]">
          {navItems.map((item) => {
            const isActive = resolveNavItemActive(item);
            const badgeCount =
              item.badgeKey === "messages"
                ? displayMessagesCount
                : getBadgeCount(item, badgeCounts);
            const showBadgeSlot =
              item.badgeKey === "messages"
                ? shouldReserveMessagesBadgeSpace
                : Boolean(item.badgeKey) && reserveBadgeSpace;

            return (
              <MobileNavTab
                key={item.icon}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={isActive}
                isWorkspaceSelector={Boolean(item.isWorkspaceSelector)}
                badgeCount={badgeCount}
                showBadgeSlot={showBadgeSlot}
                gigsPendingCount={item.showGigsPendingCount ? gigsPendingCount : null}
              />
            );
          })}
        </div>
      </nav>
    </>
  );
}
