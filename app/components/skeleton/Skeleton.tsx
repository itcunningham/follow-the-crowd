"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import {
  EventDetailEditHeaderSlot,
  EventDetailOverlayButton,
} from "@/app/components/event-detail/EventDetailLayout";
import {
  HistoryManageButton,
} from "@/app/components/history/HistoryBulkManage";
import DmConversationHeader from "@/app/components/dm/DmConversationHeader";
import MessagesInboxLayout from "@/app/components/dm/MessagesInboxLayout";
import CalendarViewTabs, { type CalendarViewTab } from "@/app/components/CalendarViewTabs";
import {
  PlannerWorkspacePage,
  PlannerWorkspacePageHeader,
  PlannerWorkspaceSecondaryControls,
  PlannerWorkspaceSecondaryControlsPlaceholder,
  PLANNER_WORKSPACE_CONTENT_CLASS,
  PLANNER_WORKSPACE_PAGE_SHELL_CLASS,
  PLANNER_WORKSPACE_SECONDARY_CONTROLS_CLASS,
} from "@/app/components/planner/PlannerWorkspaceLayout";
import ProfilePageHeader from "@/app/components/profile/ProfilePageHeader";
import type { DjGigsListTab } from "@/lib/bookingRequests";
import { buildGigsListHref, resolveGigsListTabParam } from "@/lib/bookings/gigsListNavigation";
import { isPlannerBookingsCreateChromeActive } from "@/lib/bookings/planDeepLink";
import { buildEventsListHref, isCalendarOriginCreateParam, resolveCalendarCreateInitialStep, resolveEventDetailBackHref } from "@/lib/events/eventsListNavigation";
import { useEventEditHeaderState } from "@/lib/events/useEventEditHeaderVisibility";
import type { EventEditHeaderState } from "@/lib/events/useEventEditHeaderVisibility";
import { canManageEvents, type UserRole } from "@/lib/user/currentUser";
import { EVENTS_AREA_SUB_NAV } from "@/lib/plannerEventsNav";
import { readCachedNavRole, readCachedNavigation, resolveIsOwnProfilePath } from "@/lib/navigationRoleCache";

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

function EventDetailBackIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EventDetailContentSkeleton() {
  return (
    <>
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
    </>
  );
}

export function EventDetailLoadingShell({
  backHref,
  onBack,
  editHeaderState = "hidden",
  onEditClick,
}: {
  backHref?: string;
  onBack?: () => void;
  editHeaderState?: EventEditHeaderState;
  onEditClick?: () => void;
} = {}) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading event"
      className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
    >
      <AppNavigation />

      <div className="border-b border-ftc-border-subtle bg-ftc-bg/95 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <EventDetailOverlayButton
            href={backHref}
            onClick={onBack}
            label="Back to events"
          >
            <EventDetailBackIcon />
          </EventDetailOverlayButton>

          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <EventDetailEditHeaderSlot state={editHeaderState} onEditClick={onEditClick} />
          </div>
        </div>
      </div>

      <EventDetailContentSkeleton />
    </div>
  );
}

function EventDetailRouteLoadingShell({
  eventId,
  backHref,
  role,
  currentUserId,
}: {
  eventId: string;
  backHref: string;
  role?: UserRole | null;
  currentUserId?: string | null;
}) {
  const editHeaderState = useEventEditHeaderState({
    eventId,
    role,
    currentUserId,
  });

  return <EventDetailLoadingShell backHref={backHref} editHeaderState={editHeaderState} />;
}

/** @deprecated Use EventDetailLoadingShell — guard wraps pages separately. */
export function EventDetailSkeleton() {
  return <EventDetailLoadingShell />;
}

export function EventsListTabRow({
  children,
  showTrashButton = false,
  trashButtonDisabled = true,
  onTrashClick,
}: {
  children: ReactNode;
  showTrashButton?: boolean;
  trashButtonDisabled?: boolean;
  onTrashClick?: () => void;
}) {
  return (
    <div className={PLANNER_WORKSPACE_SECONDARY_CONTROLS_CLASS}>
      {children}
      {showTrashButton ? (
        <HistoryManageButton
          onClick={onTrashClick ?? (() => undefined)}
          disabled={trashButtonDisabled || !onTrashClick}
        />
      ) : null}
    </div>
  );
}

export function EventsCalendarCreateLoadingShell({
  createStep = "form",
  role: roleProp,
}: {
  createStep?: "form" | "pick-plan";
  role?: UserRole | null;
}) {
  const [cachedRole] = useState<UserRole | null>(() => readCachedNavRole());
  const role = roleProp ?? cachedRole;

  return (
    <div className={PLANNER_WORKSPACE_PAGE_SHELL_CLASS}>
      <AppNavigation />
      <PlannerWorkspacePageHeader
        title="Events"
        initialRole={role}
        activeWorkspaceHref={EVENTS_AREA_SUB_NAV.calendar.href}
      />
      <div className={PLANNER_WORKSPACE_CONTENT_CLASS}>
        <section className="mb-6 ftc-card p-4 sm:p-5">
          <div className="ftc-form-card-header">
            <h2 className="text-lg font-semibold text-ftc-text">Create event</h2>
            <span aria-hidden="true" className="ftc-form-cancel-link opacity-60">
              Cancel
            </span>
          </div>
          {createStep === "pick-plan" ? (
            <BookingPlanListSkeleton count={2} />
          ) : (
            <BookingCreateEventDetailsFormSkeleton />
          )}
        </section>
      </div>
    </div>
  );
}

export function EventsPageLoadingShell({
  role: roleProp,
  createParam: createParamProp,
}: {
  /** @deprecated Pass `role` instead — derived from role when omitted. */
  showPlannerStats?: boolean;
  role?: UserRole | null;
  createParam?: string | null;
}) {
  const searchParams = useSearchParams();
  const [cachedRole] = useState<UserRole | null>(() => readCachedNavRole());
  const role = roleProp ?? cachedRole;
  const createParam = createParamProp ?? searchParams.get("create");

  if (isCalendarOriginCreateParam(createParam)) {
    return (
      <EventsCalendarCreateLoadingShell
        role={role}
        createStep={resolveCalendarCreateInitialStep(createParam)}
      />
    );
  }

  const isPlanner = canManageEvents(role);
  const isHistoryTab = searchParams.get("tab") === "history";

  return (
    <div className={PLANNER_WORKSPACE_PAGE_SHELL_CLASS}>
      <AppNavigation />
      <PlannerWorkspacePageHeader
        title="Events"
        initialRole={role}
        actions={
          isPlanner ? (
            <Link
              href="/events?create=event"
              className="shrink-0 ftc-btn-primary px-4 py-2.5 text-sm uppercase tracking-wide"
            >
              Create event
            </Link>
          ) : null
        }
      />
      <div className={PLANNER_WORKSPACE_CONTENT_CLASS}>
        <EventsListTabRow
          showTrashButton={isPlanner && isHistoryTab}
          trashButtonDisabled
        >
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildEventsListHref("active")}
              className={`ftc-filter-pill ${!isHistoryTab ? "ftc-filter-pill-active" : ""}`}
            >
              {isPlanner ? "Active" : "Upcoming"}
            </Link>
            <Link
              href={buildEventsListHref("history")}
              className={`ftc-filter-pill ${isHistoryTab ? "ftc-filter-pill-active" : ""}`}
            >
              History
            </Link>
          </div>
        </EventsListTabRow>
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

export function SavedEventPlansSectionHeading({ className = "mb-3" }: { className?: string }) {
  return (
    <p
      className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-primary ${className}`}
    >
      Saved Event Plans
    </p>
  );
}

export function SavedEventPlansSectionHeader({
  showTrashButton = true,
  trashButtonDisabled = true,
  onTrashClick,
}: {
  showTrashButton?: boolean;
  trashButtonDisabled?: boolean;
  onTrashClick?: () => void;
}) {
  return (
    <div className={PLANNER_WORKSPACE_SECONDARY_CONTROLS_CLASS}>
      <SavedEventPlansSectionHeading className="mb-0" />
      {showTrashButton ? (
        <HistoryManageButton
          ariaLabel="Delete event plans"
          onClick={onTrashClick ?? (() => undefined)}
          disabled={trashButtonDisabled || !onTrashClick}
        />
      ) : null}
    </div>
  );
}

export function BookingPlanListSkeleton({ count = 2 }: { count?: number }) {
  return (
    <ul aria-busy="true" aria-label="Loading event plans" className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <BookingPlanCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

function BookingPlanDetailGridSkeleton() {
  const fields = [
    { labelWidth: "w-10", valueWidth: "w-32" },
    { labelWidth: "w-11", valueWidth: "w-36" },
    { labelWidth: "w-9", valueWidth: "w-24" },
    { labelWidth: "w-14", valueWidth: "w-28" },
    { labelWidth: "w-9", valueWidth: "w-16" },
  ] as const;

  return (
    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
      {fields.map((field, index) => (
        <div key={index}>
          <SkeletonBlock className={`h-2.5 ${field.labelWidth}`} rounded="rounded-sm" />
          <SkeletonBlock className={`mt-0.5 h-4 ${field.valueWidth} max-w-full`} />
        </div>
      ))}
    </dl>
  );
}

function BookingPlanCardSkeleton() {
  return (
    <div className="ftc-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <SkeletonBlock className="h-[11px] w-[7.25rem]" rounded="rounded-sm" />
          <SkeletonBlock className="mt-1 h-7 w-2/5 max-w-[12rem]" />
          <BookingPlanDetailGridSkeleton />
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <SkeletonBlock className="h-[1.875rem] w-[3.25rem] rounded-xl" />
          <SkeletonBlock className="h-[1.875rem] w-[7.75rem] rounded-xl" />
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

function GigsWorkspaceTabsShell() {
  const searchParams = useSearchParams();
  const activeView = resolveGigsListTabParam(searchParams.get("tab"));
  const tabs: { value: DjGigsListTab; label: string }[] = [
    { value: "pending", label: "Incoming" },
    { value: "accepted", label: "Confirmed" },
    { value: "history", label: "History" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = activeView === tab.value;

        return (
          <Link
            key={tab.value}
            href={buildGigsListHref(tab.value)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              isActive
                ? "border-transparent bg-ftc-primary text-ftc-bg"
                : "border-ftc-border-subtle bg-ftc-bg-elevated text-ftc-text-secondary hover:border-ftc-border-strong"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

function canShowGigsWorkspaceTabs(role: UserRole | null): boolean {
  return role === "dj" || role === "both" || role === null;
}

export function BookingCreateEventDetailsFormSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <div>
        <SkeletonBlock className="h-[11px] w-[4.75rem] rounded-sm" />
        <SkeletonBlock className="mt-1.5 h-[42px] w-full rounded-xl" />
      </div>
      <div>
        <SkeletonBlock className="h-[11px] w-[2.75rem] rounded-sm" />
        <SkeletonBlock className="mt-1.5 h-[42px] w-full rounded-xl" />
      </div>
      <div>
        <SkeletonBlock className="h-[11px] w-[4.5rem] rounded-sm" />
        <SkeletonBlock className="mt-1.5 h-[42px] w-full rounded-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <SkeletonBlock className="h-[11px] w-[4.5rem] rounded-sm" />
          <SkeletonBlock className="mt-1.5 h-[42px] w-full rounded-xl" />
        </div>
        <div>
          <SkeletonBlock className="h-[11px] w-[5.25rem] rounded-sm" />
          <SkeletonBlock className="mt-1.5 h-[42px] w-full rounded-xl" />
        </div>
      </div>
      <div>
        <SkeletonBlock className="h-[11px] w-[2.25rem] rounded-sm" />
        <SkeletonBlock className="mt-1.5 h-[7.5rem] w-full rounded-xl" />
        <div className="mt-1 flex justify-end">
          <SkeletonBlock className="h-3 w-12 rounded-sm" />
        </div>
      </div>
      <SkeletonBlock className="h-[46px] w-full max-w-[15rem] rounded-xl" />
    </div>
  );
}

export function BookingCreateEventDetailsCardSkeleton({
  showBackAction = false,
  onBack,
}: {
  showBackAction?: boolean;
  onBack?: () => void;
}) {
  return (
    <section className="mb-6 ftc-card p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ftc-text-muted">
            Step 1 of 2
          </p>
          <h2 className="mt-1 text-lg font-semibold text-ftc-text">Event details</h2>
          <SkeletonBlock className="mt-1 h-4 w-[10rem] max-w-full rounded-sm" />
        </div>
        {showBackAction && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 py-1 text-xs font-semibold uppercase tracking-wide text-ftc-text-muted transition hover:text-ftc-text-secondary"
          >
            Back
          </button>
        ) : (
          <SkeletonBlock className="mt-0.5 h-4 w-10 shrink-0 rounded-sm" />
        )}
      </div>
      <BookingCreateEventDetailsFormSkeleton />
    </section>
  );
}

export function BookingsPageLoadingShell({
  variant = "neutral",
  plannerBookingCreateOpen = false,
}: {
  variant?: BookingsShellVariant;
  /** @deprecated Content skeletons are no longer shown in the loading shell. */
  content?: BookingsContentVariant;
  plannerBookingCreateOpen?: boolean;
}) {
  const [cachedRole] = useState<UserRole | null>(() => readCachedNavRole());
  const role =
    variant === "planner"
      ? "promoter"
      : variant === "dj" || variant === "both"
        ? variant
        : cachedRole;
  const showGigsTabs = !plannerBookingCreateOpen && canShowGigsWorkspaceTabs(role);
  const workspaceTitle = plannerBookingCreateOpen ? "Event Plans" : "Gigs";

  return (
    <div className={PLANNER_WORKSPACE_PAGE_SHELL_CLASS}>
      <AppNavigation />
      <PlannerWorkspacePageHeader
        title={workspaceTitle}
        initialRole={role}
        activeWorkspaceHref={
          plannerBookingCreateOpen ? EVENTS_AREA_SUB_NAV.bookingPlans.href : undefined
        }
      />
      <div className={PLANNER_WORKSPACE_CONTENT_CLASS}>
        {plannerBookingCreateOpen ? (
          <BookingCreateEventDetailsCardSkeleton />
        ) : showGigsTabs ? (
          <div className={PLANNER_WORKSPACE_SECONDARY_CONTROLS_CLASS}>
            <GigsWorkspaceTabsShell />
          </div>
        ) : null}
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
  const [cachedRole] = useState<UserRole | null>(() => readCachedNavRole());

  return (
    <div className={PLANNER_WORKSPACE_PAGE_SHELL_CLASS}>
      <AppNavigation />
      <PlannerWorkspacePageHeader
        title="Event Plans"
        initialRole={cachedRole}
        actions={
          <Link
            href="/booking-plans"
            className="shrink-0 ftc-btn-primary px-4 py-2.5 text-sm uppercase tracking-wide"
          >
            Create event plan
          </Link>
        }
      />
      <div className={PLANNER_WORKSPACE_CONTENT_CLASS}>
        <SavedEventPlansSectionHeader />
        <BookingPlanListSkeleton />
      </div>
    </div>
  );
}

export function CalendarPageLoadingShell() {
  const [cachedRole] = useState<UserRole | null>(() => readCachedNavRole());
  const [bothCalendarTab, setBothCalendarTab] = useState<CalendarViewTab>("planner");

  return (
    <PlannerWorkspacePage
      title="Calendar"
      initialRole={cachedRole}
      secondaryControls={
        cachedRole === "both" ? (
          <CalendarViewTabs activeTab={bothCalendarTab} onChange={setBothCalendarTab} />
        ) : undefined
      }
      secondaryControlsPlaceholder={cachedRole === "promoter" || cachedRole === "dj"}
    >
      {cachedRole === "both" ? (
        bothCalendarTab === "dj" ? (
          <DjCalendarLoadingCard description="Manage your availability and received bookings." />
        ) : (
          <PlannerCalendarLoadingCard description="Your owned events and sent booking requests by date." />
        )
      ) : cachedRole === "dj" ? (
        <DjCalendarLoadingCard />
      ) : (
        <PlannerCalendarLoadingCard />
      )}
    </PlannerWorkspacePage>
  );
}

function CalendarMonthNavSkeleton() {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      <SkeletonBlock className="h-9 w-9 rounded-lg" />
      <SkeletonBlock className="h-9 min-w-[9.5rem] rounded-lg sm:min-w-[11rem]" />
      <SkeletonBlock className="h-9 w-9 rounded-lg" />
    </div>
  );
}

function PlannerCalendarLegendSkeleton() {
  return (
    <>
      <div
        aria-hidden="true"
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:hidden"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} className="inline-flex items-center gap-1.5">
            <SkeletonBlock className="h-1.5 w-1.5 rounded-full" />
            <SkeletonBlock className="h-3 w-14" />
          </span>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="hidden flex-wrap items-center justify-center gap-2 md:flex"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonBlock key={index} className="h-5 w-[4.5rem] rounded-full" />
        ))}
      </div>
    </>
  );
}

function PlannerCalendarMobileAgendaSkeleton() {
  return (
    <div aria-hidden="true" className="mt-4 md:hidden">
      <div className="-mx-4 flex gap-1 px-4">
        {Array.from({ length: 7 }, (_, index) => (
          <SkeletonBlock
            key={index}
            className="h-[3.75rem] w-[calc((100%-1.5rem)/7)] min-w-[calc((100%-1.5rem)/7)] shrink-0 rounded-xl"
          />
        ))}
      </div>

      <div className="mt-4">
        <SkeletonBlock className="h-5 w-44 max-w-full" />
        <div className="mt-3 flex items-center gap-2">
          <SkeletonBlock className="h-8 min-w-[5.5rem] flex-1 rounded-full" />
          <SkeletonBlock className="h-8 min-w-[5.5rem] flex-1 rounded-full" />
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-ftc-border-subtle bg-ftc-surface/30 px-4 py-8">
        <SkeletonBlock className="mx-auto h-4 w-40 max-w-full" />
      </div>
    </div>
  );
}

function PlannerCalendarDesktopGridSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mt-4 hidden rounded-2xl border border-ftc-border bg-ftc-bg-elevated/40 md:block"
    >
      <div className="grid grid-cols-7 border-b border-ftc-border bg-ftc-bg-elevated/60">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="px-2 py-2.5 md:px-3">
            <SkeletonBlock className="mx-auto h-3 w-8" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 p-2.5 md:gap-3 md:p-3">
        {Array.from({ length: 35 }, (_, index) => (
          <SkeletonBlock
            key={index}
            className="min-h-[6.5rem] w-full rounded-xl lg:min-h-[10.5rem]"
          />
        ))}
      </div>
    </div>
  );
}

export function PlannerCalendarContentSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading calendar" className="contents">
      <div className="relative mt-0 md:mt-4">
        <CalendarMonthNavSkeleton />
      </div>

      <div className="mt-1 md:mt-3">
        <PlannerCalendarLegendSkeleton />
      </div>

      <PlannerCalendarMobileAgendaSkeleton />
      <PlannerCalendarDesktopGridSkeleton />
    </div>
  );
}

function DjCalendarLegendSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-wrap items-center justify-center gap-2"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <SkeletonBlock key={index} className="h-5 w-[5.5rem] rounded-full" />
      ))}
    </div>
  );
}

function DjCalendarGridSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mt-4 rounded-2xl border border-ftc-border bg-ftc-bg-elevated/40"
    >
      <div className="grid grid-cols-7 border-b border-ftc-border bg-ftc-bg-elevated/60">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="px-1 py-2 sm:px-2">
            <SkeletonBlock className="mx-auto h-3 w-8" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5 p-2 sm:gap-2 sm:p-2.5">
        {Array.from({ length: 35 }, (_, index) => (
          <SkeletonBlock
            key={index}
            className="min-h-[4.5rem] w-full rounded-xl sm:min-h-[5.5rem]"
          />
        ))}
      </div>
    </div>
  );
}

export function DjCalendarContentSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading calendar" className="contents">
      <div className="relative mt-4">
        <CalendarMonthNavSkeleton />
      </div>

      <div className="mt-3">
        <DjCalendarLegendSkeleton />
      </div>

      <DjCalendarGridSkeleton />
    </div>
  );
}

export function PlannerCalendarLoadingCard({
  description = "Your events and booking activity by date.",
}: {
  description?: string;
}) {
  return (
    <section className="ftc-card p-4 sm:p-5 md:p-6">
      <div className="hidden md:block">
        <h1 className="text-base font-semibold text-ftc-text">Calendar</h1>
        <p className="mt-1 text-sm text-ftc-text-muted">{description}</p>
      </div>
      <PlannerCalendarContentSkeleton />
    </section>
  );
}

export function DjCalendarLoadingCard({
  description = "Manage your availability and bookings.",
}: {
  description?: string;
}) {
  return (
    <div className="space-y-4">
      <section className="ftc-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ftc-text">Calendar</h2>
            <p className="mt-1 text-sm text-ftc-text-muted">{description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="rounded-lg border border-ftc-border-strong/90 bg-ftc-surface/80 px-2.5 py-1.5 text-[11px] font-semibold text-ftc-text-secondary"
            >
              Select dates
            </span>
          </div>
        </div>
        <DjCalendarContentSkeleton />
        <p className="mt-3 text-xs text-ftc-text-muted">
          Use the menu on each date to set personal availability. Booking badges open the linked
          event or DM.
        </p>
      </section>
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
    const searchParams = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

    return (
      <EventsPageLoadingShell
        role={role ?? readCachedNavRole()}
        createParam={searchParams.get("create")}
      />
    );
  }

  if (/^\/events\/[^/]+\/chat\/?$/.test(pathname)) {
    return <ChatPageLoadingShell variant="group" />;
  }

  if (pathname.startsWith("/events/") && !/\/events\/[^/]+\/chat\/?$/.test(pathname)) {
    const eventId = pathname.match(/^\/events\/([^/]+)/)?.[1] ?? null;
    const searchParams = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const backHref = resolveEventDetailBackHref(searchParams.get("fromTab"), {
      from: searchParams.get("from"),
      tab: searchParams.get("tab"),
      calendarDate: searchParams.get("calendarDate"),
      calendarView: searchParams.get("calendarView"),
      calendarMonth: searchParams.get("calendarMonth"),
    });

    if (eventId) {
      return (
        <EventDetailRouteLoadingShell
          eventId={eventId}
          backHref={backHref}
          role={role}
          currentUserId={currentUserId}
        />
      );
    }

    return <EventDetailLoadingShell backHref={backHref} />;
  }

  if (pathname === "/bookings" || pathname.startsWith("/bookings/")) {
    const plannerBookingCreateOpen = isPlannerBookingsCreateChromeActive({
      locationSearch: search,
    });

    return (
      <BookingsPageLoadingShell
        variant={resolveBookingsShellVariant(role)}
        content={role === "dj" || !role ? "received-gigs" : "auto"}
        plannerBookingCreateOpen={plannerBookingCreateOpen}
      />
    );
  }

  if (pathname === "/booking-plans" || pathname.startsWith("/booking-plans/")) {
    return <BookingPlansPageLoadingShell />;
  }

  if (pathname === "/calendar" || pathname.startsWith("/calendar/")) {
    return <CalendarPageLoadingShell />;
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
        isOwnProfile={resolveIsOwnProfilePath(profileUserId, currentUserId)}
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
