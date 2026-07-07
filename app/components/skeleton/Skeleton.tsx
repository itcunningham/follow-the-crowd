"use client";

import type { ReactNode } from "react";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import type { UserRole } from "@/lib/user/currentUser";

export function SkeletonBlock({
  className = "",
  rounded = "rounded-lg",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`ftc-skeleton ftc-skeleton-shimmer ${rounded} ${className}`}
    />
  );
}

export function SkeletonRow({
  avatarClassName = "h-12 w-12 shrink-0 rounded-full",
  lines = 2,
  className = "",
}: {
  avatarClassName?: string;
  lines?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`flex items-center gap-3 rounded-2xl border border-ftc-border-subtle bg-ftc-surface px-3 py-3 sm:px-4 sm:py-3.5 ${className}`}
    >
      <SkeletonBlock className={avatarClassName} rounded="rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <SkeletonBlock className="h-4 w-2/5 max-w-[9rem]" />
          <SkeletonBlock className="h-3 w-8 shrink-0" />
        </div>
        {lines > 1 ? <SkeletonBlock className="h-3.5 w-4/5 max-w-[14rem]" /> : null}
        {lines > 2 ? <SkeletonBlock className="h-3 w-1/3 max-w-[6rem]" /> : null}
      </div>
    </div>
  );
}

export function SkeletonCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={`ftc-card p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

export function EventListSkeleton({
  count = 3,
  showPlannerStats = false,
}: {
  count?: number;
  showPlannerStats?: boolean;
}) {
  return (
    <ul aria-busy="true" aria-label="Loading events" className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <SkeletonCard className="block">
            <div className="flex items-start gap-4">
              <SkeletonBlock className="h-[5.5rem] w-[4.375rem] shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <SkeletonBlock className="h-5 w-3/5 max-w-[12rem]" />
                  <SkeletonBlock className="h-5 w-16 rounded-full" />
                </div>
                <SkeletonBlock className="h-4 w-4/5 max-w-[15rem]" />
                <SkeletonBlock className="h-4 w-1/2 max-w-[8rem]" />
                {showPlannerStats ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <SkeletonBlock className="h-6 w-16 rounded-full" />
                    <SkeletonBlock className="h-6 w-16 rounded-full" />
                    <SkeletonBlock className="h-6 w-16 rounded-full" />
                    <SkeletonBlock className="h-6 w-16 rounded-full" />
                  </div>
                ) : null}
              </div>
              <SkeletonBlock className="mt-1 h-5 w-5 shrink-0 rounded-md" />
            </div>
          </SkeletonCard>
        </li>
      ))}
    </ul>
  );
}

export function EventDetailLoadingShell() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading event"
      className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
    >
      <AppNavigation />

      <div className="border-b border-ftc-border-subtle bg-ftc-bg/95 px-4 py-3 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <SkeletonBlock className="h-10 w-10 rounded-xl" />
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-10 w-10 rounded-xl" />
            <SkeletonBlock className="h-10 w-16 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="relative aspect-[4/3] max-h-[220px] w-full border-b border-ftc-border-subtle">
        <SkeletonBlock className="h-full w-full rounded-none" rounded="rounded-none" />
      </div>

      <div className="space-y-5 px-4 pb-6 pt-5 sm:px-6">
        <SkeletonBlock className="h-8 w-4/5 max-w-[16rem]" />
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <SkeletonBlock className="h-5 w-5 shrink-0 rounded-md" />
            <SkeletonBlock className="h-4 w-3/4 max-w-[14rem]" />
          </div>
          <div className="flex items-start gap-3">
            <SkeletonBlock className="h-5 w-5 shrink-0 rounded-md" />
            <SkeletonBlock className="h-4 w-2/3 max-w-[12rem]" />
          </div>
        </div>

        <SkeletonCard>
          <SkeletonBlock className="h-5 w-28" />
          <SkeletonBlock className="mt-4 h-4 w-full max-w-[18rem]" />
          <SkeletonBlock className="mt-2 h-4 w-2/3 max-w-[10rem]" />
        </SkeletonCard>

        <SkeletonCard>
          <SkeletonBlock className="h-5 w-24" />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <SkeletonBlock className="h-6 w-20 rounded-full" />
              <SkeletonBlock className="h-4 w-40" />
            </div>
            <SkeletonBlock className="h-9 w-24 rounded-xl" />
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}

/** @deprecated Use EventDetailLoadingShell — guard wraps pages separately. */
export function EventDetailSkeleton() {
  return <EventDetailLoadingShell />;
}

export function EventsPageLoadingShell({ showPlannerStats = false }: { showPlannerStats?: boolean }) {
  return (
    <div
      className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
    >
      <AppNavigation />
      <header className="ftc-page-header px-4 py-4 sm:px-6 md:pt-4">
        <SkeletonBlock className="h-7 w-24" />
        <SkeletonBlock className="mt-2 h-4 w-56 max-w-full" />
        {showPlannerStats ? <PlannerEventsSubNavSkeleton /> : null}
      </header>
      <div className="px-4 py-4 sm:px-6">
        <EventListSkeleton showPlannerStats={showPlannerStats} />
      </div>
    </div>
  );
}

function PlannerEventsSubNavSkeleton() {
  return (
    <div aria-hidden="true" className="mt-4 flex flex-wrap gap-2">
      <SkeletonBlock className="h-8 w-[4.5rem] rounded-lg" />
      <SkeletonBlock className="h-8 w-[6.5rem] rounded-lg" />
      <SkeletonBlock className="h-8 w-[4.75rem] rounded-lg" />
      <SkeletonBlock className="h-8 w-[5.25rem] rounded-lg" />
    </div>
  );
}

function TabPillsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="mt-4 flex flex-wrap gap-2">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonBlock key={index} className="h-8 w-24 rounded-xl" />
      ))}
    </div>
  );
}

function SectionTabsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="mt-4 flex gap-4 border-b border-ftc-border pb-3">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonBlock key={index} className="h-5 w-28" />
      ))}
    </div>
  );
}

export function BookingsListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul aria-busy="true" aria-label="Loading bookings" className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <SkeletonCard>
            <div className="flex items-start justify-between gap-3">
              <SkeletonBlock className="h-5 w-2/5 max-w-[10rem]" />
              <SkeletonBlock className="h-6 w-16 rounded-full" />
            </div>
            <SkeletonBlock className="mt-3 h-4 w-3/5 max-w-[14rem]" />
            <SkeletonBlock className="mt-2 h-4 w-1/2 max-w-[10rem]" />
            <div className="mt-4 flex flex-wrap gap-2">
              <SkeletonBlock className="h-9 w-24 rounded-xl" />
              <SkeletonBlock className="h-9 w-24 rounded-xl" />
            </div>
          </SkeletonCard>
        </li>
      ))}
    </ul>
  );
}

export type BookingsShellVariant = "dj" | "planner" | "both" | "neutral";

export function resolveBookingsShellVariant(role: UserRole | null | undefined): BookingsShellVariant {
  if (role === "dj") {
    return "dj";
  }

  if (role === "promoter") {
    return "planner";
  }

  if (role === "both") {
    return "both";
  }

  return "neutral";
}

export function BookingsPageLoadingShell({
  variant = "neutral",
}: {
  variant?: BookingsShellVariant;
}) {
  const showPlannerSubNav = variant === "planner" || variant === "both";
  const showSectionTabs = variant === "both";
  const showDjGigsTabs = variant === "dj";
  const showPlannerSentTabs = variant === "planner" || variant === "both";

  return (
    <div
      className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
    >
      <AppNavigation />
      <header className="border-b border-ftc-border-subtle px-4 py-3 sm:px-6 md:pt-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <SkeletonBlock className="h-7 w-24" />
            <SkeletonBlock className="mt-2 h-4 w-56 max-w-full" />
          </div>
          {variant !== "dj" ? (
            <SkeletonBlock className="h-10 w-40 shrink-0 rounded-xl" />
          ) : null}
        </div>
        {showSectionTabs ? <SectionTabsSkeleton count={2} /> : null}
        {showDjGigsTabs ? <TabPillsSkeleton count={5} /> : null}
        {showPlannerSentTabs ? <TabPillsSkeleton count={3} /> : null}
        {variant === "neutral" ? <TabPillsSkeleton count={3} /> : null}
        {showPlannerSubNav ? <PlannerEventsSubNavSkeleton /> : null}
      </header>
      <div className="px-4 py-4 sm:px-6">
        <BookingsListSkeleton />
      </div>
    </div>
  );
}

export function BookingPlansPageLoadingShell() {
  return (
    <div
      className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
    >
      <AppNavigation />
      <header className="ftc-page-header px-4 py-4 sm:px-6 md:pt-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SkeletonBlock className="h-7 w-36" />
            <SkeletonBlock className="mt-2 h-4 w-64 max-w-full" />
          </div>
          <SkeletonBlock className="h-10 w-40 shrink-0 rounded-xl" />
        </div>
        <PlannerEventsSubNavSkeleton />
      </header>
      <div className="px-4 py-4 sm:px-6">
        <BookingsListSkeleton count={3} />
      </div>
    </div>
  );
}

export function CalendarPageLoadingShell({
  showPlannerSubNav = false,
}: {
  showPlannerSubNav?: boolean;
}) {
  return (
    <div
      className={`min-h-[100dvh] bg-ftc-bg text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
    >
      <AppNavigation />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 border-b border-ftc-border pb-4">
          <SkeletonBlock className="h-3 w-20" />
          {showPlannerSubNav ? (
            <div className="mt-4">
              <PlannerEventsSubNavSkeleton />
            </div>
          ) : null}
        </div>
        <CalendarGridSkeleton />
      </main>
    </div>
  );
}

function CalendarGridSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading calendar" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <SkeletonBlock className="h-9 w-9 rounded-lg" />
        <SkeletonBlock className="h-5 w-36" />
        <SkeletonBlock className="h-9 w-9 rounded-lg" />
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 35 }, (_, index) => (
          <SkeletonBlock key={index} className="aspect-square w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function NotificationsPageLoadingShell() {
  return (
    <div
      className={`mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
    >
      <AppNavigation />
      <header className="sticky top-0 z-10 border-b border-ftc-border bg-ftc-bg/95 px-4 py-4 backdrop-blur-md sm:px-6 md:top-12">
        <SkeletonBlock className="h-7 w-36" />
        <SkeletonBlock className="mt-2 h-3.5 w-48 max-w-full" />
      </header>
      <div className="flex-1 px-4 py-3 sm:px-6">
        <InboxListSkeleton count={5} />
      </div>
    </div>
  );
}

export function MessagesInboxLoadingShell({
  activeTab = "dm",
}: {
  activeTab?: "dm" | "group";
}) {
  return (
    <div
      className={`mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
    >
      <AppNavigation />
      <header className="sticky top-0 z-10 border-b border-ftc-border-subtle bg-ftc-bg/95 px-4 py-3 backdrop-blur-md sm:px-6 md:top-12">
        <div className="flex items-center justify-between gap-3">
          <SkeletonBlock className="h-7 w-32" />
          <SkeletonBlock className="h-10 w-10 shrink-0 rounded-xl" />
        </div>
        <SkeletonBlock className="mt-3 h-10 w-full rounded-xl" />
        <div className="ftc-tab-pill mt-3 flex gap-1" aria-hidden="true">
          <SkeletonBlock
            className={`h-9 flex-1 rounded-full ${activeTab === "dm" ? "opacity-100" : "opacity-60"}`}
          />
          <SkeletonBlock
            className={`h-9 flex-1 rounded-full ${activeTab === "group" ? "opacity-100" : "opacity-60"}`}
          />
        </div>
      </header>
      <div className="flex-1 px-4 py-3 sm:px-6">
        <InboxListSkeleton variant={activeTab === "group" ? "group" : "dm"} />
      </div>
    </div>
  );
}

export function ChatPageLoadingShell() {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-ftc-bg font-sans text-ftc-text">
      <AppNavigation />
      <div
        className={`mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-hidden ${MOBILE_NAV_OFFSET_CLASS}`}
      >
        <header className="z-10 shrink-0 border-b border-ftc-border-subtle bg-ftc-bg/95 px-3 py-2.5 backdrop-blur-md sm:px-4">
          <ChatHeaderSkeleton />
        </header>
        <div className="flex min-h-0 flex-1 flex-col px-3 py-4 sm:px-4">
          <ChatMessagesSkeleton />
        </div>
      </div>
    </div>
  );
}

export function DiscoverPageLoadingShell() {
  return (
    <div
      className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
    >
      <AppNavigation />
      <header className="px-4 pb-2 pt-4 sm:px-6 md:pt-4">
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="mt-2 h-8 w-32" />
      </header>
      <div className="space-y-5 px-4 pb-6 pt-3 sm:px-6">
        <SkeletonBlock className="h-10 w-full rounded-xl" />
        <DiscoverSkeleton />
      </div>
    </div>
  );
}

export function ProfilePageLoadingShell() {
  return (
    <div
      className={`mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
    >
      <AppNavigation />
      <div className="border-b border-ftc-border-subtle px-4 py-3 sm:px-6">
        <SkeletonBlock className="h-5 w-16" />
      </div>
      <div className="flex-1 px-4 py-6 sm:px-6">
        <ProfileSkeleton />
      </div>
    </div>
  );
}

export function GenericAppLoadingShell() {
  return (
    <div
      className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
    >
      <AppNavigation />
      <div className="px-4 py-6 sm:px-6">
        <SkeletonBlock className="h-6 w-28" />
        <SkeletonBlock className="mt-2 h-4 w-44" />
        <div className="mt-6 space-y-3">
          <SkeletonBlock className="h-16 w-full rounded-xl" />
          <SkeletonBlock className="h-16 w-full rounded-xl" />
          <SkeletonBlock className="h-16 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function getInboxTabFromSearch(search: string): "dm" | "group" {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get("tab") === "group" ? "group" : "dm";
}

function showPlannerEventsChrome(role: UserRole | null | undefined): boolean {
  return role === "promoter" || role === "both";
}

export function AppLoadingShell({
  pathname,
  role,
  search = "",
}: {
  pathname: string;
  role?: UserRole | null;
  search?: string;
}) {
  if (pathname === "/events") {
    return <EventsPageLoadingShell showPlannerStats={showPlannerEventsChrome(role)} />;
  }

  if (/^\/events\/[^/]+\/chat\/?$/.test(pathname)) {
    return <ChatPageLoadingShell />;
  }

  if (pathname.startsWith("/events/")) {
    return <EventDetailLoadingShell />;
  }

  if (pathname === "/bookings" || pathname.startsWith("/bookings/")) {
    return <BookingsPageLoadingShell variant={resolveBookingsShellVariant(role)} />;
  }

  if (pathname === "/booking-plans" || pathname.startsWith("/booking-plans/")) {
    return <BookingPlansPageLoadingShell />;
  }

  if (pathname === "/calendar" || pathname.startsWith("/calendar/")) {
    return <CalendarPageLoadingShell showPlannerSubNav={showPlannerEventsChrome(role)} />;
  }

  if (pathname === "/dm") {
    return <MessagesInboxLoadingShell activeTab={getInboxTabFromSearch(search)} />;
  }

  if (pathname.startsWith("/dm/")) {
    return <ChatPageLoadingShell />;
  }

  if (pathname === "/discover") {
    return <DiscoverPageLoadingShell />;
  }

  if (pathname === "/notifications" || pathname.startsWith("/notifications/")) {
    return <NotificationsPageLoadingShell />;
  }

  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    return <ProfilePageLoadingShell />;
  }

  if (pathname.startsWith("/profile/") && pathname !== "/profile/setup") {
    return <ProfilePageLoadingShell />;
  }

  return <GenericAppLoadingShell />;
}

export function InboxListSkeleton({
  count = 6,
  variant = "dm",
}: {
  count?: number;
  variant?: "dm" | "group";
}) {
  return (
    <ul
      aria-busy="true"
      aria-label={variant === "group" ? "Loading group chats" : "Loading conversations"}
      className="flex flex-col gap-2"
    >
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <SkeletonRow
            avatarClassName={
              variant === "group"
                ? "h-12 w-12 shrink-0 rounded-xl"
                : "h-12 w-12 shrink-0 rounded-full"
            }
            lines={variant === "group" ? 3 : 2}
          />
        </li>
      ))}
    </ul>
  );
}

export function ChatHeaderSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-center gap-2">
      <SkeletonBlock className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-32 max-w-[40vw]" />
          <SkeletonBlock className="h-3 w-24 max-w-[30vw]" />
        </div>
      </div>
      <SkeletonBlock className="h-10 w-10 shrink-0 rounded-xl" />
    </div>
  );
}

export function ChatMessagesSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading messages" className="flex flex-col gap-3 pb-2">
      <div className="flex justify-start">
        <SkeletonBlock className="h-12 w-[68%] max-w-[16rem] rounded-2xl rounded-bl-md" />
      </div>
      <div className="flex justify-end">
        <SkeletonBlock className="h-10 w-[58%] max-w-[14rem] rounded-2xl rounded-br-md" />
      </div>
      <div className="flex justify-start">
        <SkeletonBlock className="h-16 w-[72%] max-w-[18rem] rounded-2xl rounded-bl-md" />
      </div>
      <div className="flex justify-end">
        <SkeletonBlock className="h-9 w-[44%] max-w-[11rem] rounded-2xl rounded-br-md" />
      </div>
      <div className="flex justify-start">
        <SkeletonBlock className="h-11 w-[52%] max-w-[13rem] rounded-2xl rounded-bl-md" />
      </div>
    </div>
  );
}

export function DiscoverSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading discover" className="space-y-5">
      <SkeletonCard>
        <div className="flex items-center gap-4">
          <SkeletonBlock className="h-20 w-20 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <SkeletonBlock className="h-5 w-2/5 max-w-[10rem]" />
            <SkeletonBlock className="h-4 w-3/5 max-w-[12rem]" />
            <SkeletonBlock className="h-9 w-24 rounded-xl" />
          </div>
        </div>
      </SkeletonCard>

      <ul className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index}>
            <div className="flex items-center gap-3 rounded-2xl border border-ftc-border-subtle bg-ftc-surface p-3">
              <SkeletonBlock className="h-14 w-14 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBlock className="h-4 w-2/5 max-w-[9rem]" />
                <SkeletonBlock className="h-3.5 w-3/5 max-w-[12rem]" />
                <SkeletonBlock className="h-3.5 w-1/2 max-w-[8rem]" />
              </div>
              <SkeletonBlock className="h-5 w-5 shrink-0 rounded-md" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading profile"
      className="mx-auto max-w-lg space-y-6"
    >
      <div className="flex items-start gap-4">
        <SkeletonBlock className="h-20 w-20 shrink-0 rounded-full sm:h-24 sm:w-24" />
        <div className="min-w-0 flex-1 space-y-3 pt-1">
          <SkeletonBlock className="h-7 w-2/3 max-w-[12rem]" />
          <SkeletonBlock className="h-6 w-20 rounded-full" />
          <SkeletonBlock className="h-4 w-1/2 max-w-[10rem]" />
        </div>
      </div>

      <SkeletonCard>
        <SkeletonBlock className="h-5 w-16" />
        <SkeletonBlock className="mt-3 h-4 w-full" />
        <SkeletonBlock className="mt-2 h-4 w-5/6" />
      </SkeletonCard>

      <SkeletonCard>
        <SkeletonBlock className="h-5 w-20" />
        <SkeletonBlock className="mt-3 h-4 w-4/5" />
        <SkeletonBlock className="mt-2 h-4 w-2/3" />
      </SkeletonCard>
    </div>
  );
}
