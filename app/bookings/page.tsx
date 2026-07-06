"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import PlannerEventsSubNav from "@/app/components/PlannerEventsSubNav";
import DjAvailabilityManager from "@/app/components/DjAvailabilityManager";
import DjBookingAvailabilityBadge from "@/app/components/DjBookingAvailabilityBadge";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import { BookingDateField, BookingSetTimeRangeField } from "@/app/components/BookingDateTimeFields";
import { BookingRateField } from "@/app/components/BookingRateField";
import BookingRateModeField from "@/app/components/booking/BookingRateModeField";
import ArchiveAllBookingRequestsButton from "@/app/components/ArchiveAllBookingRequestsButton";
import ArchiveBookingRequestButton from "@/app/components/ArchiveBookingRequestButton";
import BookingStatusBadge from "@/app/components/booking/BookingStatusBadge";
import { BookingDetailItem } from "@/app/components/booking/BookingDetailGrid";
import {
  archiveAllCancelledBookingRequests,
  archiveBookingRequest,
  ALL_SELECTED_DJS_ALREADY_HAVE_EVENT_REQUEST_MESSAGE,
  buildBookingSendResultMessage,
  buildEventBookingDuplicateMap,
  filterActiveBookingGroups,
  filterActiveBookings,
  filterArchivedCancelledBookings,
  filterCancelledBookings,
  filterHistoryCancelledBookings,
  filterSendableRecipientIdsForEvent,
  getActiveBookingCampaignStats,
  getBookingMutationErrorMessage,
  getBookingStatusBadgeClass,
  groupSentBookingRequests,
  listReceivedBookingRequests,
  listSentBookingRequests,
  logBookingsLoadError,
  listBookingRequestsForEvent,
  resolveBookingRequestRateMode,
  sendBookingRequestsToDjs,
  sortBookingsNewestFirst,
  unarchiveBookingRequest,
  type BookingRequest,
  type BookingRequestInput,
  type BookingRequestStatus,
  type DjGigsViewFilter,
  type SentBookingGroup,
} from "@/lib/bookingRequests";
import {
  bookingPlanToRequestInput,
  getBookingPlanById,
  listBookingPlans,
  type BookingPlan,
} from "@/lib/bookingPlans";
import { formatRateDisplay, isPositiveWholeDollarRate } from "@/lib/bookingRate";
import EventBookingDuplicateBadge from "@/app/components/EventBookingDuplicateBadge";
import UnavailableDjBookingConfirmModal from "@/app/components/UnavailableDjBookingConfirmModal";
import {
  getPlannerDjAvailabilityHints,
  getUnavailableDjBookingWarnings,
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
import {
  buildGigsEventDetailHref,
  buildGigsListHref,
  resolveGigsListTabParam,
} from "@/lib/bookings/gigsListNavigation";

const emptyForm: BookingRequestInput = {
  eventName: "",
  venue: "",
  eventDate: "",
  setTime: "",
  fee: "",
  notes: "",
  rateMode: "fixed",
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

const PLANNER_PENDING_EMPTY_MESSAGE = "No pending bookings.";
const PLANNER_CONFIRMED_EMPTY_MESSAGE = "No confirmed bookings yet.";
const PLANNER_HISTORY_EMPTY_MESSAGE = "No booking history yet.";
const DJ_HISTORY_EMPTY_MESSAGE = "No cancelled booking requests yet.";
const PLANNER_DECLINED_EMPTY_MESSAGE = "No declined bookings yet.";
const ARCHIVED_EMPTY_MESSAGE = "No archived booking requests.";

type BookingsSectionTab = "sent" | "received";
type PlannerSentPrimaryTab = "pending" | "confirmed" | "history";
type PlannerHistorySubView = "cancelled" | "declined" | "archived";

function HistoryIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ArchiveTabIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7h18" />
      <path d="M5 7l1 12h12l1-12" />
      <path d="M9 7V5h6v2" />
    </svg>
  );
}

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

function filterReceivedBookingsByView(
  bookings: BookingRequest[],
  view: DjGigsViewFilter,
): BookingRequest[] {
  if (view === "calendar") {
    return bookings;
  }

  if (view === "history") {
    return sortBookingsNewestFirst(filterCancelledBookings(bookings));
  }

  return bookings.filter((booking) => booking.status === view);
}

export default function BookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-ftc-bg text-sm text-ftc-text-muted">
          Loading...
        </div>
      }
    >
      <BookingsPageContent />
    </Suspense>
  );
}

function BookingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledPlanIdRef = useRef<string | null>(null);
  const handledCreateParamsRef = useRef<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [sentGroups, setSentGroups] = useState<SentBookingGroup[]>([]);
  const [sentBookings, setSentBookings] = useState<BookingRequest[]>([]);
  const [receivedBookings, setReceivedBookings] = useState<BookingRequest[]>([]);
  const [sectionTab, setSectionTab] = useState<BookingsSectionTab>("sent");
  const [plannerSentView, setPlannerSentView] = useState<PlannerSentPrimaryTab>("pending");
  const [plannerHistorySubView, setPlannerHistorySubView] =
    useState<PlannerHistorySubView>("cancelled");
  const [locationRevision, setLocationRevision] = useState(0);
  const djGigsView = useMemo(
    () =>
      resolveGigsListTabParam(
        searchParams.get("tab"),
        null,
        typeof window === "undefined" ? null : window.location.search,
      ),
    [searchParams, locationRevision],
  );
  const [djAvailabilityHints, setDjAvailabilityHints] = useState<
    Map<string, DjPlannerAvailabilityHint>
  >(new Map());
  const [recipientProfiles, setRecipientProfiles] = useState<
    Map<string, BookingRecipientProfile>
  >(new Map());
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [archivingBookingId, setArchivingBookingId] = useState<string | null>(null);
  const [archivingAllHistory, setArchivingAllHistory] = useState(false);
  const [restoringBookingId, setRestoringBookingId] = useState<string | null>(null);
  const [unavailableConfirmOpen, setUnavailableConfirmOpen] = useState(false);
  const [eventBookings, setEventBookings] = useState<BookingRequest[]>([]);

  const pendingSentGroups = useMemo(
    () => filterActiveBookingGroups(sentGroups, "pending"),
    [sentGroups],
  );

  const confirmedSentGroups = useMemo(
    () => filterActiveBookingGroups(sentGroups, "accepted"),
    [sentGroups],
  );

  const declinedSentGroups = useMemo(
    () => filterActiveBookingGroups(sentGroups, "declined"),
    [sentGroups],
  );

  const declinedSentCount = useMemo(
    () => declinedSentGroups.reduce((count, group) => count + group.requests.length, 0),
    [declinedSentGroups],
  );

  const historySentBookings = useMemo(
    () => filterHistoryCancelledBookings(sentBookings),
    [sentBookings],
  );

  const archivedSentBookings = useMemo(
    () => filterArchivedCancelledBookings(sentBookings),
    [sentBookings],
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

  const eventBookingDuplicates = useMemo(
    () => (form.eventId ? buildEventBookingDuplicateMap(eventBookings) : new Map()),
    [form.eventId, eventBookings],
  );

  const sendableSelectedDjIds = useMemo(() => {
    if (!form.eventId) {
      return selectedDjIds;
    }

    return filterSendableRecipientIdsForEvent(selectedDjIds, eventBookings).sendableIds;
  }, [form.eventId, selectedDjIds, eventBookings]);

  const unavailableDjWarnings = useMemo(
    () => getUnavailableDjBookingWarnings(sendableSelectedDjIds, djs, djAvailabilityHints),
    [sendableSelectedDjIds, djs, djAvailabilityHints],
  );

  const allSelectedAreDuplicates =
    Boolean(form.eventId) &&
    selectedDjIds.length > 0 &&
    sendableSelectedDjIds.length === 0;

  useEffect(() => {
    if (!form.eventId) {
      return;
    }

    setSelectedDjIds((prev) => {
      const next = prev.filter((userId) => !eventBookingDuplicates.has(userId));
      return next.length === prev.length ? prev : next;
    });
  }, [eventBookingDuplicates, form.eventId]);

  const isDjGigsView = role === "dj";
  const showReceivedGigsTabs =
    role === "dj" || (role === "both" && sectionTab === "received");
  const showUnifiedDjCalendar = showReceivedGigsTabs && djGigsView === "calendar";

  const activeReceivedBookings = useMemo(
    () => filterActiveBookings(receivedBookings),
    [receivedBookings],
  );

  const filteredReceivedBookings = useMemo(() => {
    if (!showReceivedGigsTabs || djGigsView === "calendar") {
      return receivedBookings;
    }

    return filterReceivedBookingsByView(receivedBookings, djGigsView);
  }, [receivedBookings, djGigsView, showReceivedGigsTabs]);

  useEffect(() => {
    function handlePopState() {
      setLocationRevision((current) => current + 1);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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
        setCurrentUserId(userId);
        markNotificationsReadByType(userId, ["booking_update"]);
      });
    } else {
      void getCurrentUserId().then(setCurrentUserId);
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
          setSentBookings(sentResult);
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
          setSentBookings([]);
          setSentGroups([]);
          setRecipientProfiles(new Map());
        }

        setReceivedBookings(receivedResult);
      } catch (loadError) {
        logBookingsLoadError(loadError);
        console.error("Failed to load bookings:", loadError);
        setSentBookings([]);
        setSentGroups([]);
        setReceivedBookings([]);
        setRecipientProfiles(new Map());
        setError(getBookingsLoadErrorMessage(loadError));
      } finally {
        setLoadingList(false);
      }
    }

    loadBookings();
  }, [loadingAccess, role]);

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

  useEffect(() => {
    if (createStep !== "select-djs" || !form.eventId?.trim()) {
      setEventBookings([]);
      return;
    }

    let cancelled = false;

    void listBookingRequestsForEvent(form.eventId)
      .then((bookings) => {
        if (!cancelled) {
          setEventBookings(bookings);
        }
      })
      .catch((loadError) => {
        console.error("Failed to load event bookings for duplicate check:", loadError);
        if (!cancelled) {
          setEventBookings([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [createStep, form.eventId]);

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
          setForm((prev) => ({
            ...input,
            eventDate: options.eventDate?.trim() || input.eventDate,
            rateMode: prev.rateMode ?? "fixed",
          }));
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
    setUnavailableConfirmOpen(false);
    setEventBookings([]);
  }

  function updateField<Key extends keyof BookingRequestInput>(
    key: Key,
    value: BookingRequestInput[Key],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDjSelection(userId: string) {
    if (form.eventId && eventBookingDuplicates.has(userId)) {
      return;
    }

    setSelectedDjIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  function handleSelectSavedPlan(plan: BookingPlan) {
    const input = bookingPlanToRequestInput(plan);
    setForm((prev) => ({
      ...input,
      eventDate: eventDateOverride ?? input.eventDate,
      rateMode: prev.rateMode ?? "fixed",
    }));
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
      !form.setTime.trim()
    ) {
      setError("Please fill in all required booking details.");
      return;
    }

    if (form.rateMode !== "open" && !form.fee.trim()) {
      setError("Please enter a rate for fixed offers.");
      return;
    }

    if (form.fee.trim() && !isPositiveWholeDollarRate(form.fee)) {
      setError("Rate must be a positive whole dollar amount.");
      return;
    }

    setError(null);
    setCreateStep("select-djs");
  }

  function requestSendBookingRequests() {
    const duplicateSource = form.eventId ? eventBookings : [];
    const { sendableIds, skippedIds } = form.eventId
      ? filterSendableRecipientIdsForEvent(selectedDjIds, duplicateSource)
      : { sendableIds: selectedDjIds, skippedIds: [] as string[] };

    if (skippedIds.length > 0) {
      setSelectedDjIds(sendableIds);
    }

    if (sendableIds.length === 0) {
      if (form.eventId) {
        setError(ALL_SELECTED_DJS_ALREADY_HAVE_EVENT_REQUEST_MESSAGE);
        return;
      }

      setError("Select at least one DJ.");
      return;
    }

    if (
      getUnavailableDjBookingWarnings(sendableIds, djs, djAvailabilityHints).length > 0
    ) {
      setUnavailableConfirmOpen(true);
      return;
    }

    void executeSendBookingRequests(sendableIds, skippedIds.length);
  }

  async function executeSendBookingRequests(
    recipientIds: string[] = sendableSelectedDjIds,
    skippedDuplicateCount = 0,
  ) {
    const duplicateSource = form.eventId ? eventBookings : [];
    const { sendableIds, skippedIds } = form.eventId
      ? filterSendableRecipientIdsForEvent(recipientIds, duplicateSource)
      : { sendableIds: recipientIds, skippedIds: [] as string[] };
    const totalSkippedDuplicates = skippedDuplicateCount + skippedIds.length;

    if (sendableIds.length === 0) {
      if (form.eventId) {
        setError(ALL_SELECTED_DJS_ALREADY_HAVE_EVENT_REQUEST_MESSAGE);
        setSelectedDjIds([]);
        return;
      }

      setError("Select at least one DJ.");
      return;
    }

    if (skippedIds.length > 0) {
      setSelectedDjIds(sendableIds);
    }

    setSending(true);
    setError(null);
    setFailureDetails([]);
    setSuccessMessage(null);

    try {
      const sendInput: BookingRequestInput = {
        ...form,
        rateMode: resolveBookingRequestRateMode(form),
      };
      const { successes, failures, skippedDuplicateRecipientIds } =
        await sendBookingRequestsToDjs(sendableIds, sendInput, {
          existingEventBookings: form.eventId ? duplicateSource : undefined,
        });
      const skippedCount = totalSkippedDuplicates + skippedDuplicateRecipientIds.length;

      if (successes.length === 0) {
        if (skippedCount > 0) {
          setError(ALL_SELECTED_DJS_ALREADY_HAVE_EVENT_REQUEST_MESSAGE);
          return;
        }

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

      setSuccessMessage(buildBookingSendResultMessage(successes.length, skippedCount));
      setUnavailableConfirmOpen(false);
      closeCreateFlow();
      await reloadPlannerSentBookings();

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

  async function reloadPlannerSentBookings(): Promise<BookingRequest[]> {
    const sentResult = await listSentBookingRequests();
    setSentBookings(sentResult);
    setSentGroups(groupSentBookingRequests(sentResult));
    return sentResult;
  }

  async function handleArchiveBooking(bookingId: string) {
    setArchivingBookingId(bookingId);
    setError(null);
    setFailureDetails([]);

    try {
      await archiveBookingRequest(bookingId);
      await reloadPlannerSentBookings();
      setPlannerSentView("history");
      setPlannerHistorySubView("cancelled");
      setSuccessMessage("Booking request archived.");
    } catch (archiveError) {
      console.error("Failed to archive booking request:", archiveError);
      setError(getBookingMutationErrorMessage(archiveError));
    } finally {
      setArchivingBookingId(null);
    }
  }

  async function handleArchiveAllHistory() {
    const bookingIds = historySentBookings.map((booking) => booking.id);

    if (bookingIds.length === 0) {
      return;
    }

    setArchivingAllHistory(true);
    setError(null);
    setFailureDetails([]);
    setSuccessMessage(null);

    try {
      const { successes, failures } = await archiveAllCancelledBookingRequests(bookingIds);

      await reloadPlannerSentBookings();
      setPlannerSentView("history");

      if (successes.length > 0) {
        setSuccessMessage(
          `Archived ${successes.length} booking request${successes.length === 1 ? "" : "s"}.`,
        );
      }

      if (failures.length > 0) {
        setError(
          failures.length === bookingIds.length
            ? "Failed to archive booking requests."
            : `${failures.length} booking request${failures.length === 1 ? "" : "s"} could not be archived.`,
        );
        setFailureDetails(
          failures.map((failure) => `${failure.bookingId}: ${failure.message}`),
        );
      }
    } catch (archiveError) {
      console.error("Failed to archive all booking requests:", archiveError);
      setError(getBookingMutationErrorMessage(archiveError));
    } finally {
      setArchivingAllHistory(false);
    }
  }

  async function handleRestoreBooking(bookingId: string) {
    setRestoringBookingId(bookingId);
    setError(null);

    try {
      await unarchiveBookingRequest(bookingId);
      await reloadPlannerSentBookings();
      setSuccessMessage("Booking request restored to History.");
    } catch (restoreError) {
      console.error("Failed to restore booking request:", restoreError);
      setError(getBookingMutationErrorMessage(restoreError));
    } finally {
      setRestoringBookingId(null);
    }
  }

  if (loadingAccess) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-ftc-bg text-sm text-ftc-text-muted">
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
        className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
      >
        <AppNavigation />

        <header className="border-b border-ftc-border-subtle px-4 py-3 sm:px-6 md:pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold text-ftc-text">{getBookingsPageTitle(role)}</h1>
              <p className="mt-1 text-sm text-ftc-text-muted">{getBookingsSubtitle(role)}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {showCreateButton && !createOpen ? (
                <button
                  type="button"
                  onClick={() => openCreateFlow()}
                  className="ftc-btn-primary px-4 py-2.5 text-sm uppercase tracking-wide"
                >
                  Create booking request
                </button>
              ) : null}
            </div>
          </div>

          {showReceivedGigsTabs ? (
            <DjGigsTabs
              activeView={djGigsView}
              bookings={activeReceivedBookings}
              cancelledCount={filterCancelledBookings(receivedBookings).length}
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
            <p className="mb-4 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-3 text-sm text-ftc-text-secondary">
              {successMessage}
            </p>
          ) : null}

          {failureDetails.length > 0 ? (
            <div className="mb-4 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-3 text-sm text-[var(--ftc-color-danger)]">
              <p className="font-semibold">Some sends failed:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {failureDetails.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {createOpen && showCreateButton ? (
            <section className="mb-6 ftc-card p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ftc-text-muted">
                    Step {createStepMeta.label}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-ftc-text">{createStepMeta.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={closeCreateFlow}
                  disabled={sending}
                  className="text-xs font-semibold uppercase tracking-wide text-ftc-text-muted transition hover:text-ftc-text-secondary disabled:opacity-50"
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
                    className="w-full rounded-2xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-4 text-left transition hover:border-ftc-border-strong"
                  >
                    <p className="text-base font-semibold text-ftc-text">Use a saved booking plan</p>
                    <p className="mt-2 text-sm text-ftc-text-secondary">
                      Prefill booking details from one of your saved plans, then edit before sending.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => openCreateFlow({ custom: true })}
                    className="w-full rounded-2xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-4 text-left transition hover:border-ftc-border-strong"
                  >
                    <p className="text-base font-semibold text-ftc-text">Create a custom booking request</p>
                    <p className="mt-2 text-sm text-ftc-text-secondary">
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
                    className="text-xs font-semibold uppercase tracking-wide text-ftc-text-muted transition hover:text-ftc-text-secondary"
                  >
                    ← Back
                  </button>

                  {loadingPlans ? (
                    <p className="text-sm text-ftc-text-muted">Loading saved plans...</p>
                  ) : bookingPlans.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-ftc-border bg-ftc-bg-elevated/40 px-4 py-6 text-center">
                      <p className="text-sm text-ftc-text-secondary">No saved booking plans yet.</p>
                      <Link
                        href="/booking-plans"
                        className="mt-3 inline-block text-sm font-semibold text-ftc-primary transition hover:text-ftc-primary/90"
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
                                ? "border-ftc-border-subtle bg-ftc-bg-elevated"
                                : "border-ftc-border-subtle bg-ftc-surface hover:border-ftc-border-strong"
                            }`}
                          >
                            <p className="font-semibold text-ftc-text">{plan.name}</p>
                            <p className="mt-1 text-sm text-ftc-text-secondary">
                              {plan.event_name} · {plan.venue} · {plan.event_date}
                            </p>
                            <p className="mt-1 text-sm text-ftc-text-muted">
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
                    <p className="rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-2 text-xs text-ftc-text-secondary">
                      Prefilled from a saved booking plan. You can edit any field before sending.
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setCreateStep("source")}
                    className="text-xs font-semibold uppercase tracking-wide text-ftc-text-muted transition hover:text-ftc-text-secondary"
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
                  <BookingRateModeField
                    value={form.rateMode ?? "fixed"}
                    onChange={(value) => updateField("rateMode", value)}
                  />
                  <BookingRateField
                    value={form.fee}
                    onChange={(value) => updateField("fee", value)}
                    label={form.rateMode === "open" ? "Suggested rate (optional)" : "Rate"}
                    required={form.rateMode !== "open"}
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
                    className="ftc-btn-primary px-5 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="text-xs font-semibold uppercase tracking-wide text-ftc-text-muted transition hover:text-ftc-text-secondary disabled:opacity-50"
                  >
                    ← Back
                  </button>

                  <div className="rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated p-4 text-sm text-ftc-text-secondary">
                    <p className="font-medium text-ftc-text">{form.eventName}</p>
                    <p className="mt-1">
                      {form.venue} · {form.eventDate} · {form.setTime}
                    </p>
                    <p className="mt-1">
                      {form.rateMode === "open" ? "Open to offers" : "Fixed offer"}
                      {form.fee.trim() ? ` · ${formatRateDisplay(form.fee)}` : ""}
                    </p>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
                      Search DJs
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search by name or genre..."
                      className="ftc-input px-3.5 py-2.5"
                    />
                  </label>

                  <p className="text-sm text-ftc-text-muted">
                    {sendableSelectedDjIds.length} DJ
                    {sendableSelectedDjIds.length === 1 ? "" : "s"} selected
                  </p>

                  {loadingDjs ? (
                    <p className="text-sm text-ftc-text-muted">Loading DJs...</p>
                  ) : filteredDjs.length === 0 ? (
                    <p className="text-sm text-ftc-text-muted">No DJs match your search.</p>
                  ) : (
                    <ul className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                      {filteredDjs.map((dj) => {
                        const selected = selectedDjIds.includes(dj.user_id);
                        const displayName = dj.display_name ?? dj.user_id;
                        const availabilityHint = djAvailabilityHints.get(dj.user_id);
                        const duplicateStatus = eventBookingDuplicates.get(dj.user_id);
                        const isDuplicateBlocked = Boolean(duplicateStatus);

                        return (
                          <li key={dj.user_id}>
                            <button
                              type="button"
                              onClick={() => toggleDjSelection(dj.user_id)}
                              disabled={isDuplicateBlocked}
                              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                                isDuplicateBlocked
                                  ? "cursor-not-allowed border-ftc-border bg-ftc-bg-elevated/20 opacity-70"
                                  : selected
                                    ? "border-ftc-border-subtle bg-ftc-bg-elevated"
                                    : "border-ftc-border-subtle bg-ftc-surface hover:border-ftc-border-strong"
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                                  selected
                                    ? "border-0 bg-ftc-primary text-ftc-bg"
                                    : "border-ftc-border-strong bg-ftc-bg-elevated/80 text-transparent"
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
                                  <p className="font-semibold text-ftc-text">{displayName}</p>
                                  {duplicateStatus ? (
                                    <EventBookingDuplicateBadge status={duplicateStatus} />
                                  ) : null}
                                  {availabilityHint ? (
                                    <DjBookingAvailabilityBadge hint={availabilityHint} />
                                  ) : null}
                                </div>
                                <p className="text-xs text-ftc-text-muted">
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

                  {allSelectedAreDuplicates ? (
                    <p className="text-xs text-ftc-text-muted">
                      Selected DJs already have a request for this event.
                    </p>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        setCreateStep("details");
                        setError(null);
                      }}
                      disabled={sending}
                      className="rounded-xl border border-ftc-border-strong bg-ftc-surface/80 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={requestSendBookingRequests}
                      disabled={sending || sendableSelectedDjIds.length === 0}
                      className="flex-1 ftc-btn-primary w-full px-4 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sending
                        ? "Sending..."
                        : allSelectedAreDuplicates
                          ? "No new DJs to send"
                          : `Send to ${sendableSelectedDjIds.length} DJ${sendableSelectedDjIds.length === 1 ? "" : "s"}`}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {sectionTab === "sent" && showSentTab ? (
            loadingList ? (
              <p className="text-sm text-ftc-text-muted">Loading sent bookings...</p>
            ) : error && !createOpen ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : (
              <>
                <PlannerSentStatusTabs
                  activeTab={plannerSentView}
                  onChange={(tab) => {
                    if (tab === plannerSentView) {
                      return;
                    }

                    setPlannerSentView(tab);
                    if (tab === "history") {
                      setPlannerHistorySubView("cancelled");
                    }
                  }}
                />

                {plannerSentView === "pending" ? (
                  pendingSentGroups.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-ftc-border bg-ftc-bg-elevated/40 px-4 py-8 text-center text-sm text-ftc-text-muted">
                      {PLANNER_PENDING_EMPTY_MESSAGE}
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-4">
                      {pendingSentGroups.map((group) => (
                        <BookingCampaignCard
                          key={group.key}
                          group={group}
                          fullGroup={sentGroups.find((item) => item.key === group.key) ?? group}
                          recipientProfiles={recipientProfiles}
                        />
                      ))}
                    </ul>
                  )
                ) : plannerSentView === "confirmed" ? (
                  confirmedSentGroups.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-ftc-border bg-ftc-bg-elevated/40 px-4 py-8 text-center text-sm text-ftc-text-muted">
                      {PLANNER_CONFIRMED_EMPTY_MESSAGE}
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-4">
                      {confirmedSentGroups.map((group) => (
                        <BookingCampaignCard
                          key={group.key}
                          group={group}
                          fullGroup={sentGroups.find((item) => item.key === group.key) ?? group}
                          recipientProfiles={recipientProfiles}
                        />
                      ))}
                    </ul>
                  )
                ) : (
                  <>
                    <PlannerHistorySubControls
                      activeSubView={plannerHistorySubView}
                      declinedCount={declinedSentCount}
                      archivedCount={archivedSentBookings.length}
                      onChange={(subView) => {
                        setPlannerHistorySubView(subView);
                        if (subView === "archived") {
                          void reloadPlannerSentBookings().catch((loadError) => {
                            logBookingsLoadError(loadError);
                            console.error("Failed to reload planner archived bookings:", loadError);
                          });
                        }
                      }}
                    />

                    {plannerHistorySubView === "archived" ? (
                      archivedSentBookings.length === 0 ? (
                        <p className="mt-4 rounded-xl border border-ftc-border bg-ftc-bg-elevated/40 px-4 py-8 text-center text-sm text-ftc-text-muted">
                          {ARCHIVED_EMPTY_MESSAGE}
                        </p>
                      ) : (
                        <ul className="mt-4 space-y-3">
                          {archivedSentBookings.map((booking) => {
                            const profile = recipientProfiles.get(booking.recipient_id);
                            const name = profile?.display_name?.trim() || "DJ";

                            return (
                              <BookingHistoryCard
                                key={booking.id}
                                booking={booking}
                                subtitle={name}
                                avatarName={name}
                                avatarUrl={profile?.avatar_url}
                                action={
                                  <button
                                    type="button"
                                    disabled={restoringBookingId === booking.id}
                                    onClick={() => void handleRestoreBooking(booking.id)}
                                    className="rounded-lg border border-ftc-border-strong bg-ftc-bg-elevated/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-primary/25 hover:text-ftc-primary disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {restoringBookingId === booking.id ? "Restoring..." : "Restore"}
                                  </button>
                                }
                              />
                            );
                          })}
                        </ul>
                      )
                    ) : plannerHistorySubView === "declined" ? (
                      declinedSentGroups.length === 0 ? (
                        <p className="mt-4 rounded-xl border border-ftc-border bg-ftc-bg-elevated/40 px-4 py-8 text-center text-sm text-ftc-text-muted">
                          {PLANNER_DECLINED_EMPTY_MESSAGE}
                        </p>
                      ) : (
                        <ul className="mt-4 space-y-4">
                          {declinedSentGroups.map((group) => (
                            <BookingCampaignCard
                              key={group.key}
                              group={group}
                              fullGroup={sentGroups.find((item) => item.key === group.key) ?? group}
                              recipientProfiles={recipientProfiles}
                            />
                          ))}
                        </ul>
                      )
                    ) : historySentBookings.length === 0 ? (
                      <p className="mt-4 rounded-xl border border-ftc-border bg-ftc-bg-elevated/40 px-4 py-8 text-center text-sm text-ftc-text-muted">
                        {PLANNER_HISTORY_EMPTY_MESSAGE}
                      </p>
                    ) : (
                      <>
                        <div className="mt-4 flex justify-end">
                          <ArchiveAllBookingRequestsButton
                            count={historySentBookings.length}
                            loading={archivingAllHistory}
                            disabled={Boolean(archivingBookingId)}
                            onConfirm={handleArchiveAllHistory}
                          />
                        </div>
                        <ul className="mt-3 space-y-3">
                          {historySentBookings.map((booking) => {
                            const profile = recipientProfiles.get(booking.recipient_id);
                            const name = profile?.display_name?.trim() || "DJ";

                            return (
                              <BookingHistoryCard
                                key={booking.id}
                                booking={booking}
                                subtitle={name}
                                avatarName={name}
                                avatarUrl={profile?.avatar_url}
                                action={
                                  <ArchiveBookingRequestButton
                                    disabled={archivingAllHistory}
                                    loading={archivingBookingId === booking.id}
                                    onConfirm={() => handleArchiveBooking(booking.id)}
                                  />
                                }
                              />
                            );
                          })}
                        </ul>
                      </>
                    )}
                  </>
                )}
              </>
            )
          ) : null}

          {showUnifiedDjCalendar ? (
            <DjAvailabilityManager description="Manage your availability and received bookings." />
          ) : isDjGigsView || (sectionTab === "received" && showReceivedTab) ? (
            loadingList ? (
              <p className="text-sm text-ftc-text-muted">Loading received bookings...</p>
            ) : error && !createOpen ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : receivedBookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ftc-border bg-ftc-surface/30 px-6 py-12 text-center">
                <p className="text-base font-medium text-ftc-text-secondary">
                  {isDjGigsView ? "No gigs yet." : "No bookings received yet."}
                </p>
              </div>
            ) : filteredReceivedBookings.length === 0 ? (
              <p className="rounded-xl border border-ftc-border bg-ftc-surface/40 px-4 py-8 text-center text-sm text-ftc-text-muted">
                {djGigsView === "history"
                  ? DJ_HISTORY_EMPTY_MESSAGE
                  : `No ${djGigsView === "accepted" ? "confirmed" : djGigsView} gigs match this filter.`}
              </p>
            ) : (
              <ul className="space-y-3">
                {filteredReceivedBookings.map((booking) =>
                  djGigsView === "history" ? (
                    <BookingHistoryCard
                      key={booking.id}
                      booking={booking}
                      gigsTab={djGigsView}
                      muted
                    />
                  ) : (
                    <ReceivedBookingCard
                      key={booking.id}
                      booking={booking}
                      gigsTab={djGigsView}
                    />
                  ),
                )}
              </ul>
            )
          ) : null}
        </div>
      </div>

      <UnavailableDjBookingConfirmModal
        open={unavailableConfirmOpen}
        loading={sending}
        eventDate={form.eventDate}
        unavailableDjs={unavailableDjWarnings}
        onBack={() => {
          if (!sending) {
            setUnavailableConfirmOpen(false);
          }
        }}
        onConfirm={executeSendBookingRequests}
      />
    </OnboardingGuard>
  );
}

function DjGigsTabs({
  activeView,
  bookings,
  cancelledCount,
}: {
  activeView: DjGigsViewFilter;
  bookings: BookingRequest[];
  cancelledCount: number;
}) {
  const router = useRouter();
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

  const tabs: { value: DjGigsViewFilter; label: string; count?: number; icon?: "history" }[] = [
    { value: "pending", label: "Pending", count: counts.pending },
    { value: "accepted", label: "Confirmed", count: counts.accepted },
    { value: "declined", label: "Declined", count: counts.declined },
    { value: "history", label: "History", count: cancelledCount, icon: "history" },
    { value: "calendar", label: "Calendar" },
  ];

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = activeView === tab.value;
        const href = buildGigsListHref(tab.value);

        return (
          <Link
            key={tab.value}
            href={href}
            onClick={(event) => {
              if (isActive) {
                event.preventDefault();
                return;
              }

              event.preventDefault();
              router.push(href);
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              isActive
                ? "border-transparent bg-ftc-primary text-ftc-bg"
                : "border-ftc-border-subtle bg-ftc-bg-elevated text-ftc-text-secondary hover:border-ftc-border-strong"
            }`}
          >
            {tab.icon === "history" ? <HistoryIcon /> : null}
            {tab.label}
            {tab.count && tab.count > 0 ? ` (${tab.count})` : ""}
          </Link>
        );
      })}
    </div>
  );
}

function PlannerSentStatusTabs({
  activeTab,
  onChange,
}: {
  activeTab: PlannerSentPrimaryTab;
  onChange: (tab: PlannerSentPrimaryTab) => void;
}) {
  const tabs: { value: PlannerSentPrimaryTab; label: string }[] = [
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "history", label: "History" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              isActive
                ? "border-transparent bg-ftc-primary text-ftc-bg"
                : "border-ftc-border-subtle bg-ftc-bg-elevated text-ftc-text-secondary hover:border-ftc-border-strong"
            }`}
          >
            {tab.value === "history" ? <HistoryIcon /> : null}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function PlannerHistorySubControls({
  activeSubView,
  declinedCount,
  archivedCount,
  onChange,
}: {
  activeSubView: PlannerHistorySubView;
  declinedCount: number;
  archivedCount: number;
  onChange: (subView: PlannerHistorySubView) => void;
}) {
  const controls: {
    value: PlannerHistorySubView;
    label: string;
    count?: number;
    icon?: "history" | "archived";
  }[] = [
    { value: "cancelled", label: "Cancelled", icon: "history" },
    { value: "declined", label: "Declined", count: declinedCount },
    { value: "archived", label: "Archived", count: archivedCount, icon: "archived" },
  ];

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {controls.map((control) => {
        const isActive = activeSubView === control.value;

        return (
          <button
            key={control.value}
            type="button"
            onClick={() => onChange(control.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition ${
              isActive
                ? "border-ftc-border-strong bg-ftc-bg-elevated text-ftc-text"
                : "border-ftc-border-subtle bg-ftc-surface/40 text-ftc-text-muted hover:border-ftc-border-strong hover:text-ftc-text-secondary"
            }`}
          >
            {control.icon === "history" ? <HistoryIcon className="h-3 w-3" /> : null}
            {control.icon === "archived" ? <ArchiveTabIcon className="h-3 w-3" /> : null}
            {control.label}
            {control.count && control.count > 0 ? ` (${control.count})` : ""}
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
    <div className="mt-4 flex gap-2 border-b border-ftc-border">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`relative px-1 pb-3 text-sm font-semibold transition ${
              isActive
                ? "text-ftc-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-ftc-primary"
                : "text-ftc-text-muted hover:text-ftc-primary"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function ReceivedBookingCard({
  booking,
  gigsTab = "pending",
}: {
  booking: BookingRequest;
  gigsTab?: DjGigsViewFilter;
}) {
  const eventHref = booking.event_id ? buildGigsEventDetailHref(booking.event_id, gigsTab) : null;

  return (
    <li className="rounded-2xl border border-ftc-border-subtle bg-ftc-surface p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-ftc-text">{booking.event_name}</h3>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <CampaignDetail label="Venue" value={booking.venue} />
            <CampaignDetail label="Date" value={booking.event_date} />
            <CampaignDetail label="Rate" value={formatRateDisplay(booking.fee)} />
          </dl>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
          <BookingStatusBadge status={booking.status} />
          {eventHref ? (
            <Link
              href={eventHref}
              className="rounded-lg border border-ftc-border-strong bg-ftc-surface/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-primary/30 hover:text-ftc-primary"
            >
              View event
            </Link>
          ) : null}
          <Link
            href={`/dm/${booking.conversation_id}`}
            className="ftc-btn-primary px-3 py-1.5 text-xs uppercase tracking-wide"
          >
            Open DM
          </Link>
        </div>
      </div>
    </li>
  );
}

function BookingHistoryCard({
  booking,
  muted = true,
  subtitle,
  avatarName,
  avatarUrl,
  action,
  gigsTab,
}: {
  booking: BookingRequest;
  muted?: boolean;
  subtitle?: string;
  avatarName?: string;
  avatarUrl?: string | null;
  action?: React.ReactNode;
  gigsTab?: DjGigsViewFilter;
}) {
  const eventHref = booking.event_id
    ? gigsTab
      ? buildGigsEventDetailHref(booking.event_id, gigsTab)
      : `/events/${booking.event_id}`
    : null;
  const cardClass = muted
    ? "rounded-2xl border border-ftc-border-subtle bg-ftc-bg-elevated/60 p-4 sm:p-5"
    : "rounded-2xl border border-ftc-border-subtle bg-ftc-surface p-4 sm:p-5";
  const titleClass = muted ? "text-ftc-text-secondary" : "text-ftc-text";
  const detailClass = muted ? "text-ftc-text-muted" : "text-ftc-text";

  return (
    <li className={cardClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          {avatarName ? (
            <ProfileAvatar name={avatarName} avatarUrl={avatarUrl} size="sm" className="mt-0.5" />
          ) : null}
          <div className="min-w-0 flex-1">
            <h3 className={`text-base font-semibold ${titleClass}`}>{booking.event_name}</h3>
            {subtitle ? <p className="mt-1 text-xs text-ftc-text-muted">{subtitle}</p> : null}
            <dl className={`mt-3 grid gap-2 text-sm sm:grid-cols-2 ${detailClass}`}>
              <CampaignDetail label="Venue" value={booking.venue} />
              <CampaignDetail label="Date" value={booking.event_date} />
              <CampaignDetail label="Rate" value={formatRateDisplay(booking.fee)} />
            </dl>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:flex-col sm:items-end">
          <BookingStatusBadge status={booking.status} />
          {action}
          {eventHref ? (
            <Link
              href={eventHref}
              className="rounded-lg border border-ftc-border bg-ftc-bg-elevated/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-muted transition hover:border-ftc-border-strong hover:text-ftc-text-secondary"
            >
              View event
            </Link>
          ) : null}
          <Link
            href={`/dm/${booking.conversation_id}`}
            className="rounded-lg border border-ftc-border bg-ftc-bg-elevated/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-muted transition hover:border-ftc-border-strong hover:text-ftc-text-secondary"
          >
            Open DM
          </Link>
        </div>
      </div>
    </li>
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
  const campaignStats = getActiveBookingCampaignStats(fullGroup);
  const eventId = group.requests.find((request) => request.event_id)?.event_id ?? null;
  const eventHref = eventId ? `/events/${eventId}` : null;

  return (
    <li className="rounded-2xl border border-ftc-border-subtle bg-ftc-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-muted">
            Sent {formatSentDate(group.created_at)}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-ftc-text">{group.event_name}</h3>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <CampaignDetail label="Venue" value={group.venue} />
            <CampaignDetail label="Event date" value={group.event_date} />
            <CampaignDetail label="Set time" value={group.set_time} />
            <CampaignDetail label="Rate" value={formatRateDisplay(group.fee)} />
          </dl>
          {group.notes?.trim() ? (
            <div className="mt-3 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
                Notes
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ftc-text-secondary">{group.notes}</p>
            </div>
          ) : null}
        </div>
        {eventHref ? (
          <Link
            href={eventHref}
            className="shrink-0 rounded-lg border border-ftc-border-strong bg-ftc-surface/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-primary/30 hover:text-ftc-primary"
          >
            View event
          </Link>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <CampaignStat label="Total sent" value={campaignStats.total} tone="neutral" />
        <CampaignStat label="Pending" value={campaignStats.pending} tone="pending" />
        <CampaignStat label="Confirmed" value={campaignStats.accepted} tone="accepted" />
        <CampaignStat label="Declined" value={campaignStats.declined} tone="declined" />
      </div>

      <ul className="mt-4 space-y-2">
        {group.requests.map((request) => {
          const profile = recipientProfiles.get(request.recipient_id);
          const name = profile?.display_name?.trim() || "DJ";
          const subtitle =
            [profile?.genre, profile?.role ? getRoleLabel(profile.role) : null]
              .filter(Boolean)
              .join(" · ") || "DJ / Artist";
          const requestEventHref = request.event_id ? `/events/${request.event_id}` : null;

          return (
            <li
              key={request.id}
              className="flex flex-col gap-3 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <ProfileAvatar name={name} avatarUrl={profile?.avatar_url} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ftc-text">{name}</p>
                  <p className="truncate text-xs text-ftc-text-muted">{subtitle}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <BookingStatusBadge status={request.status} />
                {requestEventHref ? (
                  <Link
                    href={requestEventHref}
                    className="rounded-lg border border-ftc-border-strong bg-ftc-surface/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-primary/30 hover:text-ftc-primary"
                  >
                    View event
                  </Link>
                ) : null}
                <Link
                  href={`/dm/${request.conversation_id}`}
                  className="ftc-btn-primary px-3 py-1.5 text-xs uppercase tracking-wide"
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
  return <BookingDetailItem label={label} value={value} />;
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
    tone === "neutral"
      ? "border border-ftc-border-subtle bg-ftc-bg-elevated text-ftc-text-secondary"
      : getBookingStatusBadgeClass(tone);

  return (
    <div className={`rounded-xl px-3 py-2.5 ${classes}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-0.5 text-xl font-semibold">{value}</p>
    </div>
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
      <span className="ftc-label">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={3}
          className="ftc-input px-3.5 py-2.5"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className="ftc-input px-3.5 py-2.5"
        />
      )}
    </label>
  );
}
