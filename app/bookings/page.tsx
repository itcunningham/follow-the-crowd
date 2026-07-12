"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookingsPageLoadingShell,
  BookingCreateEventDetailsFormSkeleton,
  DjGigsTabRow,
  SkeletonBlock,
} from "@/app/components/skeleton/Skeleton";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import { useGuardProfile } from "@/app/components/GuardProfileContext";
import {
  PlannerWorkspacePage,
} from "@/app/components/planner/PlannerWorkspaceLayout";
import DjBookingAvailabilityBadge from "@/app/components/DjBookingAvailabilityBadge";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import { BookingDateField, BookingSetTimeRangeField } from "@/app/components/BookingDateTimeFields";
import { getEventDateValidationError, formatDisplayEventDate } from "@/lib/bookingDateTime";
import EventDjSendOfferControls, {
  createDefaultDjSendOffer,
  DEFAULT_DJ_SEND_OFFER,
  formatDjSendOfferSummary,
  type DjSendOffer,
} from "@/app/components/booking/EventDjSendOfferControls";
import { PlannerFormField } from "@/app/components/planner/PlannerUi";
import { getEventNotesValidationError, MAX_EVENT_NOTES_LENGTH } from "@/lib/events/eventNotes";
import ArchiveAllBookingRequestsButton from "@/app/components/ArchiveAllBookingRequestsButton";
import {
  HistoryManageButton,
  HistoryRemoveConfirmDialog,
  HistorySelectionCheckbox,
  HistorySelectionToolbar,
  filterOutRemovingHistoryItems,
  useHistoryBulkManage,
} from "@/app/components/history/HistoryBulkManage";
import BookingStatusBadge from "@/app/components/booking/BookingStatusBadge";
import { BookingDetailItem } from "@/app/components/booking/BookingDetailGrid";
import {
  archiveAllCancelledBookingRequests,
  archiveBookingRequest,
  ALL_SELECTED_DJS_ALREADY_HAVE_EVENT_REQUEST_MESSAGE,
  buildBookingSendResultMessage,
  buildEventBookingDuplicateMap,
  countDjGigsByTab,
  filterActiveBookingGroups,
  filterActiveBookings,
  filterArchivedCancelledBookings,
  filterCancelledBookings,
  filterDjGigsByTab,
  filterHistoryCancelledBookings,
  filterSendableRecipientIdsForEvent,
  getActiveBookingCampaignStats,
  getBookingCollapsedOfferSummary,
  getBookingMutationErrorMessage,
  getBookingOfferRateLabel,
  getBookingStatusBadgeClass,
  groupSentBookingRequests,
  hasPendingRateProposal,
  hideBookingRequestsFromHistory,
  listBookingRequestHistoryHideIds,
  listReceivedBookingRequests,
  listSentBookingRequests,
  logBookingsLoadError,
  listBookingRequestsForEvent,
  resolveBookingCancellationReasonLabel,
  sendBookingRequestsToDjs,
  sortBookingsNewestFirst,
  unarchiveBookingRequest,
  type BookingRequest,
  type BookingRequestInput,
  type BookingRequestStatus,
  type DjGigsListTab,
  type SentBookingGroup,
} from "@/lib/bookingRequests";
import {
  bookingPlanToRequestInput,
  getBookingPlanById,
  listBookingPlans,
  type BookingPlan,
} from "@/lib/bookingPlans";
import {
  formatIntegerRateDisplay,
  formatRateDisplay,
  isPositiveWholeDollarRate,
  normalizeStoredRate,
} from "@/lib/bookingRate";
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
import { readCachedNavRole } from "@/lib/navigationRoleCache";
import {
  buildGigsEventDetailHref,
  buildGigsListHref,
  resolveGigsListTabParam,
} from "@/lib/bookings/gigsListNavigation";
import {
  clearPendingBookingPlanId,
  consumeBookingPlansSuccessMessage,
  getBookingsDeepLinkKey,
  isPlannerBookingsCreateChromeActive,
  resolveBookingsDeepLinkIntent,
  stashBookingPlansSuccessMessage,
  type BookingsDeepLinkIntent,
} from "@/lib/bookings/planDeepLink";
import { EVENTS_AREA_SUB_NAV } from "@/lib/plannerEventsNav";

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

type DetailsEntrySource = "event-plans-deeplink" | "pick-plan" | "create-booking-deeplink";

function getCreateStepMeta(step: CreateStep): { label: string; title: string } {
  switch (step) {
    case "source":
      return { label: "Start", title: "Create booking request" };
    case "pick-plan":
      return { label: "Plan", title: "Choose a saved event plan" };
    case "details":
      return { label: "1 of 2", title: "Event details" };
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

const GIGS_INCOMING_EMPTY_MESSAGE = "No incoming gig requests";
const GIGS_CONFIRMED_EMPTY_MESSAGE = "No confirmed upcoming gigs";
const GIGS_HISTORY_EMPTY_MESSAGE = "No gig history yet";
const PLANNER_GIGS_EMPTY_MESSAGE =
  "Gigs are for DJs and artists playing events — manage your event lineups from Events";

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

function canViewGigsWorkspace(role: UserRole | null): boolean {
  return role === "dj" || role === "both";
}

function getGigsEmptyMessage(tab: DjGigsListTab): string {
  switch (tab) {
    case "pending":
      return GIGS_INCOMING_EMPTY_MESSAGE;
    case "accepted":
      return GIGS_CONFIRMED_EMPTY_MESSAGE;
    case "history":
      return GIGS_HISTORY_EMPTY_MESSAGE;
  }
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<BookingsPageSuspenseFallback />}>
      <BookingsPageContent />
    </Suspense>
  );
}

function BookingsPageSuspenseFallback() {
  const plannerBookingCreateOpen =
    typeof window !== "undefined" &&
    isPlannerBookingsCreateChromeActive({
      locationSearch: window.location.search,
    });

  return (
    <BookingsPageLoadingShell plannerBookingCreateOpen={plannerBookingCreateOpen} />
  );
}

function BookingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const guardProfile = useGuardProfile();
  const deepLinkInFlightKeyRef = useRef<string | null>(null);
  const deepLinkCompletedKeyRef = useRef<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(
    () => guardProfile?.role ?? readCachedNavRole(),
  );
  const [loadingAccess, setLoadingAccess] = useState(
    () => !guardProfile?.role && readCachedNavRole() == null,
  );
  const [loadingList, setLoadingList] = useState(true);
  const [gigsListReady, setGigsListReady] = useState(false);
  const [sentGroups, setSentGroups] = useState<SentBookingGroup[]>([]);
  const [sentBookings, setSentBookings] = useState<BookingRequest[]>([]);
  const [receivedBookings, setReceivedBookings] = useState<BookingRequest[]>([]);
  const [hiddenBookingIds, setHiddenBookingIds] = useState<ReadonlySet<string>>(() => new Set());
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
  const [senderProfiles, setSenderProfiles] = useState<Map<string, BookingRecipientProfile>>(
    new Map(),
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<CreateStep>("source");
  const [form, setForm] = useState<BookingRequestInput>(emptyForm);
  const [bookingPlans, setBookingPlans] = useState<BookingPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [detailsEntrySource, setDetailsEntrySource] = useState<DetailsEntrySource | null>(null);
  const [planPrefillPending, setPlanPrefillPending] = useState(false);
  const [djs, setDjs] = useState<UserProfile[]>([]);
  const [loadingDjs, setLoadingDjs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDjIds, setSelectedDjIds] = useState<string[]>([]);
  const [djOffers, setDjOffers] = useState<Record<string, DjSendOffer>>({});
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
    () => filterHistoryCancelledBookings(sentBookings, hiddenBookingIds),
    [sentBookings, hiddenBookingIds],
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

  const displayRole = role ?? guardProfile?.role ?? readCachedNavRole();
  const deepLinkIntent = useMemo(
    () => resolveBookingsDeepLinkIntent(searchParams),
    [searchParams],
  );
  const plannerCreateVisible = isPlannerBookingsCreateChromeActive({
    createOpen,
    searchParams,
  });
  const effectiveCreateStep: CreateStep =
    deepLinkIntent?.type === "plan" && createStep === "source"
      ? "details"
      : deepLinkIntent?.type === "create-booking" && createStep === "source"
        ? "details"
        : deepLinkIntent?.type === "create-plan" && createStep === "source"
          ? "pick-plan"
          : createStep;
  const effectiveSelectedPlanId =
    selectedPlanId ?? (deepLinkIntent?.type === "plan" ? deepLinkIntent.planId : null);

  const selectedSavedPlanName = useMemo(() => {
    if (!effectiveSelectedPlanId) {
      return null;
    }

    const plan = bookingPlans.find((item) => item.id === effectiveSelectedPlanId);
    const name = plan?.name?.trim();

    return name || null;
  }, [effectiveSelectedPlanId, bookingPlans]);

  const detailsFormDateValidationError = useMemo(() => {
    if (!createOpen || effectiveCreateStep !== "details") {
      return null;
    }

    return getEventDateValidationError(form.eventDate, form.setTime);
  }, [createOpen, effectiveCreateStep, form.eventDate, form.setTime]);

  const detailsFormNotesValidationError = useMemo(() => {
    if (!createOpen || effectiveCreateStep !== "details") {
      return null;
    }

    return getEventNotesValidationError(form.notes);
  }, [createOpen, effectiveCreateStep, form.notes]);

  const detailsFormValidationError =
    detailsFormDateValidationError ?? detailsFormNotesValidationError;

  const sendOfferSummary = useMemo(() => {
    return sendableSelectedDjIds.map((djId) => {
      const dj = djs.find((item) => item.user_id === djId);
      const offer = djOffers[djId] ?? DEFAULT_DJ_SEND_OFFER;

      return {
        djId,
        name: dj?.display_name?.trim() || "DJ",
        summary: formatDjSendOfferSummary(offer),
      };
    });
  }, [sendableSelectedDjIds, djOffers, djs]);

  const hasInvalidFixedOffers = useMemo(
    () =>
      sendableSelectedDjIds.some((djId) => {
        const offer = djOffers[djId] ?? DEFAULT_DJ_SEND_OFFER;
        return offer.rateMode === "fixed" && !isPositiveWholeDollarRate(offer.fee);
      }),
    [sendableSelectedDjIds, djOffers],
  );
  const showGigsWorkspace = canViewGigsWorkspace(displayRole);
  const showPlannerGigsEmpty = displayRole === "promoter" && !plannerCreateVisible;

  const filteredReceivedBookings = useMemo(() => {
    if (!showGigsWorkspace) {
      return [];
    }

    return filterDjGigsByTab(receivedBookings, djGigsView, hiddenBookingIds);
  }, [receivedBookings, djGigsView, showGigsWorkspace, hiddenBookingIds]);

  const djHistoryBookings = useMemo(
    () => filterDjGigsByTab(receivedBookings, "history", hiddenBookingIds),
    [receivedBookings, hiddenBookingIds],
  );

  const gigsHistoryBulkManage = useHistoryBulkManage(
    showGigsWorkspace && djGigsView === "history" && gigsListReady ? djHistoryBookings : [],
  );

  const visibleReceivedBookings = useMemo(
    () =>
      filterOutRemovingHistoryItems(
        filteredReceivedBookings,
        gigsHistoryBulkManage.removingIds,
      ),
    [filteredReceivedBookings, gigsHistoryBulkManage.removingIds],
  );

  useEffect(() => {
    function handlePopState() {
      setLocationRevision((current) => current + 1);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (guardProfile?.role) {
      setRole(guardProfile.role);
      setLoadingAccess(false);
      return;
    }

    getCurrentUserProfile()
      .then((profile) => {
        const userRole = profile?.role ?? null;
        setRole(userRole);
        setLoadingAccess(false);
      })
      .catch((loadError) => {
        console.error("Failed to load bookings access:", loadError);
        setLoadingAccess(false);
      });
  }, [guardProfile?.role]);

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
      setGigsListReady(false);
      setError(null);

      try {
        if (!canViewGigsWorkspace(role)) {
          setSentBookings([]);
          setSentGroups([]);
          setReceivedBookings([]);
          setHiddenBookingIds(new Set());
          setRecipientProfiles(new Map());
          setSenderProfiles(new Map());
          return;
        }

        const [receivedResult, hiddenIds] = await Promise.all([
          listReceivedBookingRequests(),
          listBookingRequestHistoryHideIds(),
        ]);
        setReceivedBookings(receivedResult);
        setHiddenBookingIds(new Set(hiddenIds));
        setSentBookings([]);
        setSentGroups([]);
        setRecipientProfiles(new Map());

        const senderIds = [...new Set(receivedResult.map((booking) => booking.sender_id))];

        if (senderIds.length > 0) {
          try {
            const profiles = await getBookingRecipientProfilesByIds(senderIds);
            setSenderProfiles(profiles);
          } catch (profileError) {
            logBookingsLoadError(profileError);
            console.error("Failed to load gig sender profiles:", profileError);
            setSenderProfiles(new Map());
          }
        } else {
          setSenderProfiles(new Map());
        }
      } catch (loadError) {
        logBookingsLoadError(loadError);
        console.error("Failed to load bookings:", loadError);
        setSentBookings([]);
        setSentGroups([]);
        setReceivedBookings([]);
        setHiddenBookingIds(new Set());
        setRecipientProfiles(new Map());
        setSenderProfiles(new Map());
        setError(getBookingsLoadErrorMessage(loadError));
      } finally {
        setLoadingList(false);
        setGigsListReady(true);
      }
    }

    loadBookings();
  }, [loadingAccess, role]);

  async function openCreateFlowFromDeepLink(intent: BookingsDeepLinkIntent): Promise<boolean> {
    setCreateOpen(true);
    setSelectedDjIds([]);
    setDjOffers({});
    setSearchQuery("");
    setFailureDetails([]);
    setSuccessMessage(null);
    setEventDateOverride(intent.eventDate ?? null);
    setLoadingDjs(true);
    setLoadingPlans(true);

    if (intent.type === "plan") {
      setCreateStep("details");
      setSelectedPlanId(intent.planId);
      setDetailsEntrySource("event-plans-deeplink");
      setPlanPrefillPending(true);
    }

    try {
      const [bookableDjs, plans] = await Promise.all([
        listBookableDjs(),
        listBookingPlans(),
      ]);

      setDjs(bookableDjs);
      setBookingPlans(plans);

      if (intent.type === "plan") {
        const plan =
          plans.find((item) => item.id === intent.planId) ??
          (await getBookingPlanById(intent.planId));

        if (!plan) {
          setError("Could not load the selected event plan. It may have been deleted.");
          setCreateStep("details");
          setSelectedPlanId(intent.planId);
          setPlanPrefillPending(false);
          return true;
        }

        const input = bookingPlanToRequestInput(plan);
        setForm((prev) => ({
          ...input,
          eventDate: intent.eventDate?.trim() || input.eventDate,
          rateMode: prev.rateMode ?? "fixed",
        }));
        setSelectedPlanId(plan.id);
        setCreateStep("details");
        setPlanPrefillPending(false);
        setError(null);
        return true;
      }

      if (intent.type === "create-booking") {
        setForm({
          ...emptyForm,
          eventDate: intent.eventDate ?? "",
        });
        setSelectedPlanId(null);
        setDetailsEntrySource("create-booking-deeplink");
        setCreateStep("details");
        setError(null);
        return true;
      }

      setForm({
        ...emptyForm,
        eventDate: intent.eventDate ?? "",
      });
      setSelectedPlanId(null);
      setCreateStep("pick-plan");
      setError(null);
      return true;
    } catch (loadError) {
      console.error("Failed to open bookings deep link:", loadError);
      setError(loadError instanceof Error ? loadError.message : "Failed to start booking flow");
      if (intent.type === "plan") {
        setPlanPrefillPending(false);
      }
      setCreateStep(
        intent.type === "plan"
          ? "details"
          : intent.type === "create-plan"
            ? "pick-plan"
            : "source",
      );
      return true;
    } finally {
      setLoadingDjs(false);
      setLoadingPlans(false);
    }
  }

  useEffect(() => {
    const intent = resolveBookingsDeepLinkIntent(searchParams);

    if (!intent) {
      return;
    }

    const resolvedRole = role ?? readCachedNavRole();

    if (!canCreateBookings(resolvedRole)) {
      return;
    }

    if (loadingAccess && !resolvedRole) {
      return;
    }

    const deepLinkKey = getBookingsDeepLinkKey(intent);

    if (deepLinkCompletedKeyRef.current === deepLinkKey) {
      return;
    }

    if (deepLinkInFlightKeyRef.current === deepLinkKey) {
      return;
    }

    deepLinkInFlightKeyRef.current = deepLinkKey;
    let cancelled = false;

    void openCreateFlowFromDeepLink(intent)
      .then((opened) => {
        if (cancelled || !opened) {
          return;
        }

        deepLinkCompletedKeyRef.current = deepLinkKey;

        if (intent.type === "plan") {
          clearPendingBookingPlanId();
        }

        router.replace("/bookings", { scroll: false });
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        console.error("Failed to process bookings deep link:", loadError);
        setCreateOpen(true);
        if (intent.type === "plan") {
          setPlanPrefillPending(false);
        }
        setError(loadError instanceof Error ? loadError.message : "Failed to start booking flow");
        deepLinkCompletedKeyRef.current = deepLinkKey;
      })
      .finally(() => {
        if (!cancelled && deepLinkInFlightKeyRef.current === deepLinkKey) {
          deepLinkInFlightKeyRef.current = null;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams, loadingAccess, role, router]);

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
    if (options?.planId) {
      await openCreateFlowFromDeepLink({
        type: "plan",
        planId: options.planId,
        eventDate: options.eventDate,
      });
      return;
    }

    if (options?.custom || options?.initialStep === "details") {
      await openCreateFlowFromDeepLink({
        type: "create-booking",
        eventDate: options?.eventDate,
      });
      return;
    }

    if (options?.initialStep === "pick-plan") {
      await openCreateFlowFromDeepLink({
        type: "create-plan",
        eventDate: options?.eventDate,
      });
      return;
    }

    setCreateOpen(true);
    setSelectedDjIds([]);
    setDjOffers({});
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

  function resetCreateFlowState(options?: { preserveDeepLinkCompletion?: boolean }) {
    setCreateOpen(false);
    setCreateStep("source");
    setForm(emptyForm);
    setSelectedPlanId(null);
    setDetailsEntrySource(null);
    setPlanPrefillPending(false);
    setBookingPlans([]);
    setSelectedDjIds([]);
    setDjOffers({});
    setSearchQuery("");
    setFailureDetails([]);
    setEventDateOverride(null);
    setError(null);
    setUnavailableConfirmOpen(false);
    setEventBookings([]);
    clearPendingBookingPlanId();

    if (!options?.preserveDeepLinkCompletion) {
      deepLinkCompletedKeyRef.current = null;
    }

    deepLinkInFlightKeyRef.current = null;
  }

  function closeCreateFlow() {
    if (sending) {
      return;
    }

    resetCreateFlowState();
  }

  function finishCreateFlowAfterSend(successMessage: string) {
    const returnToEventPlans = detailsEntrySource === "event-plans-deeplink";
    const intent = resolveBookingsDeepLinkIntent(searchParams);

    if (intent) {
      deepLinkCompletedKeyRef.current = getBookingsDeepLinkKey(intent);
    }

    resetCreateFlowState({ preserveDeepLinkCompletion: true });

    if (returnToEventPlans) {
      stashBookingPlansSuccessMessage(successMessage);
      router.replace(EVENTS_AREA_SUB_NAV.bookingPlans.href, { scroll: false });
      return;
    }

    setSuccessMessage(successMessage);
    router.replace("/bookings", { scroll: false });
  }

  function handleDetailsBack() {
    setError(null);

    if (detailsEntrySource === "event-plans-deeplink") {
      closeCreateFlow();
      router.push(EVENTS_AREA_SUB_NAV.bookingPlans.href);
      return;
    }

    if (detailsEntrySource === "pick-plan") {
      setCreateStep("pick-plan");
      return;
    }

    setCreateStep("source");
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

    setSelectedDjIds((prev) => {
      if (prev.includes(userId)) {
        setDjOffers((offers) => {
          const next = { ...offers };
          delete next[userId];
          return next;
        });
        return prev.filter((id) => id !== userId);
      }

      setDjOffers((offers) => ({
        ...offers,
        [userId]: offers[userId] ?? createDefaultDjSendOffer(),
      }));

      return [...prev, userId];
    });
  }

  function updateDjOffer(userId: string, offer: DjSendOffer) {
    setDjOffers((prev) => ({ ...prev, [userId]: offer }));
  }

  function getSendValidationError(recipientIds: string[]): string | null {
    for (const djId of recipientIds) {
      const offer = djOffers[djId] ?? DEFAULT_DJ_SEND_OFFER;

      if (offer.rateMode === "fixed" && !isPositiveWholeDollarRate(offer.fee)) {
        const dj = djs.find((item) => item.user_id === djId);
        const name = dj?.display_name?.trim() || "each selected DJ";

        return `Enter a positive whole-dollar fixed offer for ${name}.`;
      }
    }

    return null;
  }

  function handleSelectSavedPlan(plan: BookingPlan) {
    const input = bookingPlanToRequestInput(plan);
    setForm((prev) => ({
      ...input,
      eventDate: eventDateOverride ?? input.eventDate,
      rateMode: prev.rateMode ?? "fixed",
    }));
    setSelectedPlanId(plan.id);
    setDetailsEntrySource("pick-plan");
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

    const dateValidationError = getEventDateValidationError(form.eventDate, form.setTime);

    if (dateValidationError) {
      setError(dateValidationError);
      return;
    }

    const notesValidationError = getEventNotesValidationError(form.notes);

    if (notesValidationError) {
      setError(notesValidationError);
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

    const validationError = getSendValidationError(sendableIds);

    if (validationError) {
      setError(validationError);
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
      const { successes, failures, skippedDuplicateRecipientIds } =
        await sendBookingRequestsToDjs(
          sendableIds,
          {
            eventName: form.eventName,
            venue: form.venue,
            eventDate: form.eventDate,
            setTime: form.setTime,
            notes: form.notes,
            fee: "",
            eventId: form.eventId,
          },
          {
            existingEventBookings: form.eventId ? duplicateSource : undefined,
            perRecipient: (recipientId) => {
              const offer = djOffers[recipientId] ?? DEFAULT_DJ_SEND_OFFER;

              return {
                rateMode: offer.rateMode,
                fee: normalizeStoredRate(offer.fee),
              };
            },
          },
        );
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

      const message = buildBookingSendResultMessage(successes.length, skippedCount);
      setUnavailableConfirmOpen(false);
      finishCreateFlowAfterSend(message);
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
    const [sentResult, hiddenIds] = await Promise.all([
      listSentBookingRequests(),
      listBookingRequestHistoryHideIds(),
    ]);
    setSentBookings(sentResult);
    setHiddenBookingIds(new Set(hiddenIds));
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

  async function handleRemoveGigsFromHistory(bookingIds: string[]) {
    setError(null);
    setSuccessMessage(null);

    try {
      const { successes, failures } = await hideBookingRequestsFromHistory(bookingIds);

      if (successes.length > 0) {
        setHiddenBookingIds((current) => new Set([...current, ...successes]));
        setSuccessMessage(
          `${successes.length} gig${successes.length === 1 ? "" : "s"} removed from history.`,
        );
      }

      if (failures.length > 0) {
        const message =
          failures.length === bookingIds.length
            ? "Could not remove selected gigs from history."
            : `${failures.length} gig${failures.length === 1 ? "" : "s"} could not be removed from history.`;

        setError(message);

        if (successes.length === 0) {
          throw new Error(message);
        }
      }
    } catch (removeError) {
      console.error("Failed to remove gigs from history:", removeError);
      setError(getBookingMutationErrorMessage(removeError));
      throw removeError;
    }
  }

  if (!loadingAccess && !canAccessBookings(displayRole)) {
    return null;
  }

  const showDetailsPlanSkeleton = useMemo(() => {
    if (effectiveCreateStep !== "details") {
      return false;
    }

    if (detailsEntrySource === "pick-plan") {
      return false;
    }

    const fromSavedPlanEntry =
      detailsEntrySource === "event-plans-deeplink" ||
      Boolean(effectiveSelectedPlanId) ||
      deepLinkIntent?.type === "plan";

    if (!fromSavedPlanEntry) {
      return false;
    }

    return planPrefillPending || loadingPlans;
  }, [
    effectiveCreateStep,
    detailsEntrySource,
    effectiveSelectedPlanId,
    deepLinkIntent,
    planPrefillPending,
    loadingPlans,
  ]);

  const showPlannerCreateDeepLink = plannerCreateVisible;
  const createStepMeta = getCreateStepMeta(effectiveCreateStep);

  return (
    <OnboardingGuard>
      <PlannerWorkspacePage
        title={plannerCreateVisible ? "Event Plans" : "Gigs"}
        initialRole={displayRole}
        activeWorkspaceHref={
          plannerCreateVisible ? EVENTS_AREA_SUB_NAV.bookingPlans.href : undefined
        }
        secondaryControlsSlot={
          showGigsWorkspace && !plannerCreateVisible ? (
            <DjGigsTabRow
              showManageButton={
                djGigsView === "history" &&
                gigsListReady &&
                !loadingList &&
                gigsHistoryBulkManage.showManageControl &&
                !gigsHistoryBulkManage.selectionMode
              }
              onManageClick={gigsHistoryBulkManage.enterSelectionMode}
            >
              <DjGigsTabs
                activeView={djGigsView}
                bookings={receivedBookings}
                hiddenBookingIds={hiddenBookingIds}
              />
            </DjGigsTabRow>
          ) : undefined
        }
        secondaryControlsPlaceholder={showGigsWorkspace && plannerCreateVisible}
      >

          {successMessage ? (
            <p className="mb-4 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-3 text-sm text-ftc-text-secondary">
              {successMessage}
            </p>
          ) : null}

          {djGigsView === "history" && !plannerCreateVisible && gigsHistoryBulkManage.showSelectionToolbar ? (
            <HistorySelectionToolbar
              selectedCount={gigsHistoryBulkManage.selectedCount}
              allSelected={gigsHistoryBulkManage.allSelected}
              removing={gigsHistoryBulkManage.removing}
              onCancel={gigsHistoryBulkManage.cancelSelectionMode}
              onSelectAll={gigsHistoryBulkManage.selectAll}
              onRemove={gigsHistoryBulkManage.openConfirm}
            />
          ) : null}

          <HistoryRemoveConfirmDialog
            open={gigsHistoryBulkManage.confirmOpen}
            count={gigsHistoryBulkManage.confirmCount}
            loading={gigsHistoryBulkManage.removing}
            onCancel={gigsHistoryBulkManage.closeConfirm}
            onConfirm={() => {
              void gigsHistoryBulkManage.confirmRemove(handleRemoveGigsFromHistory);
            }}
          />

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

          {showPlannerCreateDeepLink ? (
            <section className="mb-6 ftc-card p-4 sm:p-5">
              <div
                className={
                  effectiveCreateStep === "details"
                    ? "mb-4 flex items-start justify-between gap-3"
                    : "mb-4 flex items-center justify-between gap-3"
                }
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ftc-text-muted">
                    Step {createStepMeta.label}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-ftc-text">{createStepMeta.title}</h2>
                  {effectiveCreateStep === "details" ? (
                    showDetailsPlanSkeleton ? (
                      <SkeletonBlock className="mt-1 h-4 w-[10rem] max-w-full rounded-sm" />
                    ) : selectedSavedPlanName ? (
                      <p className="mt-1 text-sm text-ftc-text-muted">{selectedSavedPlanName}</p>
                    ) : null
                  ) : null}
                </div>
                {effectiveCreateStep === "details" ? (
                  <button
                    type="button"
                    onClick={handleDetailsBack}
                    className="shrink-0 py-1 text-xs font-semibold uppercase tracking-wide text-ftc-text-muted transition hover:text-ftc-text-secondary"
                  >
                    Back
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={closeCreateFlow}
                    disabled={sending}
                    className="text-xs font-semibold uppercase tracking-wide text-ftc-text-muted transition hover:text-ftc-text-secondary disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {effectiveCreateStep === "source" ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setCreateStep("pick-plan");
                    }}
                    className="w-full rounded-2xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-4 text-left transition hover:border-ftc-border-strong"
                  >
                    <p className="text-base font-semibold text-ftc-text">Use a saved event plan</p>
                    <p className="mt-2 text-sm text-ftc-text-secondary">
                      Prefill booking details from one of your saved event plans, then edit before sending
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => openCreateFlow({ custom: true })}
                    className="w-full rounded-2xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-4 text-left transition hover:border-ftc-border-strong"
                  >
                    <p className="text-base font-semibold text-ftc-text">Create a custom booking request</p>
                    <p className="mt-2 text-sm text-ftc-text-secondary">
                      Enter fresh booking details from scratch
                    </p>
                  </button>
                  {error ? <p className="text-sm text-red-400">{error}</p> : null}
                </div>
              ) : null}

              {effectiveCreateStep === "pick-plan" ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setCreateStep("source")}
                    className="text-xs font-semibold uppercase tracking-wide text-ftc-text-muted transition hover:text-ftc-text-secondary"
                  >
                    ← Back
                  </button>

                  {loadingPlans ? (
                    <p className="text-sm text-ftc-text-muted">Loading saved event plans...</p>
                  ) : bookingPlans.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-ftc-border bg-ftc-bg-elevated/40 px-4 py-6 text-center">
                      <p className="text-sm text-ftc-text-secondary">No saved event plans yet</p>
                      <Link
                        href="/booking-plans"
                        className="mt-3 inline-block text-sm font-semibold text-ftc-primary transition hover:text-ftc-primary/90"
                      >
                        Create an event plan
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
                              {plan.event_name} · {plan.venue}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {error ? <p className="text-sm text-red-400">{error}</p> : null}
                </div>
              ) : null}

              {effectiveCreateStep === "details" ? (
                showDetailsPlanSkeleton ? (
                  <BookingCreateEventDetailsFormSkeleton />
                ) : (
                <form onSubmit={handleContinueToDjSelection} className="space-y-4">
                  <PlannerFormField
                    label="Event name"
                    value={form.eventName}
                    onChange={(value) => updateField("eventName", value)}
                    placeholder="Event name"
                    required
                  />
                  <PlannerFormField
                    label="Venue"
                    value={form.venue}
                    onChange={(value) => updateField("venue", value)}
                    placeholder="Venue"
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
                    eventDate={form.eventDate}
                  />
                  <PlannerFormField
                    label="Notes"
                    value={form.notes}
                    onChange={(value) => updateField("notes", value)}
                    placeholder="Notes"
                    multiline
                    maxLength={MAX_EVENT_NOTES_LENGTH}
                  />

                  {error && error !== detailsFormValidationError ? (
                    <p className="text-sm text-red-400">{error}</p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={Boolean(detailsFormValidationError)}
                    aria-disabled={Boolean(detailsFormValidationError)}
                    title={detailsFormValidationError ?? undefined}
                    className="ftc-btn-primary px-5 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continue to DJ selection
                  </button>
                </form>
                )
              ) : null}

              {effectiveCreateStep === "select-djs" ? (
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
                      {form.venue} · {formatDisplayEventDate(form.eventDate)} · {form.setTime}
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
                      placeholder="Search DJs by name or genre"
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
                    <p className="text-sm text-ftc-text-muted">No DJs match your search</p>
                  ) : (
                    <ul className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                      {filteredDjs.map((dj) => {
                        const selected = selectedDjIds.includes(dj.user_id);
                        const displayName = dj.display_name ?? dj.user_id;
                        const availabilityHint = djAvailabilityHints.get(dj.user_id);
                        const duplicateStatus = eventBookingDuplicates.get(dj.user_id);
                        const isDuplicateBlocked = Boolean(duplicateStatus);
                        const offer = djOffers[dj.user_id] ?? createDefaultDjSendOffer();

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
                            {selected ? (
                              <div className="mt-2 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated p-3">
                                <EventDjSendOfferControls
                                  key={dj.user_id}
                                  offer={offer}
                                  disabled={sending}
                                  onChange={(nextOffer) => updateDjOffer(dj.user_id, nextOffer)}
                                />
                              </div>
                            ) : null}
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

                  {sendOfferSummary.length > 0 ? (
                    <div className="rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ftc-text-muted">
                        Send summary
                      </p>
                      <ul className="mt-3 space-y-2">
                        {sendOfferSummary.map((item) => (
                          <li
                            key={item.djId}
                            className="flex items-start justify-between gap-3 text-sm"
                          >
                            <span className="min-w-0 truncate font-medium text-ftc-text">
                              {item.name}
                            </span>
                            <span className="shrink-0 text-right text-ftc-text-secondary">
                              {item.summary}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {hasInvalidFixedOffers ? (
                        <p className="mt-3 text-xs text-[var(--ftc-color-warning)]">
                          Enter a positive whole-dollar amount for each fixed offer before sending
                        </p>
                      ) : null}
                    </div>
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
                      disabled={
                        sending || sendableSelectedDjIds.length === 0 || hasInvalidFixedOffers
                      }
                      className="flex-1 ftc-btn-primary w-full px-4 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sending
                        ? "Confirming..."
                        : allSelectedAreDuplicates
                          ? "No new DJs to confirm"
                          : `Confirm ${sendableSelectedDjIds.length} DJ${sendableSelectedDjIds.length === 1 ? "" : "s"}`}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {showPlannerGigsEmpty ? (
            <div className="rounded-2xl border border-dashed border-ftc-border-subtle bg-ftc-surface/30 px-6 py-12 text-center">
              <p className="text-base font-medium text-ftc-text-secondary">{PLANNER_GIGS_EMPTY_MESSAGE}</p>
              <Link
                href="/events"
                className="mt-4 inline-flex ftc-btn-secondary px-4 py-2.5 text-xs uppercase tracking-wide"
              >
                Go to Events
              </Link>
            </div>
          ) : showGigsWorkspace && !createOpen ? (
            loadingList ? null : error && !plannerCreateVisible ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : receivedBookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ftc-border-subtle bg-ftc-surface/30 px-6 py-12 text-center">
                <p className="text-base font-medium text-ftc-text-secondary">No gigs yet</p>
              </div>
            ) : filteredReceivedBookings.length === 0 && !gigsHistoryBulkManage.removing ? (
              <p className="rounded-xl border border-ftc-border-subtle bg-ftc-surface/40 px-4 py-8 text-center text-sm text-ftc-text-muted">
                {getGigsEmptyMessage(djGigsView)}
              </p>
            ) : visibleReceivedBookings.length > 0 ? (
              <ul className="ftc-gigs-list space-y-3">
                {visibleReceivedBookings.map((booking) =>
                  djGigsView === "history" ? (
                    <BookingHistoryCard
                      key={booking.id}
                      booking={booking}
                      gigsTab={djGigsView}
                      senderName={senderProfiles.get(booking.sender_id)?.display_name?.trim()}
                      muted
                      selectionMode={gigsHistoryBulkManage.showSelectionToolbar}
                      selected={gigsHistoryBulkManage.selectedIds.has(booking.id)}
                      onToggleSelect={() => gigsHistoryBulkManage.toggleItem(booking.id)}
                    />
                  ) : (
                    <ReceivedBookingCard
                      key={booking.id}
                      booking={booking}
                      gigsTab={djGigsView}
                      senderName={senderProfiles.get(booking.sender_id)?.display_name?.trim()}
                    />
                  ),
                )}
              </ul>
            ) : null
          ) : null}

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
      </PlannerWorkspacePage>
    </OnboardingGuard>
  );
}

function DjGigsTabs({
  activeView,
  bookings,
  hiddenBookingIds,
}: {
  activeView: DjGigsListTab;
  bookings: BookingRequest[];
  hiddenBookingIds: ReadonlySet<string>;
}) {
  const counts = useMemo(
    () => countDjGigsByTab(bookings, hiddenBookingIds),
    [bookings, hiddenBookingIds],
  );

  const tabs: { value: DjGigsListTab; label: string; count?: number; icon?: "history" }[] = [
    { value: "pending", label: "Incoming", count: counts.pending },
    { value: "accepted", label: "Confirmed", count: counts.accepted },
    { value: "history", label: "History", count: counts.history, icon: "history" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
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
              }
            }}
            className={`inline-flex items-center gap-1.5 ftc-filter-pill ${isActive ? "ftc-filter-pill-active" : ""}`}
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
            className={`inline-flex items-center gap-1.5 ftc-filter-pill ${isActive ? "ftc-filter-pill-active" : ""}`}
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

const GIG_CARD_CLASS_NAME =
  "ftc-gig-card ftc-surface-row rounded-[var(--ftc-radius-xl)] p-3 sm:p-4";

function GigCardHeader({
  eventName,
  status,
  plannerLabel,
  muted = false,
}: {
  eventName: string;
  status: BookingRequestStatus;
  plannerLabel?: string;
  muted?: boolean;
}) {
  const titleClass = muted ? "text-ftc-text-secondary" : "text-ftc-text";

  return (
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <h3 className={`min-w-0 flex-1 text-sm font-semibold leading-snug sm:text-base ${titleClass}`}>
          {eventName}
        </h3>
        <BookingStatusBadge status={status} />
      </div>
      {plannerLabel ? (
        <p className="mt-1 text-xs text-ftc-text-muted">{plannerLabel}</p>
      ) : null}
    </div>
  );
}

function GigCardMetaRows({
  venue,
  eventDate,
  setTime,
  rateLabel,
  extraLine,
  muted = false,
}: {
  venue?: string;
  eventDate?: string;
  setTime?: string;
  rateLabel?: string;
  extraLine?: string;
  muted?: boolean;
}) {
  const textClass = muted ? "text-ftc-text-muted" : "text-ftc-text-secondary";
  const venueDateParts = [venue?.trim(), eventDate?.trim() ? formatDisplayEventDate(eventDate) : ""].filter(Boolean);
  const venueDateLine = venueDateParts.join(" · ");
  const setTimeLine = setTime?.trim() || "TBC";
  const showRate = Boolean(rateLabel?.trim());

  return (
    <div className={`ftc-gig-card-meta mt-2 min-w-0 space-y-1 overflow-hidden text-xs sm:text-sm ${textClass}`}>
      {venueDateLine ? (
        <p className="min-w-0 max-w-full overflow-hidden break-words">{venueDateLine}</p>
      ) : null}
      <p className="min-w-0 max-w-full overflow-hidden break-words">{setTimeLine}</p>
      {showRate ? (
        <p className="min-w-0 max-w-full overflow-hidden break-words">{rateLabel}</p>
      ) : null}
      {extraLine ? (
        <p className="min-w-0 max-w-full overflow-hidden break-words text-xs text-ftc-text-muted">
          {extraLine}
        </p>
      ) : null}
    </div>
  );
}

function GigCardSecondaryAction({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border border-ftc-border-subtle bg-ftc-bg-elevated/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-muted transition hover:border-ftc-border-strong hover:text-ftc-text-secondary sm:flex-none"
    >
      {children}
    </Link>
  );
}

function ReceivedBookingCard({
  booking,
  gigsTab = "pending",
  senderName,
}: {
  booking: BookingRequest;
  gigsTab?: DjGigsListTab;
  senderName?: string;
}) {
  const eventHref = booking.event_id ? buildGigsEventDetailHref(booking.event_id, gigsTab) : null;
  const conversationHref = `/dm/${booking.conversation_id}?from=bookings${
    gigsTab === "pending" ? "" : `&tab=${gigsTab}`
  }`;
  const rateLabel = getBookingCollapsedOfferSummary(booking);
  const isConfirmed = gigsTab === "accepted";
  const plannerLabel = senderName ? `From ${senderName}` : undefined;

  const cardBody = (
    <div className="flex min-w-0 max-w-full flex-col gap-3 overflow-hidden">
      <GigCardHeader
        eventName={booking.event_name}
        status={booking.status}
        plannerLabel={plannerLabel}
      />
      <GigCardMetaRows
        venue={booking.venue}
        eventDate={booking.event_date}
        setTime={booking.set_time}
        rateLabel={rateLabel}
      />
      {!isConfirmed ? (
        <div className="flex min-w-0 justify-end">
          <Link
            href={conversationHref}
            className="ftc-btn-primary inline-flex min-h-11 shrink-0 items-center justify-center px-3 py-2 text-xs uppercase tracking-wide"
            onClick={(event) => event.stopPropagation()}
          >
            Open conversation
          </Link>
        </div>
      ) : null}
    </div>
  );

  if (isConfirmed && eventHref) {
    return (
      <li className="min-w-0">
        <Link
          href={eventHref}
          className={`${GIG_CARD_CLASS_NAME} block w-full min-w-0 focus-visible:outline-none`}
        >
          {cardBody}
        </Link>
      </li>
    );
  }

  return <li className={`${GIG_CARD_CLASS_NAME} min-w-0`}>{cardBody}</li>;
}

function BookingHistoryCard({
  booking,
  muted = true,
  subtitle,
  senderName,
  avatarName,
  avatarUrl,
  action,
  gigsTab,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}: {
  booking: BookingRequest;
  muted?: boolean;
  subtitle?: string;
  senderName?: string;
  avatarName?: string;
  avatarUrl?: string | null;
  action?: React.ReactNode;
  gigsTab?: DjGigsListTab;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const eventHref = booking.event_id
    ? gigsTab
      ? buildGigsEventDetailHref(booking.event_id, gigsTab)
      : `/events/${booking.event_id}`
    : null;
  const cardClass = muted
    ? `${GIG_CARD_CLASS_NAME} bg-ftc-bg-elevated/60`
    : GIG_CARD_CLASS_NAME;
  const cancellationReasonLabel = resolveBookingCancellationReasonLabel(booking);
  const plannerLabel = senderName ? `From ${senderName}` : subtitle;
  const conversationHref = `/dm/${booking.conversation_id}?from=bookings${
    gigsTab ? `&tab=${gigsTab}` : ""
  }`;
  const selectionLabel = `Select ${booking.event_name} for removal from history`;

  const cardBody = (
    <div className="flex min-w-0 max-w-full flex-col gap-3 overflow-hidden">
      <div className="flex min-w-0 gap-3">
        {selectionMode ? (
          <HistorySelectionCheckbox checked={selected} label={selectionLabel} presentational />
        ) : null}
        {avatarName ? (
          <ProfileAvatar name={avatarName} avatarUrl={avatarUrl} size="sm" className="mt-0.5" />
        ) : null}
        <div className="min-w-0 flex-1">
          <GigCardHeader
            eventName={booking.event_name}
            status={booking.status}
            plannerLabel={plannerLabel}
            muted={muted}
          />
          <GigCardMetaRows
            venue={booking.venue}
            eventDate={booking.event_date}
            setTime={booking.set_time}
            rateLabel={getBookingOfferRateLabel(booking)}
            extraLine={cancellationReasonLabel ?? undefined}
            muted={muted}
          />
        </div>
      </div>

      {selectionMode ? null : (
        <div className="flex flex-wrap gap-2">
          {action}
          {eventHref ? (
            <GigCardSecondaryAction href={eventHref}>View event</GigCardSecondaryAction>
          ) : null}
          <GigCardSecondaryAction href={conversationHref}>Open conversation</GigCardSecondaryAction>
        </div>
      )}
    </div>
  );

  if (selectionMode) {
    return (
      <li className="min-w-0">
        <button
          type="button"
          onClick={onToggleSelect}
          aria-label={selectionLabel}
          aria-pressed={selected}
          className={`${cardClass} block w-full min-w-0 text-left focus-visible:outline-none ${
            selected ? "ring-1 ring-ftc-primary/40" : ""
          }`}
        >
          {cardBody}
        </button>
      </li>
    );
  }

  return (
    <li className={`${cardClass} min-w-0`}>
      {cardBody}
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
  const campaignRateLabel = group.requests[0]
    ? getBookingOfferRateLabel(group.requests[0])
    : formatRateDisplay(group.fee);

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
            <CampaignDetail label="Event date" value={formatDisplayEventDate(group.event_date)} />
            <CampaignDetail label="Set time" value={group.set_time} />
            <CampaignDetail label="Rate" value={campaignRateLabel} />
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
          const pendingRateProposal = hasPendingRateProposal(request);

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
                  {pendingRateProposal ? (
                    <p className="mt-1 text-xs font-medium text-ftc-primary">
                      Rate proposed: {formatIntegerRateDisplay(request.proposed_rate)}
                      <span className="font-normal text-ftc-text-muted"> · Review in DM</span>
                    </p>
                  ) : null}
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
                  href={`/dm/${request.conversation_id}?from=bookings`}
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
