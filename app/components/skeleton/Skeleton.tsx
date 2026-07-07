import type { ReactNode } from "react";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";

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

export function EventDetailSkeleton() {
  return (
    <OnboardingGuard>
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
    </OnboardingGuard>
  );
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
