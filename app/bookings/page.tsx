"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import PlannerEventsSubNav from "@/app/components/PlannerEventsSubNav";
import DjAvailabilityManager from "@/app/components/DjAvailabilityManager";
import DjBookingAvailabilityBadge from "@/app/components/DjBookingAvailabilityBadge";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import { BookingDateField, BookingSetTimeRangeField } from "@/app/components/BookingDateTimeFields";
import { BookingRateField } from "@/app/components/BookingRateField";
import {
  filterBookingGroups,
  formatBookingStatusLabel,
  getBookingCampaignStats,
  groupSentBookingRequests,
  listReceivedBookingRequests,
  listSentBookingRequests,
  logBookingsLoadError,
  sendBookingRequestsToDjs,
  type BookingRequest,
  type BookingRequestInput,
  type BookingRequestStatus,
  type BookingStatusFilter,
  type SentBookingGroup,
} from "@/lib/bookingRequests";
import {
  bookingPlanToRequestInput,
  getBookingPlanById,
  listBookingPlans,
  type BookingPlan,
} from "@/lib/bookingPlans";
import { formatRateDisplay } from "@/lib/bookingRate";
import {
  getPlannerDjAvailabilityHints,
  type DjPlannerAvailabilityHint,
} from "@/lib/djAvailability";
import {
  canAccessBookings,
  getCurrentUserId,
  getBookingRecipientProfilesByIds,
  getCurrentUserProfile,
  getRoleLabel,
  listBookableDjs,
  type BookingRecipientProfile,
  type UserProfile,
  type UserRole,
} from "@/lib/user/currentUser";
import { markNotificationsReadByType } from "@/lib/notifications";

const emptyForm: BookingRequestInput = {
  eventName: "",
  venue: "",
  eventDate: "",
  setTime: "",
  fee: "",
  notes: "",
};

type CreateStep = "source" | "pick-plan" | "details" | "select-djs";

function getCreateStepMeta(step: CreateStep): { label: string; title: string } {
  switch (step) {
    case "source":
      return { label: "Start", title: "Create booking request" };
    case "pick-plan":
      return { label: "Plan", title: "Choose a saved plan" };
    case "details":
      return { label: "1 of 2", title: "Booking details" };
    case "select-djs":
      return { label: "2 of 2", title: "Select DJs" };
  }
}

function getBookingsLoadErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const supabaseError = error as {
      message?: string;
      code?: string;
    };

    if (supabaseError.code === "42P01" || supabaseError.code === "PGRST205") {
      return "Bookings table is not set up in Supabase yet. Run scripts/setupBookingRequests.sql.";
    }

    if (supabaseError.code === "42501") {
      return "Bookings table exists but anon SELECT is blocked. Run scripts/setupBookingRequests.sql.";
    }

    if (supabaseError.message) {
      return supabaseError.message;
    }
  }

  return error instanceof Error ? error.message : "Failed to load bookings";
}

function formatSentDate(timestamp: string) {
  return new Date(timestamp).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_FILTERS: { value: BookingStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
];

type BookingsSectionTab = "sent" | "received";

type DjGigsFilter = Exclude<BookingStatusFilter, "all">;

type DjGigsView = DjGigsFilter | "calendar";

function canCreateBookings(role: UserRole | null): boolean {
  return role === "promoter" || role === "both";
}

function canViewSentBookings(role: UserRole | null): boolean {
  return role === "promoter" || role === "both";
}

function canViewReceivedBookings(role: UserRole | null): boolean {
  return role === "dj" || role === "both";
}

function getDefaultSectionTab(role: UserRole | null): BookingsSectionTab {
  if (role === "dj") {
    return "received";
  }

  return "sent";
}

function getBookingsSubtitle(role: UserRole | null): string {
  if (role === "dj") {
    return "Manage your availability and bookings.";
  }

  if (role === "both") {
    return "Track sent campaigns, review incoming requests, and open private DMs.";
  }

  return "Track DJ responses, create booking requests, and open private DMs.";
}

function getBookingsPageTitle(role: UserRole | null): string {
  return role === "dj" ? "Gigs" : "Bookings";
}

function filterReceivedBookingsByStatus(
  bookings: BookingRequest[],
  filter: DjGigsFilter,
): BookingRequest[] {
  return bookings.filter((booking) => booking.status === filter);
}

export default function BookingsPage() {
  const router = useRouter();
  const handledPlanIdRef = useRef<string | null>(null);
  const handledCreateParamsRef = useRef<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [sentGroups, setSentGroups] = useState<SentBookingGroup[]>([]);
  const [receivedBookings, setReceivedBookings] = useState<BookingRequest[]>([]);
  const [sectionTab, setSectionTab] = useState<BookingsSectionTab>("sent");
  const [djGigsView, setDjGigsView] = useState<DjGigsView>("pending");
  const [djAvailabilityHints, setDjAvailabilityHints] = useState<
    Map<string, DjPlannerAvailabilityHint>
  >(new Map());
  const [recipientProfiles, setRecipientProfiles] = useState<
    Map<string, BookingRecipientProfile>
  >(new Map());
  const [statusFilter, setStatusFilter] = useState<BookingStatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<CreateStep>("source");
  const [form, setForm] = useState<BookingRequestInput>(emptyForm);
  const [bookingPlans, setBookingPlans] = useState<BookingPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [djs, setDjs] = useState<UserProfile[]>([]);
  const [loadingDjs, setLoadingDjs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDjIds, setSelectedDjIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [failureDetails, setFailureDetails] = useState<string[]>([]);
  const [eventDateOverride, setEventDateOverride] = useState<string | null>(null);

  const filteredGroups = useMemo(
    () => filterBookingGroups(sentGroups, statusFilter),
    [sentGroups, statusFilter],
  );

  const filteredDjs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return djs;
    }

    return djs.filter((dj) => {
      const haystack = [
        dj.display_name ?? "",
        dj.genre ?? "",
        dj.location ?? "",
        dj.user_id,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [djs, searchQuery]);

  const isDjGigsView = role === "dj";
  const showReceivedGigsTabs =
    role === "dj" || (role === "both" && sectionTab === "received");
  const showUnifiedDjCalendar = showReceivedGigsTabs && djGigsView === "calendar";

  const filteredReceivedBookings = useMemo(() => {
    if (!showReceivedGigsTabs || djGigsView === "calendar") {
      return receivedBookings;
    }

    return filterReceivedBookingsByStatus(receivedBookings, djGigsView);
  }, [receivedBookings, djGigsView, showReceivedGigsTabs]);

  useEffect(() => {
    getCurrentUserProfile()
      .then((profile) => {
        const userRole = profile?.role ?? null;
        setRole(userRole);
        setSectionTab(getDefaultSectionTab(userRole));
        setLoadingAccess(false);
      })
      .catch((loadError) => {
        console.error("Failed to load bookings access:", loadError);
        setLoadingAccess(false);
      });
  }, []);

  useEffect(() => {
    if (loadingAccess || !canAccessBookings(role)) {
      return;
    }

    if (canCreateBookings(role)) {
      void getCurrentUserId().then((userId) => {
        markNotificationsReadByType(userId, ["booking_update"]);
      });
    }

    async function loadBookings() {
      setLoadingList(true);
      setError(null);

      try {
        const showSent = canViewSentBookings(role);
        const showReceived = canViewReceivedBookings(role);

        const [sentResult, receivedResult] = await Promise.all([
          showSent ? listSentBookingRequests() : Promise.resolve([]),
          showReceived ? listReceivedBookingRequests() : Promise.resolve([]),
        ]);

        if (showSent) {
          const groups = groupSentBookingRequests(sentResult);
          setSentGroups(groups);

          const recipientIds = [...new Set(sentResult.map((booking) => booking.recipient_id))];

          if (recipientIds.length > 0) {
            try {
              const profiles = await getBookingRecipientProfilesByIds(recipientIds);
              setRecipientProfiles(profiles);
            } catch (profileError) {
              logBookingsLoadError(profileError);
              console.error("Failed to load booking recipient profiles:", profileError);
            }
          } else {
            setRecipientProfiles(new Map());
          }
        } else {
          setSentGroups([]);
          setRecipientProfiles(new Map());
        }

        setReceivedBookings(receivedResult);
      } catch (loadError) {
        logBookingsLoadError(loadError);
        console.error("Failed to load bookings:", loadError);
        setSentGroups([]);
        setReceivedBookings([]);
        setRecipientProfiles(new Map());
        setError(getBookingsLoadErrorMessage(loadError));
      } finally {
        setLoadingList(false);
      }
    }

    loadBookings();
  }, [loadingAccess, role, successMessage]);

  useEffect(() => {
    if (loadingAccess || !canCreateBookings(role)) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const planIdParam = params.get("planId");
    const createParam = params.get("create");
    const eventDateParam = params.get("eventDate") ?? "";

    const paramKey = planIdParam
      ? `planId:${planIdParam}:${eventDateParam}`
      : createParam
        ? `${createParam}:${eventDateParam}`
        : null;

    if (!paramKey || handledCreateParamsRef.current === paramKey) {
      return;
    }

    handledCreateParamsRef.current = paramKey;

    if (planIdParam) {
      handledPlanIdRef.current = planIdParam;
      void openCreateFlow({ planId: planIdParam, eventDate: eventDateParam || undefined }).finally(
        () => {
          router.replace("/bookings");
        },
      );
      return;
    }

    if (createParam === "booking") {
      void openCreateFlow({ custom: true, eventDate: eventDateParam || undefined }).finally(() => {
        router.replace("/bookings");
      });
      return;
    }

    if (createParam === "plan") {
      void openCreateFlow({
        initialStep: "pick-plan",
        eventDate: eventDateParam || undefined,
      }).finally(() => {
        router.replace("/bookings");
      });
    }
  }, [loadingAccess, role, router]);

  useEffect(() => {
    if (createStep !== "select-djs" || !form.eventDate.trim() || djs.length === 0) {
      return;
    }

    let cancelled = false;

    void getPlannerDjAvailabilityHints(
      djs.map((dj) => dj.user_id),
      form.eventDate,
    )
      .then((hints) => {
        if (!cancelled) {
          setDjAvailabilityHints(hints);
        }
      })
      .catch((loadError) => {
        console.error("Failed to load DJ availability hints:", loadError);
      });

    return () => {
      cancelled = true;
    };
  }, [createStep, form.eventDate, djs]);

  async function openCreateFlow(options?: {
    planId?: string;
    custom?: boolean;
    eventDate?: string;
    initialStep?: CreateStep;
  }) {
    setCreateOpen(true);
    setSelectedDjIds([]);
    setSearchQuery("");
    setError(null);
    setFailureDetails([]);
    setSuccessMessage(null);
    setEventDateOverride(options?.eventDate ?? null);
    setLoadingDjs(true);
    setLoadingPlans(true);

    try {
      const [bookableDjs, plans] = await Promise.all([
        listBookableDjs(),
        listBookingPlans(),
      ]);

      setDjs(bookableDjs);
      setBookingPlans(plans);

      if (options?.planId) {
        const plan =
          plans.find((item) => item.id === options.planId) ??
          (await getBookingPlanById(options.planId));

        if (plan) {
          const input = bookingPlanToRequestInput(plan);
          setForm({
            ...input,
            eventDate: options.eventDate?.trim() || input.eventDate,
          });
          setSelectedPlanId(plan.id);
          setCreateStep("details");
          return;
        }
      }

      if (options?.custom || options?.initialStep === "details") {
        setForm({
          ...emptyForm,
          eventDate: options?.eventDate ?? "",
        });
        setSelectedPlanId(null);
        setCreateStep("details");
        return;
      }

      if (options?.initialStep === "pick-plan") {
        setForm({
          ...emptyForm,
          eventDate: options?.eventDate ?? "",
        });
        setSelectedPlanId(null);
        setCreateStep("pick-plan");
        return;
      }

      setForm(emptyForm);
      setSelectedPlanId(null);
      setCreateStep("source");
    } catch (loadError) {
      console.error("Failed to open create booking flow:", loadError);
      setError(loadError instanceof Error ? loadError.message : "Failed to start booking flow");
      setCreateStep("source");
    } finally {
      setLoadingDjs(false);
      setLoadingPlans(false);
    }
  }

  function closeCreateFlow() {
    if (sending) {
      return;
    }

    setCreateOpen(false);
    setCreateStep("source");
    setForm(emptyForm);
    setSelectedPlanId(null);
    setBookingPlans([]);
    setSelectedDjIds([]);
    setSearchQuery("");
    setFailureDetails([]);
    setEventDateOverride(null);
    setError(null);
  }

  function updateField<Key extends keyof BookingRequestInput>(
    key: Key,
    value: BookingRequestInput[Key],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDjSelection(userId: string) {
    setSelectedDjIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  function handleSelectSavedPlan(plan: BookingPlan) {
    const input = bookingPlanToRequestInput(plan);
    setForm({
      ...input,
      eventDate: eventDateOverride ?? input.eventDate,
    });
    setSelectedPlanId(plan.id);
    setError(null);
    setCreateStep("details");
  }

  function handleContinueToDjSelection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !form.eventName.trim() ||
      !form.venue.trim() ||
      !form.eventDate.trim() ||
      !form.setTime.trim() ||
      !form.fee.trim()
    ) {
      setError("Please fill in all required booking details.");
      return;
    }

    setError(null);
    setCreateStep("select-djs");
  }

  async function handleSendBookingRequests() {
    if (selectedDjIds.length === 0) {
      setError("Select at least one DJ.");
      return;
    }

    setSending(true);
    setError(null);
    setFailureDetails([]);
    setSuccessMessage(null);

    try {
      const { successes, failures } = await sendBookingRequestsToDjs(selectedDjIds, form);

      if (successes.length === 0) {
        setError("Failed to send booking requests. Please try again.");
        setFailureDetails(
          failures.map((failure) => {
            const profile = djs.find((dj) => dj.user_id === failure.recipientId);
            const name = profile?.display_name ?? failure.recipientId;
            return `${name}: ${failure.message}`;
          }),
        );
        return;
      }

      const successText = `Sent booking request to ${successes.length} DJ${successes.length === 1 ? "" : "s"}.`;
      setSuccessMessage(successText);
      closeCreateFlow();

      if (failures.length > 0) {
        setFailureDetails(
          failures.map((failure) => {
            const profile = djs.find((dj) => dj.user_id === failure.recipientId);
            const name = profile?.display_name ?? failure.recipientId;
            return `${name}: ${failure.message}`;
          }),
        );
      }
    } catch (sendError) {
      console.error("Failed to send booking requests:", sendError);
      setError(sendError instanceof Error ? sendError.message : "Failed to send booking requests");
    } finally {
      setSending(false);
    }
  }

  if (loadingAccess) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#070708] text-sm text-zinc-500">
        Loading...
      </div>
    );
  }

  if (!canAccessBookings(role)) {
    return null;
  }

  const showCreateButton = canCreateBookings(role);
  const showSentTab = canViewSentBookings(role);
  const showReceivedTab = canViewReceivedBookings(role);
  const createStepMeta = getCreateStepMeta(createStep);

  return (
    <OnboardingGuard>
      <div
        className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-[#070708] font-sans text-zinc-100 ${MOBILE_NAV_OFFSET_CLASS}`}
      >
        <AppNavigation />

        <header className="border-b border-zinc-800/80 px-4 py-4 sm:px-6 md:pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold text-zinc-50">{getBookingsPageTitle(role)}</h1>
              <p className="mt-1 text-sm text-zinc-500">{getBookingsSubtitle(role)}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {showCreateButton && !createOpen ? (
                <button
                  type="button"
                  onClick={() => openCreateFlow()}
                  className="rounded-xl border border-blue-500/45 bg-blue-600/20 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.22)] transition hover:border-blue-400/60 hover:bg-blue-600/30"
                >
                  Create booking request
                </button>
              ) : null}
            </div>
          </div>

          {showReceivedGigsTabs ? (
            <DjGigsTabs
              activeView={djGigsView}
              bookings={receivedBookings}
              onChange={setDjGigsView}
            />
          ) : showSentTab || showReceivedTab ? (
            <BookingSectionTabs
              activeTab={sectionTab}
              onChange={setSectionTab}
              showSent={showSentTab}
              showReceived={showReceivedTab}
            />
          ) : null}

          {!isDjGigsView && (role === "promoter" || role === "both") ? <PlannerEventsSubNav /> : null}
        </header>

        <div className="px-4 py-4 sm:px-6">
          {successMessage ? (
            <p className="mb-4 rounded-xl border border-blue-500/30 bg-blue-600/10 px-4 py-3 text-sm text-blue-200">
              {successMessage}
            </p>
          ) : null}

          {failureDetails.length > 0 ? (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <p className="font-semibold">Some sends failed:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {failureDetails.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {createOpen && showCreateButton ? (
            <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-400">
                    Step {createStepMeta.label}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-zinc-50">{createStepMeta.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={closeCreateFlow}
                  disabled={sending}
                  className="text-xs font-semibold uppercase tracking-wide text-zinc-500 transition hover:text-zinc-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              {createStep === "source" ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setCreateStep("pick-plan");
                    }}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 py-4 text-left transition hover:border-blue-500/40 hover:bg-blue-600/10"
                  >
                    <p className="text-base font-semibold text-zinc-50">Use a saved booking plan</p>
                    <p className="mt-2 text-sm text-zinc-400">
                      Prefill booking details from one of your saved plans, then edit before sending.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => openCreateFlow({ custom: true })}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 py-4 text-left transition hover:border-blue-500/40 hover:bg-blue-600/10"
                  >
                    <p className="text-base font-semibold text-zinc-50">Create a custom booking request</p>
                    <p className="mt-2 text-sm text-zinc-400">
                      Enter fresh booking details from scratch.
                    </p>
                  </button>
                  {error ? <p className="text-sm text-red-400">{error}</p> : null}
                </div>
              ) : null}

              {createStep === "pick-plan" ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setCreateStep("source")}
                    className="text-xs font-semibold uppercase tracking-wide text-zinc-500 transition hover:text-zinc-300"
                  >
                    ← Back
                  </button>

                  {loadingPlans ? (
                    <p className="text-sm text-zinc-500">Loading saved plans...</p>
                  ) : bookingPlans.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-6 text-center">
                      <p className="text-sm text-zinc-400">No saved booking plans yet.</p>
                      <Link
                        href="/booking-plans"
                        className="mt-3 inline-block text-sm font-semibold text-blue-300 transition hover:text-blue-200"
                      >
                        Create a booking plan
                      </Link>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {bookingPlans.map((plan) => (
                        <li key={plan.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectSavedPlan(plan)}
                            className={`w-full rounded-xl border px-4 py-4 text-left transition ${
                              selectedPlanId === plan.id
                                ? "border-blue-500/50 bg-blue-600/10"
                                : "border-zinc-800 bg-zinc-950/40 hover:border-blue-500/30 hover:bg-blue-600/10"
                            }`}
                          >
                            <p className="font-semibold text-zinc-50">{plan.name}</p>
                            <p className="mt-1 text-sm text-zinc-400">
                              {plan.event_name} · {plan.venue} · {plan.event_date}
                            </p>
                            <p className="mt-1 text-sm text-zinc-500">
                              {plan.set_time} · Rate {formatRateDisplay(plan.fee)}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {error ? <p className="text-sm text-red-400">{error}</p> : null}
                </div>
              ) : null}

              {createStep === "details" ? (
                <form onSubmit={handleContinueToDjSelection} className="space-y-4">
                  {selectedPlanId ? (
                    <p className="rounded-xl border border-blue-500/25 bg-blue-600/10 px-3 py-2 text-xs text-blue-200">
                      Prefilled from a saved booking plan. You can edit any field before sending.
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setCreateStep("source")}
                    className="text-xs font-semibold uppercase tracking-wide text-zinc-500 transition hover:text-zinc-300"
                  >
                    ← Back
                  </button>

                  <BookingField
                    label="Event name"
                    value={form.eventName}
                    onChange={(value) => updateField("eventName", value)}
                    placeholder="Warehouse Sessions"
                    required
                  />
                  <BookingField
                    label="Venue"
                    value={form.venue}
                    onChange={(value) => updateField("venue", value)}
                    placeholder="The Warehouse, Melbourne"
                    required
                  />
                  <BookingDateField
                    label="Event date"
                    value={form.eventDate}
                    onChange={(value) => updateField("eventDate", value)}
                    required
                  />
                  <BookingSetTimeRangeField
                    value={form.setTime}
                    onChange={(value) => updateField("setTime", value)}
                    required
                  />
                  <BookingRateField
                    value={form.fee}
                    onChange={(value) => updateField("fee", value)}
                    required
                  />
                  <BookingField
                    label="Notes"
                    value={form.notes}
                    onChange={(value) => updateField("notes", value)}
                    placeholder="Genre, vibe, travel, equipment..."
                    multiline
                  />

                  {error ? <p className="text-sm text-red-400">{error}</p> : null}

                  <button
                    type="submit"
                    className="rounded-xl border border-blue-500/45 bg-blue-600/20 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.22)] transition hover:border-blue-400/60 hover:bg-blue-600/30"
                  >
                    Continue to DJ selection
                  </button>
                </form>
              ) : null}

              {createStep === "select-djs" ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setCreateStep("details")}
                    disabled={sending}
                    className="text-xs font-semibold uppercase tracking-wide text-zinc-500 transition hover:text-zinc-300 disabled:opacity-50"
                  >
                    ← Back
                  </button>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-400">
                    <p className="font-medium text-zinc-200">{form.eventName}</p>
                    <p className="mt-1">
                      {form.venue} · {form.eventDate} · {form.setTime}
                    </p>
                    <p className="mt-1">Rate: {formatRateDisplay(form.fee)}</p>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                      Search DJs
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search by name or genre..."
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15"
                    />
                  </label>

                  <p className="text-sm text-zinc-500">
                    {selectedDjIds.length} DJ{selectedDjIds.length === 1 ? "" : "s"} selected
                  </p>

                  {loadingDjs ? (
                    <p className="text-sm text-zinc-500">Loading DJs...</p>
                  ) : filteredDjs.length === 0 ? (
                    <p className="text-sm text-zinc-500">No DJs match your search.</p>
                  ) : (
                    <ul className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                      {filteredDjs.map((dj) => {
                        const selected = selectedDjIds.includes(dj.user_id);
                        const displayName = dj.display_name ?? dj.user_id;
                        const availabilityHint = djAvailabilityHints.get(dj.user_id);

                        return (
                          <li key={dj.user_id}>
                            <button
                              type="button"
                              onClick={() => toggleDjSelection(dj.user_id)}
                              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                                selected
                                  ? "border-blue-500/50 bg-blue-600/10"
                                  : "border-zinc-800 bg-zinc-900/70 hover:border-blue-500/30"
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                                  selected
                                    ? "border-blue-500 bg-blue-600/30 text-blue-100"
                                    : "border-zinc-700 bg-zinc-950/80 text-transparent"
                                }`}
                              >
                                ✓
                              </span>
                              <ProfileAvatar
                                name={displayName}
                                avatarUrl={dj.avatar_url}
                                size="md"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-zinc-100">{displayName}</p>
                                  {availabilityHint ? (
                                    <DjBookingAvailabilityBadge hint={availabilityHint} />
                                  ) : null}
                                </div>
                                <p className="text-xs text-zinc-500">
                                  {[dj.genre, dj.location].filter(Boolean).join(" · ") ||
                                    getRoleLabel(dj.role)}
                                </p>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {error ? <p className="text-sm text-red-400">{error}</p> : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        setCreateStep("details");
                        setError(null);
                      }}
                      disabled={sending}
                      className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-300 transition hover:border-zinc-600 disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSendBookingRequests}
                      disabled={sending || selectedDjIds.length === 0}
                      className="flex-1 rounded-xl border border-blue-500/45 bg-blue-600/20 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.22)] transition hover:border-blue-400/60 hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sending
                        ? "Sending..."
                        : `Send to ${selectedDjIds.length} DJ${selectedDjIds.length === 1 ? "" : "s"}`}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {sectionTab === "sent" && showSentTab ? (
            loadingList ? (
              <p className="text-sm text-zinc-500">Loading sent bookings...</p>
            ) : error && !createOpen ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : sentGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center">
                <p className="text-base font-medium text-zinc-300">No bookings sent yet.</p>
                {showCreateButton && !createOpen ? (
                  <button
                    type="button"
                    onClick={() => openCreateFlow()}
                    className="mt-6 rounded-xl border border-blue-500/45 bg-blue-600/20 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.22)] transition hover:border-blue-400/60 hover:bg-blue-600/30"
                  >
                    Create booking request
                  </button>
                ) : null}
              </div>
            ) : (
              <>
                <BookingStatusTabs
                  activeFilter={statusFilter}
                  groups={sentGroups}
                  onChange={setStatusFilter}
                />

                {filteredGroups.length === 0 ? (
                  <p className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-6 text-center text-sm text-zinc-500">
                    No {statusFilter === "all" ? "" : `${statusFilter} `}booking responses match this
                    filter.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {filteredGroups.map((group) => (
                      <BookingCampaignCard
                        key={group.key}
                        group={group}
                        fullGroup={sentGroups.find((item) => item.key === group.key) ?? group}
                        recipientProfiles={recipientProfiles}
                      />
                    ))}
                  </ul>
                )}
              </>
            )
          ) : null}

          {showUnifiedDjCalendar ? (
            <DjAvailabilityManager description="Manage your availability and received bookings." />
          ) : isDjGigsView || (sectionTab === "received" && showReceivedTab) ? (
            loadingList ? (
              <p className="text-sm text-zinc-500">Loading received bookings...</p>
            ) : error && !createOpen ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : receivedBookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center">
                <p className="text-base font-medium text-zinc-300">
                  {isDjGigsView ? "No gigs yet." : "No bookings received yet."}
                </p>
              </div>
            ) : filteredReceivedBookings.length === 0 ? (
              <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-6 text-center text-sm text-zinc-500">
                No {djGigsView === "accepted" ? "confirmed" : djGigsView} gigs match this filter.
              </p>
            ) : (
              <ul className="space-y-3">
                {filteredReceivedBookings.map((booking) => (
                  <ReceivedBookingCard key={booking.id} booking={booking} />
                ))}
              </ul>
            )
          ) : null}
        </div>
      </div>
    </OnboardingGuard>
  );
}

function DjGigsTabs({
  activeView,
  bookings,
  onChange,
}: {
  activeView: DjGigsView;
  bookings: BookingRequest[];
  onChange: (view: DjGigsView) => void;
}) {
  const counts = useMemo(() => {
    return bookings.reduce(
      (stats, booking) => {
        if (booking.status === "pending") {
          stats.pending += 1;
        } else if (booking.status === "accepted") {
          stats.accepted += 1;
        } else if (booking.status === "declined") {
          stats.declined += 1;
        }

        return stats;
      },
      { pending: 0, accepted: 0, declined: 0 },
    );
  }, [bookings]);

  const tabs: { value: DjGigsView; label: string; count?: number }[] = [
    { value: "pending", label: "Pending", count: counts.pending },
    { value: "accepted", label: "Confirmed", count: counts.accepted },
    { value: "declined", label: "Declined", count: counts.declined },
    { value: "calendar", label: "Calendar" },
  ];

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = activeView === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              isActive
                ? "border border-blue-500/45 bg-blue-600/15 text-blue-300 shadow-[0_0_16px_rgba(59,130,246,0.12)]"
                : "border border-zinc-800/80 bg-zinc-900/50 text-zinc-400 hover:border-blue-500/30 hover:text-blue-300"
            }`}
          >
            {tab.label}
            {tab.count && tab.count > 0 ? ` (${tab.count})` : ""}
          </button>
        );
      })}
    </div>
  );
}

function BookingSectionTabs({
  activeTab,
  onChange,
  showSent,
  showReceived,
}: {
  activeTab: BookingsSectionTab;
  onChange: (tab: BookingsSectionTab) => void;
  showSent: boolean;
  showReceived: boolean;
}) {
  const tabs: { value: BookingsSectionTab; label: string }[] = [];

  if (showSent) {
    tabs.push({ value: "sent", label: "Bookings Sent" });
  }

  if (showReceived) {
    tabs.push({ value: "received", label: "Bookings Received" });
  }

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex gap-2 border-b border-zinc-800/80">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`relative px-1 pb-3 text-sm font-semibold transition ${
              isActive
                ? "text-blue-300 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-blue-500 after:shadow-[0_0_10px_rgba(59,130,246,0.55)]"
                : "text-zinc-500 hover:text-blue-400"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function ReceivedBookingCard({ booking }: { booking: BookingRequest }) {
  return (
    <li className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-zinc-50">{booking.event_name}</h3>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <CampaignDetail label="Venue" value={booking.venue} />
            <CampaignDetail label="Date" value={booking.event_date} />
            <CampaignDetail label="Rate" value={formatRateDisplay(booking.fee)} />
          </dl>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
          <BookingStatusBadge status={booking.status} />
          {booking.event_id ? (
            <Link
              href={`/events/${booking.event_id}`}
              className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-300 transition hover:border-blue-500/35 hover:text-blue-300"
            >
              View event
            </Link>
          ) : null}
          <Link
            href={`/dm/${booking.conversation_id}`}
            className="rounded-lg border border-blue-500/35 bg-blue-600/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-300 transition hover:border-blue-400/50 hover:bg-blue-600/20"
          >
            Open DM
          </Link>
        </div>
      </div>
    </li>
  );
}

function BookingStatusTabs({
  activeFilter,
  groups,
  onChange,
}: {
  activeFilter: BookingStatusFilter;
  groups: SentBookingGroup[];
  onChange: (filter: BookingStatusFilter) => void;
}) {
  const totals = useMemo(() => {
    return groups.reduce(
      (stats, group) => {
        const campaignStats = getBookingCampaignStats(group);
        stats.total += campaignStats.total;
        stats.pending += campaignStats.pending;
        stats.accepted += campaignStats.accepted;
        stats.declined += campaignStats.declined;
        return stats;
      },
      { total: 0, pending: 0, accepted: 0, declined: 0 },
    );
  }, [groups]);

  function getTabCount(filter: BookingStatusFilter): number {
    if (filter === "all") {
      return totals.total;
    }

    return totals[filter];
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STATUS_FILTERS.map((tab) => {
          const isActive = activeFilter === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              className={`rounded-xl px-3 py-2.5 text-left transition ${
                isActive
                  ? "border border-blue-500/45 bg-blue-600/15 shadow-[0_0_16px_rgba(59,130,246,0.12)]"
                  : "border border-transparent bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/80"
              }`}
            >
              <span
                className={`block text-[11px] font-semibold uppercase tracking-wide ${
                  isActive ? "text-blue-300" : "text-zinc-500"
                }`}
              >
                {tab.label}
              </span>
              <span className={`mt-0.5 block text-lg font-semibold ${isActive ? "text-zinc-50" : "text-zinc-300"}`}>
                {getTabCount(tab.value)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BookingCampaignCard({
  group,
  fullGroup,
  recipientProfiles,
}: {
  group: SentBookingGroup;
  fullGroup: SentBookingGroup;
  recipientProfiles: Map<string, BookingRecipientProfile>;
}) {
  const campaignStats = getBookingCampaignStats(fullGroup);

  return (
    <li className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-400">
            Sent {formatSentDate(group.created_at)}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-zinc-50">{group.event_name}</h3>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <CampaignDetail label="Venue" value={group.venue} />
            <CampaignDetail label="Event date" value={group.event_date} />
            <CampaignDetail label="Set time" value={group.set_time} />
            <CampaignDetail label="Rate" value={formatRateDisplay(group.fee)} />
          </dl>
          {group.notes?.trim() ? (
            <div className="mt-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Notes
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-300">{group.notes}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <CampaignStat label="Total sent" value={campaignStats.total} tone="neutral" />
        <CampaignStat label="Pending" value={campaignStats.pending} tone="pending" />
        <CampaignStat label="Accepted" value={campaignStats.accepted} tone="accepted" />
        <CampaignStat label="Declined" value={campaignStats.declined} tone="declined" />
      </div>

      <ul className="mt-4 space-y-2">
        {group.requests.map((request) => {
          const profile = recipientProfiles.get(request.recipient_id);
          const name = profile?.display_name ?? request.recipient_id;
          const subtitle =
            [profile?.genre, profile?.role ? getRoleLabel(profile.role) : null]
              .filter(Boolean)
              .join(" · ") || "DJ / Artist";

          return (
            <li
              key={request.id}
              className="flex flex-col gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <ProfileAvatar name={name} avatarUrl={profile?.avatar_url} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-100">{name}</p>
                  <p className="truncate text-xs text-zinc-500">{subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:shrink-0">
                <BookingStatusBadge status={request.status} />
                <Link
                  href={`/dm/${request.conversation_id}`}
                  className="rounded-lg border border-blue-500/35 bg-blue-600/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-300 transition hover:border-blue-400/50 hover:bg-blue-600/20"
                >
                  Open DM
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

function CampaignDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-zinc-200">{value}</dd>
    </div>
  );
}

function CampaignStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | BookingRequestStatus;
}) {
  const classes =
    tone === "accepted"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : tone === "declined"
        ? "border-red-500/30 bg-red-500/10 text-red-300"
        : tone === "pending"
          ? "border-blue-500/30 bg-blue-600/10 text-blue-300"
          : "border-zinc-700/80 bg-zinc-950/50 text-zinc-300";

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${classes}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-0.5 text-xl font-semibold">{value}</p>
    </div>
  );
}

function BookingStatusBadge({ status }: { status: BookingRequestStatus }) {
  const classes =
    status === "accepted"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : status === "declined"
        ? "border-red-500/40 bg-red-500/10 text-red-300"
        : "border-blue-500/40 bg-blue-600/15 text-blue-300";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${classes}`}
    >
      {formatBookingStatusLabel(status)}
    </span>
  );
}

function BookingField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15"
        />
      )}
    </label>
  );
}
