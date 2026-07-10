"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import DmConversationHeader from "@/app/components/dm/DmConversationHeader";
import MessagesInboxLayout from "@/app/components/dm/MessagesInboxLayout";
import PlannerEventsSubNav from "@/app/components/PlannerEventsSubNav";
import ProfilePageHeader from "@/app/components/profile/ProfilePageHeader";
import { canManageEvents, type UserRole } from "@/lib/user/currentUser";

const NAV_ROLE_CACHE_KEY = "ftc-nav-role";

function readCachedNavRole(): UserRole | null {
  if (typeof window === "undefined") {
    return null;
  }

  const cachedRole = sessionStorage.getItem(NAV_ROLE_CACHE_KEY);

  if (cachedRole === "dj" || cachedRole === "promoter" || cachedRole === "both") {
    return cachedRole;
  }

  return null;
}

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
  showFilterPills = true,
}: {
  count?: number;
  showPlannerStats?: boolean;
  showFilterPills?: boolean;
}) {
  return (
    <>
      {showFilterPills ? (
        <div aria-hidden="true" className="mb-4 flex flex-wrap gap-2">
          <SkeletonBlock className="h-8 w-[4.5rem] rounded-lg" />
          <SkeletonBlock className="h-8 w-[4.75rem] rounded-lg" />
        </div>
      ) : null}
      <ul aria-busy="true" aria-label="Loading events" className="space-y-3">
        {Array.from({ length: count }, (_, index) => (
          <li key={index}>
            <EventListItemSkeleton showPlannerStats={showPlannerStats} />
          </li>
        ))}
      </ul>
    </>
  );
}

function EventListItemSkeleton({ showPlannerStats = false }: { showPlannerStats?: boolean }) {
  return (
    <div className="ftc-card block p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <SkeletonBlock className="h-[5.5rem] w-[4.375rem] shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SkeletonBlock className="h-7 w-3/5 max-w-[12rem]" />
            <SkeletonBlock className="h-5 w-16 rounded-full" />
          </div>
          <SkeletonBlock className="mt-2 h-4 w-4/5 max-w-[15rem]" />
          <SkeletonBlock className="mt-1 h-4 w-1/2 max-w-[8rem]" />
          {showPlannerStats ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <SkeletonBlock className="h-6 w-[4.75rem] rounded-full" />
              <SkeletonBlock className="h-6 w-[4.75rem] rounded-full" />
              <SkeletonBlock className="h-6 w-[5rem] rounded-full" />
              <SkeletonBlock className="h-6 w-[4.75rem] rounded-full" />
            </div>
          ) : null}
        </div>
        <SkeletonBlock className="mt-1 h-5 w-5 shrink-0 rounded-md" />
      </div>
    </div>
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

      <div className="border-b border-ftc-border-subtle bg-ftc-bg/95 px-4 py-3 backdrop-blur-md sm:px-6">
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

export function EventsPageLoadingShell({
  showPlannerStats,
}: {
  showPlannerStats?: boolean;
}) {
  const searchParams = useSearchParams();
  const [cachedRole] = useState<UserRole | null>(() => readCachedNavRole());
  const isPlanner = showPlannerStats ?? canManageEvents(cachedRole);
  const isHistoryTab = searchParams.get("tab") === "history";

  return (
    <div
      className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
    >
      <AppNavigation />
      <header className="ftc-page-header px-4 py-4 sm:px-6 md:pt-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-xl font-semibold text-ftc-text">Events</h1>
          {isPlanner ? (
            <Link
              href="/events?create=event"
              className="shrink-0 ftc-btn-primary px-4 py-2.5 text-sm uppercase tracking-wide"
            >
              Create event
            </Link>
          ) : null}
        </div>
        <PlannerEventsSubNav />
      </header>
      <div className="px-4 py-4 sm:px-6">
        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            href="/events"
            className={`ftc-filter-pill ${!isHistoryTab ? "ftc-filter-pill-active" : ""}`}
          >
            {isPlanner ? "Active" : "Upcoming"}
          </Link>
          <Link
            href="/events?tab=history"
            className={`ftc-filter-pill ${isHistoryTab ? "ftc-filter-pill-active" : ""}`}
          >
            History
          </Link>
        </div>
        <EventListSkeleton showPlannerStats={isPlanner} showFilterPills={false} />
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

function TabPillsSkeleton({ count = 3, className = "mt-4" }: { count?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`flex flex-wrap gap-2 ${className}`}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonBlock key={index} className="h-[1.875rem] w-24 rounded-xl" />
      ))}
    </div>
  );
}

function SectionTabsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="mt-4 flex gap-2 border-b border-ftc-border">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonBlock key={index} className="mb-3 h-5 w-28" />
      ))}
    </div>
  );
}

export function PlannerSentStatusTabsSkeleton() {
  return <TabPillsSkeleton count={3} className="mt-0" />;
}

function DetailGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-1.5">
          <SkeletonBlock className="h-3 w-12" />
          <SkeletonBlock className="h-4 w-24 max-w-full" />
        </div>
      ))}
    </dl>
  );
}

export function ReceivedBookingsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul aria-busy="true" aria-label="Loading received bookings" className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <ReceivedBookingCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

function ReceivedBookingCardSkeleton() {
  return (
    <div className="rounded-2xl border border-ftc-border-subtle bg-ftc-surface p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <SkeletonBlock className="h-5 w-2/5 max-w-[10rem]" />
          <DetailGridSkeleton count={3} />
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
          <SkeletonBlock className="h-6 w-16 rounded-full" />
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
          <SkeletonBlock className="h-8 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function SentBookingsListSkeleton({ count = 2 }: { count?: number }) {
  return (
    <ul aria-busy="true" aria-label="Loading sent bookings" className="mt-4 space-y-4">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <BookingCampaignCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

function BookingCampaignCardSkeleton() {
  return (
    <div className="rounded-2xl border border-ftc-border-subtle bg-ftc-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="mt-1 h-7 w-2/5 max-w-[12rem]" />
          <DetailGridSkeleton count={4} />
        </div>
        <SkeletonBlock className="h-8 w-24 shrink-0 rounded-lg" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonBlock key={index} className="h-14 w-full rounded-xl" />
        ))}
      </div>

      <ul className="mt-4 space-y-2">
        {Array.from({ length: 2 }, (_, index) => (
          <li
            key={index}
            className="flex flex-col gap-3 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="h-3 w-32 max-w-full" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <SkeletonBlock className="h-6 w-16 rounded-full" />
              <SkeletonBlock className="h-8 w-24 rounded-xl" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BookingPlanListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul aria-busy="true" aria-label="Loading booking plans" className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <BookingPlanCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

function BookingPlanCardSkeleton() {
  return (
    <div className="ftc-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="mt-1 h-7 w-2/5 max-w-[12rem]" />
          <DetailGridSkeleton count={5} />
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <SkeletonBlock className="h-8 w-16 rounded-xl" />
          <SkeletonBlock className="h-8 w-28 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use ReceivedBookingsListSkeleton or SentBookingsListSkeleton. */
export function BookingsListSkeleton({ count = 4 }: { count?: number }) {
  return <ReceivedBookingsListSkeleton count={count} />;
}

export type BookingsShellVariant = "dj" | "planner" | "both" | "neutral";
export type BookingsContentVariant = "auto" | "sent-campaigns" | "received-gigs";

function resolveBookingsContentVariant(
  variant: BookingsShellVariant,
  content: BookingsContentVariant,
): "sent-campaigns" | "received-gigs" {
  if (content !== "auto") {
    return content;
  }

  if (variant === "dj") {
    return "received-gigs";
  }

  if (variant === "planner" || variant === "both") {
    return "sent-campaigns";
  }

  return "received-gigs";
}

export function BookingsContentSkeleton({
  content = "auto",
  variant = "neutral",
}: {
  content?: BookingsContentVariant;
  variant?: BookingsShellVariant;
}) {
  const resolvedContent = resolveBookingsContentVariant(variant, content);

  if (resolvedContent === "sent-campaigns") {
    return (
      <>
        <PlannerSentStatusTabsSkeleton />
        <SentBookingsListSkeleton />
      </>
    );
  }

  return <ReceivedBookingsListSkeleton />;
}

export function BookingsPageLoadingShell({
  variant = "neutral",
  content = "auto",
}: {
  variant?: BookingsShellVariant;
  content?: BookingsContentVariant;
}) {
  const showPlannerSubNav = true;
  const showSectionTabs = false;
  const showDjGigsTabs = variant === "dj" || variant === "both" || variant === "neutral";
  const showCreateButton = false;
  const pageTitle = "Gigs";
  const pageSubtitle =
    variant === "dj" || variant === "both" || variant === "neutral"
      ? "Track incoming requests, confirmed gigs, and history."
      : "Gigs are for DJs and artists playing events.";

  return (
    <div
      className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
    >
      <AppNavigation />
      <header className="border-b border-ftc-border-subtle px-4 py-3 sm:px-6 md:pt-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-ftc-text">{pageTitle}</h1>
            <p className="mt-1 text-sm text-ftc-text-muted">{pageSubtitle}</p>
          </div>
          {showCreateButton ? (
            <SkeletonBlock className="h-10 w-[11.5rem] shrink-0 rounded-xl" />
          ) : null}
        </div>
        {showSectionTabs ? <SectionTabsSkeleton count={2} /> : null}
        {showPlannerSubNav ? <PlannerEventsSubNavSkeleton /> : null}
        {showDjGigsTabs ? <GigsTabPillsSkeleton /> : null}
      </header>
      <div className="px-4 py-4 sm:px-6">
        <BookingsContentSkeleton
          content={content}
          variant={variant === "neutral" ? "dj" : variant}
        />
      </div>
    </div>
  );
}

function GigsTabPillsSkeleton() {
  const labels = ["Incoming", "Confirmed", "History"];

  return (
    <div aria-hidden="true" className="mt-4 flex flex-wrap gap-2">
      {labels.map((label, index) => (
        <SkeletonBlock
          key={label}
          className={`h-[1.875rem] rounded-xl ${index === 0 ? "w-[5.75rem]" : index === 1 ? "w-[5.75rem]" : "w-[5rem]"}`}
        />
      ))}
    </div>
  );
}

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
        <BookingPlanListSkeleton count={3} />
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
      <div className="flex-1">
        <NotificationsListSkeleton />
      </div>
    </div>
  );
}

export function NotificationsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul aria-busy="true" aria-label="Loading notifications" className="divide-y divide-ftc-border">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <div className="flex w-full items-start gap-3 px-4 py-4 sm:px-6">
            <SkeletonBlock className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <SkeletonBlock className="h-[18px] w-2/5 max-w-[10rem]" />
                  <SkeletonBlock className="h-3 w-24" />
                </div>
                <SkeletonBlock className="h-3 w-10 shrink-0" />
              </div>
              <SkeletonBlock className="mt-2 h-4 w-full max-w-[18rem]" />
              <SkeletonBlock className="mt-1 h-4 w-4/5 max-w-[14rem]" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function MessagesInboxLoadingShell({
  activeTab = "dm",
}: {
  activeTab?: "dm" | "group";
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <MessagesInboxLayout
      activeTab={activeTab}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onSelectTab={(tab) => {
        router.replace(tab === "group" ? "/dm?tab=group" : "/dm", { scroll: false });
      }}
    >
      <InboxListSkeleton variant={activeTab === "group" ? "group" : "dm"} />
    </MessagesInboxLayout>
  );
}

export function ChatPageLoadingShell({ variant = "dm" }: { variant?: "dm" | "group" }) {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-ftc-bg font-sans text-ftc-text">
      <AppNavigation />
      <div
        className={`mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-hidden ${MOBILE_NAV_OFFSET_CLASS}`}
      >
        <header className="z-10 shrink-0 border-b border-ftc-border-subtle bg-ftc-bg/95 px-3 py-2.5 backdrop-blur-md sm:px-4">
          {variant === "dm" ? (
            <DmConversationHeader
              backHref="/dm"
              loading
              conversationTitle=""
              avatarName=""
              otherUserId={null}
            />
          ) : (
            <GroupChatHeaderSkeleton />
          )}
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
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="mt-2 h-8 w-32" />
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-1">
            <SkeletonBlock className="h-10 w-10 rounded-xl" />
            <SkeletonBlock className="h-10 w-10 rounded-xl" />
          </div>
        </div>
      </header>
      <div className="space-y-5 px-4 pb-6 pt-3 sm:px-6">
        <SkeletonBlock className="h-12 w-full rounded-full" />
        <DiscoverGenreChipsSkeleton />
        <DiscoverSkeleton />
      </div>
    </div>
  );
}

function DiscoverGenreChipsSkeleton() {
  return (
    <div aria-hidden="true" className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
      <div className="flex w-max gap-2 pb-1">
        {Array.from({ length: 5 }, (_, index) => (
          <SkeletonBlock key={index} className="h-10 w-20 shrink-0 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export function DiscoverFeedSkeleton() {
  return (
    <>
      <DiscoverGenreChipsSkeleton />
      <DiscoverSkeleton />
    </>
  );
}

export function ProfilePageLoadingShell({
  isOwnProfile = false,
}: {
  isOwnProfile?: boolean;
}) {
  return (
    <div
      className={`mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
    >
      <AppNavigation />
      <ProfilePageHeader isOwnProfile={isOwnProfile} />
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

function getProfileUserIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/profile\/([^/]+)/);
  const userId = match?.[1];

  if (!userId || userId === "setup") {
    return null;
  }

  return userId;
}

export function AppLoadingShell({
  pathname,
  role,
  currentUserId = null,
  search = "",
}: {
  pathname: string;
  role?: UserRole | null;
  currentUserId?: string | null;
  search?: string;
}) {
  if (pathname === "/events") {
    return <EventsPageLoadingShell showPlannerStats={showPlannerEventsChrome(role)} />;
  }

  if (/^\/events\/[^/]+\/chat\/?$/.test(pathname)) {
    return <ChatPageLoadingShell variant="group" />;
  }

  if (pathname.startsWith("/events/")) {
    return <EventDetailLoadingShell />;
  }

  if (pathname === "/bookings" || pathname.startsWith("/bookings/")) {
    return (
      <BookingsPageLoadingShell
        variant={resolveBookingsShellVariant(role)}
        content={role === "dj" || !role ? "received-gigs" : "auto"}
      />
    );
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
    return <ChatPageLoadingShell variant="dm" />;
  }

  if (pathname === "/discover") {
    return <GenericAppLoadingShell />;
  }

  if (pathname === "/notifications" || pathname.startsWith("/notifications/")) {
    return <NotificationsPageLoadingShell />;
  }

  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    return <ProfilePageLoadingShell isOwnProfile />;
  }

  if (pathname.startsWith("/profile/") && pathname !== "/profile/setup") {
    const profileUserId = getProfileUserIdFromPath(pathname);
    return (
      <ProfilePageLoadingShell
        isOwnProfile={Boolean(profileUserId && currentUserId && profileUserId === currentUserId)}
      />
    );
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
          {variant === "group" ? <GroupInboxRowSkeleton /> : <DmInboxRowSkeleton />}
        </li>
      ))}
    </ul>
  );
}

function DmInboxRowSkeleton() {
  return (
    <div className="flex w-full items-center gap-3 rounded-2xl border border-ftc-border-subtle bg-ftc-surface px-3 py-3 sm:px-4 sm:py-3.5">
      <SkeletonBlock className="h-12 w-12 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <SkeletonBlock className="h-[18px] w-2/5 max-w-[9rem]" />
          <SkeletonBlock className="h-3 w-8 shrink-0" />
        </div>
        <div className="mt-1 flex items-end justify-between gap-2">
          <SkeletonBlock className="h-4 w-4/5 max-w-[14rem]" />
        </div>
      </div>
    </div>
  );
}

function GroupInboxRowSkeleton() {
  return (
    <div className="flex w-full items-center gap-3 rounded-2xl border border-ftc-border-subtle bg-ftc-surface px-3 py-3 sm:px-4 sm:py-3.5">
      <SkeletonBlock className="h-12 w-12 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <SkeletonBlock className="h-[18px] w-2/5 max-w-[9rem]" />
          <SkeletonBlock className="h-3 w-10 shrink-0" />
        </div>
        <SkeletonBlock className="mt-1 h-4 w-3/5 max-w-[12rem]" />
        <div className="mt-1 flex items-end justify-between gap-2">
          <SkeletonBlock className="h-4 w-2/3 max-w-[10rem]" />
        </div>
      </div>
    </div>
  );
}

export function ChatHeaderSkeleton() {
  return <GroupChatHeaderSkeleton />;
}

function ChatBackLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ftc-border-subtle bg-ftc-surface text-ftc-text-secondary"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </a>
  );
}

function GroupChatHeaderSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <ChatBackLink href="/dm" label="Back to messages" />
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <SkeletonBlock className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-32 max-w-[40vw]" />
          <SkeletonBlock className="h-3 w-20 max-w-[30vw]" />
        </div>
      </div>
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
      <section aria-label="This Week">
        <div className="mb-3 flex items-center justify-between gap-3">
          <SkeletonBlock className="h-7 w-24" />
          <SkeletonBlock className="h-4 w-14" />
        </div>
        <article className="overflow-hidden rounded-2xl border border-ftc-border-subtle bg-ftc-surface">
          <SkeletonBlock className="aspect-[16/10] w-full rounded-none" rounded="rounded-none" />
          <div className="p-4">
            <SkeletonBlock className="h-7 w-2/5 max-w-[10rem]" />
            <SkeletonBlock className="mt-2 h-4 w-3/5 max-w-[12rem]" />
            <SkeletonBlock className="mt-1.5 h-4 w-1/3 max-w-[8rem]" />
          </div>
          <div className="border-t border-ftc-border-subtle px-4 pb-4 pt-3">
            <SkeletonBlock className="h-10 w-full rounded-xl" />
          </div>
        </article>
      </section>

      <section aria-label="Upcoming">
        <div className="mb-3 flex items-center justify-between gap-3">
          <SkeletonBlock className="h-7 w-28" />
          <SkeletonBlock className="h-4 w-14" />
        </div>
        <ul className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index}>
              <div className="flex items-center gap-3 rounded-2xl border border-ftc-border-subtle bg-ftc-surface p-3">
                <SkeletonBlock className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <SkeletonBlock className="h-5 w-2/5 max-w-[9rem]" />
                  <SkeletonBlock className="h-4 w-3/5 max-w-[12rem]" />
                  <SkeletonBlock className="h-4 w-1/2 max-w-[8rem]" />
                </div>
                <SkeletonBlock className="h-5 w-5 shrink-0 rounded-md" />
              </div>
            </li>
          ))}
        </ul>
      </section>
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
        <div className="min-w-0 flex-1 pt-1">
          <SkeletonBlock className="h-8 w-2/3 max-w-[12rem]" />
          <SkeletonBlock className="mt-3 h-6 w-20 rounded-full" />
          <SkeletonBlock className="mt-3 h-4 w-1/2 max-w-[10rem]" />
        </div>
      </div>

      <ProfileSectionCardSkeleton titleWidth="w-16" lines={3} />
      <ProfileSectionCardSkeleton titleWidth="w-12" lines={2} />
    </div>
  );
}

function ProfileSectionCardSkeleton({
  titleWidth,
  lines,
}: {
  titleWidth: string;
  lines: number;
}) {
  return (
    <section className="rounded-2xl border border-ftc-border-subtle bg-ftc-surface p-4 sm:p-5">
      <SkeletonBlock className={`h-3 ${titleWidth}`} />
      <div className="mt-3 space-y-2">
        {Array.from({ length: lines }, (_, index) => (
          <SkeletonBlock key={index} className={`h-4 ${index === lines - 1 ? "w-4/5" : "w-full"}`} />
        ))}
      </div>
    </section>
  );
}
