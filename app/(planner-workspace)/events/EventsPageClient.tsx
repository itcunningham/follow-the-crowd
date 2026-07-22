"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import { useGuardProfile } from "@/app/components/GuardProfileContext";
import EventDateStatusBadge from "@/app/components/EventDateStatusBadge";
import {
  PlannerWorkspacePage,
} from "@/app/components/planner/PlannerWorkspaceLayout";
import {
  PlannerBackLink,
  PlannerEmptyState,
  PlannerFormCard,
  PlannerFormField,
  PlannerInlineError,
  PlannerLinkAction,
  PlannerOptionCard,
  PlannerStatChip,
} from "@/app/components/planner/PlannerUi";
import { BookingDateField, BookingSetTimeRangeField } from "@/app/components/BookingDateTimeFields";
import {
  applyEventDateFieldChange,
  getTodayDateKey,
  formatDisplayEventDate,
  sanitizePrefilledEventDateKey,
} from "@/lib/bookingDateTime";
import {
  getEventFormFieldErrors,
  hasEventFormFieldErrors,
  MAX_EVENT_NAME_LENGTH,
  MAX_EVENT_VENUE_LENGTH,
} from "@/lib/events/eventFormFieldValidation";
import { getEventNotesValidationError, MAX_EVENT_NOTES_LENGTH } from "@/lib/events/eventNotes";
import EventCoverImageField, {
  emptyEventCoverImageFieldState,
  type EventCoverImageFieldState,
} from "@/app/components/events/EventCoverImageField";
import EventFallbackColourField from "@/app/components/events/EventFallbackColourField";
import SendBookingRequestsPanel from "@/app/components/booking/SendBookingRequestsPanel";
import SendBookingRequestsModal from "@/app/components/booking/SendBookingRequestsModal";
import { useSendBookingRequestsDraft } from "@/app/components/booking/useSendBookingRequestsDraft";
import { EventDetailPrimaryAction } from "@/app/components/event-detail/EventDetailBottomBar";
import UnavailableDjBookingConfirmModal from "@/app/components/UnavailableDjBookingConfirmModal";
import { EventCoverImageListThumb } from "@/app/components/events/EventCoverImageDisplay";
import {
  EVENTS_LIST_TAB_ROW_CLASS,
  FTC_EVENTS_LIST_TAB_ACTION_CLASS,
  FTC_EVENTS_LIST_TAB_ACTION_PLACEHOLDER_CLASS,
  FTC_LIST_GAP_CLASS,
  FTC_PILL_ROW_GAP_CLASS,
  ftcFilterPillClass,
} from "@/lib/design/ftcDesignSystem";
import { EventListSkeleton, EventsListTabRow } from "@/app/components/skeleton/Skeleton";
import {
  HistoryRemoveConfirmDialog,
  HistorySelectionToolbar,
  filterOutRemovingHistoryItems,
  useHistoryBulkManage,
} from "@/app/components/history/HistoryBulkManage";
import type { EventSelectableFallbackColourKey } from "@/lib/events/eventFallbackColour";
import {
  buildCalendarPostCreateBookingSuccessMessage,
  stashEventCreateInviteMessage,
} from "@/lib/events/eventCreateInviteMessages";
import {
  formatBookingSendFailureMessage,
  sendBookingRequestsForRecipients,
} from "@/lib/bookings/sendBookingRequestsFlow";
import { listBookingPlans, type BookingPlan } from "@/lib/bookingPlans";
import {
  attachLineupStats,
  createEvent,
  eventFormToRequestInput,
  eventInputFromBookingPlan,
  filterPlannerHistoryTabEvents,
  filterVisiblePlannerHistoryEvents,
  getEventsLoadErrorMessage,
  hideEventsFromHistory,
  isEventCancelled,
  isPlannerEventActive,
  listDjInvitedEvents,
  listOwnedEvents,
  resolvePlannerHistoryHideEventIds,
  sortEventsByStartAscending,
  sortEventsByStartDescending,
  updateEventCoverImageUrl,
  type Event,
  type EventInput,
  type EventWithLineupStats,
} from "@/lib/events";
import {
  uploadEventCoverImage,
} from "@/lib/events/eventCoverImage";
import {
  buildPlannerCalendarHref,
  resolveCalendarOriginDateKey,
  stashPlannerCalendarReturnDate,
} from "@/lib/calendar";
import {
  buildEventDetailHref,
  buildEventsListHref,
  type EventsListTab,
  isCalendarOriginEventsFlow,
  resolveCalendarCreateBootstrapState,
  resolveCalendarCreateInitialStep,
  resolveCalendarSaveReturnDateKey,
  resolveEventsHistoryTrashVisible,
  resolveEventsListTabParam,
  resolveEventsWorkspaceActiveHref,
} from "@/lib/events/eventsListNavigation";
import {
  canManageEvents,
  getCurrentUserProfile,
  type UserRole,
} from "@/lib/user/currentUser";
import { readCachedNavRole } from "@/lib/navigationRoleCache";
import { prepareEventsListEventNavigation } from "@/lib/navigation/prepareMobileDocumentScrollReset";
import { readEventsListCache, writeEventsListCache } from "@/lib/events/eventsListCache";
import { writeBookingPlansListCache } from "@/lib/bookingPlans/bookingPlansListCache";
import { seedEventOwnerId, seedEventOwnerIdsFromEvents } from "@/lib/events/eventOwnerIdCache";

const emptyEventForm: EventInput = {
  name: "",
  venue: "",
  eventDate: "",
  setTime: "",
  rate: "",
  notes: "",
  bookingPlanId: null,
  fallbackColour: null,
};

type CreateStep = "source" | "pick-plan" | "form";

type PendingPostCreateInviteSend = {
  createdEvent: Event;
  recipientIds: string[];
  originDateKey: string | null;
};

type EventsPageClientProps = {
  initialTab: string | null;
  initialCreate?: string | null;
  initialEventDate?: string | null;
};

function readCreateParamsFromLocation(): { create: string | null; eventDate: string | null } {
  if (typeof window === "undefined") {
    return { create: null, eventDate: null };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    create: params.get("create"),
    eventDate: params.get("eventDate"),
  };
}

function getCalendarBootstrapState(
  initialCreate?: string | null,
  initialEventDate?: string | null,
) {
  const locationParams = readCreateParamsFromLocation();

  return resolveCalendarCreateBootstrapState(
    initialCreate ?? locationParams.create,
    initialEventDate ?? locationParams.eventDate,
  );
}

const EVENT_LIST_CARD_CHEVRON_SLOT_CLASS = "mt-0.5 h-4 w-4 shrink-0";

const EVENTS_HEADER_CREATE_EVENT_PLACEHOLDER = (
  <span
    aria-hidden="true"
    className="pointer-events-none invisible inline-flex shrink-0 ftc-btn-primary px-4 py-2.5 text-sm uppercase tracking-wide"
  >
    Create event
  </span>
);

function EventsListCardChevron() {
  return (
    <span aria-hidden="true" className={`${EVENT_LIST_CARD_CHEVRON_SLOT_CLASS} text-ftc-text-muted`}>
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </span>
  );
}

/** Reserves chevron slot when showChevron is false (same alignment as visible chevron). */
function EventsListCardChevronSlot({ showChevron }: { showChevron: boolean }) {
  if (showChevron) {
    return <EventsListCardChevron />;
  }

  return (
    <span
      aria-hidden="true"
      className={`${EVENT_LIST_CARD_CHEVRON_SLOT_CLASS} invisible pointer-events-none`}
    />
  );
}

const EVENT_LIST_CARD_SHELL_CLASS =
  "ftc-gig-card ftc-surface-row rounded-[var(--ftc-radius-xl)] py-2 px-2.5 sm:p-4";

/** Two columns: fixed artwork | flexible text stack (matches GIG_CARD_BODY rhythm). */
const EVENT_LIST_CARD_ROW_CLASS =
  "flex min-w-0 max-w-full items-start gap-2 text-left sm:gap-2.5";

const EVENT_LIST_CARD_ARTWORK_CLASS = "shrink-0 self-start";

const EVENT_LIST_CARD_BODY_CLASS =
  "flex min-w-0 max-w-full flex-1 flex-col gap-1 overflow-hidden text-left sm:gap-3";

const EVENT_LIST_CARD_SUMMARY_CLASS =
  "flex min-w-0 flex-wrap justify-start gap-1.5 text-left";

/** Active tab: tighter pill spacing; wraps when double-digit counts exceed text column width. */
const EVENT_LIST_CARD_SUMMARY_ACTIVE_SINGLE_ROW_CLASS =
  "flex min-w-0 flex-wrap items-center justify-start gap-0.5 text-left [&>*]:shrink-0";

function EventsListCardContent({
  event,
  cancelled,
  isPlanner,
  leading,
  showChevron = true,
  statusPillsSingleRow = false,
  dimCancelledAppearance = true,
}: {
  event: EventWithLineupStats;
  cancelled: boolean;
  isPlanner: boolean;
  leading?: ReactNode;
  showChevron?: boolean;
  /** Events → Active & History: compact booking-count pill row (same layout). */
  statusPillsSingleRow?: boolean;
  /** When false, title/meta use Active typography even if event is cancelled (History tab). */
  dimCancelledAppearance?: boolean;
}) {
  const applyCancelledTypography = cancelled && dimCancelledAppearance;
  const titleClassName = applyCancelledTypography ? "text-ftc-text-secondary" : "text-ftc-text";
  const metaClassName = applyCancelledTypography ? "text-ftc-text-muted" : "text-ftc-text-secondary";
  const venueDateLine = [event.venue?.trim(), formatDisplayEventDate(event.event_date)]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={EVENT_LIST_CARD_ROW_CLASS}>
      {leading}
      <div className={EVENT_LIST_CARD_ARTWORK_CLASS}>
        <EventCoverImageListThumb
          eventName={event.name}
          coverImageUrl={event.cover_image_url}
          fallbackColour={event.fallback_colour}
        />
      </div>
      <div className={EVENT_LIST_CARD_BODY_CLASS}>
        <div className="min-w-0 w-full text-left">
          <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-2.5">
            <h3
              className={`min-w-0 flex-1 text-left text-sm font-bold leading-snug line-clamp-2 sm:text-base ${titleClassName}`}
            >
              {event.name}
            </h3>
            <div className="flex shrink-0 items-start gap-1 sm:gap-1.5">
              <span className="mt-0.5 shrink-0">
                <EventDateStatusBadge
                  eventDate={event.event_date}
                  setTime={event.set_time}
                  status={event.status}
                  variant="compact"
                />
              </span>
              <EventsListCardChevronSlot showChevron={showChevron} />
            </div>
          </div>
        </div>
        <div
          className={`ftc-gig-card-meta mt-1 min-w-0 overflow-hidden text-left text-xs sm:mt-2 sm:text-sm ${metaClassName}`}
        >
          <div className="space-y-0.5 text-left">
            {venueDateLine ? (
              <p className="min-w-0 max-w-full overflow-hidden break-words text-left">
                {venueDateLine}
              </p>
            ) : null}
            <p className="min-w-0 max-w-full overflow-hidden break-words text-left text-ftc-text-muted">
              {event.set_time}
            </p>
          </div>
        </div>
        {isPlanner ? (
          <div
            className={
              statusPillsSingleRow
                ? EVENT_LIST_CARD_SUMMARY_ACTIVE_SINGLE_ROW_CLASS
                : EVENT_LIST_CARD_SUMMARY_CLASS
            }
          >
            <PlannerStatChip
              label="Invited"
              value={event.lineupStats.total}
              variant={statusPillsSingleRow ? "compactActiveRow" : "compact"}
            />
            <PlannerStatChip
              label="Pending"
              value={event.lineupStats.pending}
              variant={statusPillsSingleRow ? "compactActiveRow" : "compact"}
            />
            <PlannerStatChip
              label="Accepted"
              value={event.lineupStats.accepted}
              variant={statusPillsSingleRow ? "compactActiveRow" : "compact"}
            />
            <PlannerStatChip
              label="Declined"
              value={event.lineupStats.declined}
              variant={statusPillsSingleRow ? "compactActiveRow" : "compact"}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function eventsListCardShellClassName(
  cancelled: boolean,
  isSelected = false,
  dimCancelledAppearance = true,
) {
  const applyCancelledShellStyle = cancelled && dimCancelledAppearance;
  return [
    "relative overflow-hidden text-left",
    EVENT_LIST_CARD_SHELL_CLASS,
    applyCancelledShellStyle ? "ftc-event-card-cancelled" : "",
    isSelected ? "ring-1 ring-ftc-primary/40" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function EventsPageClient(props: EventsPageClientProps) {
  return (
    <OnboardingGuard>
      <EventsPageClientView {...props} />
    </OnboardingGuard>
  );
}

function EventsPageClientView({
  initialTab,
  initialCreate,
  initialEventDate,
}: EventsPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const guardProfile = useGuardProfile();
  const handledCreateParamsRef = useRef<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(
    () => guardProfile?.role ?? readCachedNavRole(),
  );
  const [events, setEvents] = useState<EventWithLineupStats[]>([]);
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const [loadingEvents, setLoadingEvents] = useState(true);
  const calendarBootstrap = getCalendarBootstrapState(initialCreate, initialEventDate);
  const [createOpen, setCreateOpen] = useState(() => calendarBootstrap?.createOpen ?? false);
  const [createStep, setCreateStep] = useState<CreateStep>(
    () => calendarBootstrap?.createStep ?? "source",
  );
  const [bookingPlans, setBookingPlans] = useState<BookingPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(
    () =>
      Boolean(
        calendarBootstrap?.createOpen && calendarBootstrap.createStep === "pick-plan",
      ),
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [form, setForm] = useState<EventInput>(() => ({
    ...emptyEventForm,
    eventDate: calendarBootstrap?.prefilledEventDate ?? "",
  }));
  const [coverField, setCoverField] = useState<EventCoverImageFieldState>(
    emptyEventCoverImageFieldState,
  );
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [fallbackColour, setFallbackColour] = useState<EventSelectableFallbackColourKey | null>(
    null,
  );
  const [unavailableConfirmOpen, setUnavailableConfirmOpen] = useState(false);
  const [pendingPostCreateInviteSend, setPendingPostCreateInviteSend] =
    useState<PendingPostCreateInviteSend | null>(null);
  const createFlyerActive = Boolean(
    coverField.file || coverPreviewUrl?.startsWith("blob:"),
  );
  const [saving, setSaving] = useState(false);
  const [createSaveAttempted, setCreateSaveAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [historyFeedbackFading, setHistoryFeedbackFading] = useState(false);
  const [eventsListReady, setEventsListReady] = useState(false);
  const [calendarOriginDateKey, setCalendarOriginDateKey] = useState<string | null>(
    () => calendarBootstrap?.calendarOriginDateKey ?? null,
  );
  const [locationRevision, setLocationRevision] = useState(0);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const createParam = searchParams.get("create");
  const isCalendarCreateFlow = isCalendarOriginEventsFlow(
    calendarOriginDateKey,
    createParam,
  );
  const eventsWorkspaceActiveHref = resolveEventsWorkspaceActiveHref(
    calendarOriginDateKey,
    createParam,
  );
  const hideEventsHeaderCreateForCalendarFlow =
    isCalendarCreateFlow && (createOpen || pathname === "/events");

  useEffect(() => {
    if (pathname !== "/events" && calendarOriginDateKey !== null) {
      setCalendarOriginDateKey(null);
    }
  }, [calendarOriginDateKey, pathname]);

  const inviteDraft = useSendBookingRequestsDraft({
    eventDate: form.eventDate,
    enabled: createOpen && createStep === "form" && !isCalendarCreateFlow,
  });
  const queuedInviteDraft = useSendBookingRequestsDraft({
    eventDate: form.eventDate,
    enabled: createOpen && createStep === "form" && isCalendarCreateFlow,
  });
  const modalInviteDraft = useSendBookingRequestsDraft({
    eventDate: form.eventDate,
    enabled:
      createOpen &&
      createStep === "form" &&
      isCalendarCreateFlow &&
      inviteModalOpen,
  });
  const activeInviteDraft = isCalendarCreateFlow ? queuedInviteDraft : inviteDraft;

  useEffect(() => {
    function handlePopState() {
      setLocationRevision((current) => current + 1);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    setLocationRevision((current) => current + 1);
  }, [searchParams]);

  const listTab = useMemo(() => {
    if (typeof window === "undefined") {
      return resolveEventsListTabParam(searchParams.get("tab"), initialTab, null);
    }

    return resolveEventsListTabParam(null, initialTab, window.location.search);
  }, [searchParams, initialTab, locationRevision]);
  const isHistoryTab = listTab === "history";
  const createFormFieldErrors = useMemo(() => {
    if (!createOpen || createStep !== "form" || !createSaveAttempted) {
      return {};
    }

    return getEventFormFieldErrors(form);
  }, [createOpen, createStep, createSaveAttempted, form]);
  const createFormHasFieldErrors = hasEventFormFieldErrors(createFormFieldErrors);
  const createFormNotesValidationError = useMemo(() => {
    if (!createOpen || createStep !== "form" || !createSaveAttempted) {
      return null;
    }

    return getEventNotesValidationError(form.notes);
  }, [createOpen, createStep, createSaveAttempted, form.notes]);
  const createFormHasValidationErrors =
    createFormHasFieldErrors || Boolean(createFormNotesValidationError);
  const showEventsListContent = !isCalendarCreateFlow && !createOpen;

  const resolvedRole = role ?? guardProfile?.role ?? null;
  const isPlanner = canManageEvents(resolvedRole);
  const roleReady = resolvedRole !== null;
  const upcomingEvents = useMemo(() => {
    const filtered = isPlanner
      ? events.filter((event) => isPlannerEventActive(event))
      : events.filter((event) => !isEventCancelled(event));

    return sortEventsByStartAscending(filtered);
  }, [events, isPlanner]);
  const historyEvents = useMemo(() => {
    const filtered = isPlanner
      ? filterPlannerHistoryTabEvents(events)
      : events.filter((event) => isEventCancelled(event));

    return sortEventsByStartDescending(filtered);
  }, [events, isPlanner]);
  const filteredEvents = isHistoryTab ? historyEvents : upcomingEvents;
  const historyBulkManage = useHistoryBulkManage(
    isPlanner && isHistoryTab
      ? filterVisiblePlannerHistoryEvents(filteredEvents)
      : [],
  );
  const visibleFilteredEvents = useMemo(
    () => filterOutRemovingHistoryItems(filteredEvents, historyBulkManage.removingIds),
    [filteredEvents, historyBulkManage.removingIds],
  );
  /** Active + History: shared compact booking-count pill row (Active tab output unchanged). */
  const eventListCardStatusPillsSingleRow = isPlanner;
  /** History uses Active title/meta colours; cancelled dimming is shown via status badge only. */
  const eventListCardDimCancelledAppearance = !isHistoryTab;
  const visibleRemovableHistoryEvents = useMemo(() => {
    if (!isPlanner || !isHistoryTab) {
      return [];
    }

    return visibleFilteredEvents;
  }, [visibleFilteredEvents, isPlanner, isHistoryTab]);
  const canToggleAllHistorySelection = visibleRemovableHistoryEvents.length > 0;
  const canDeleteHistorySelection = historyBulkManage.selectedCount > 0;
  const allVisibleRemovableHistorySelected = useMemo(
    () =>
      visibleRemovableHistoryEvents.length > 0 &&
      visibleRemovableHistoryEvents.every((event) =>
        historyBulkManage.selectedIds.has(event.id),
      ),
    [visibleRemovableHistoryEvents, historyBulkManage.selectedIds],
  );
  const historyLoadSettled = eventsListReady && !loadingEvents;
  const visibleHistoryEventCount = isHistoryTab ? visibleFilteredEvents.length : 0;
  const historyTrashVisible = resolveEventsHistoryTrashVisible({
    isPlanner,
    isHistoryTab,
    createOpen,
    selectionMode: historyBulkManage.selectionMode,
    historyLoadSettled,
    visibleHistoryEventCount,
  });
  const historyTrashButtonDisabled =
    !historyLoadSettled || visibleHistoryEventCount === 0;
  const historyTabRowSelectionMode =
    isPlanner && isHistoryTab && historyBulkManage.showSelectionToolbar;

  useEffect(() => {
    if (!successMessage) {
      setHistoryFeedbackFading(false);
      return;
    }

    setHistoryFeedbackFading(false);
    const fadeTimer = window.setTimeout(() => setHistoryFeedbackFading(true), 2700);
    const clearTimer = window.setTimeout(() => {
      setSuccessMessage(null);
      setHistoryFeedbackFading(false);
    }, 3000);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(clearTimer);
    };
  }, [successMessage]);

  const loadEvents = useCallback(async () => {
    const cachedEvents = readEventsListCache(isPlanner);

    if (cachedEvents.length > 0) {
      setEvents(cachedEvents);
      seedEventOwnerIdsFromEvents(cachedEvents);
      setLoadingEvents(false);
    } else {
      setLoadingEvents(true);
    }

    setError(null);

    try {
      const rows = isPlanner ? await listOwnedEvents() : await listDjInvitedEvents();
      const withStats = await attachLineupStats(rows);
      setEvents(withStats);
      writeEventsListCache(isPlanner, withStats);
    } catch (loadError) {
      console.error("Failed to load events:", loadError);

      if (cachedEvents.length === 0) {
        setEvents([]);
      }

      setError(getEventsLoadErrorMessage(loadError));
    } finally {
      setLoadingEvents(false);
      setEventsListReady(true);
    }
  }, [isPlanner]);

  useEffect(() => {
    if (guardProfile?.role) {
      setRole(guardProfile.role);
      return;
    }

    if (roleReady) {
      return;
    }

    getCurrentUserProfile()
      .then((profile) => {
        setRole(profile?.role ?? null);
      })
      .catch((loadError) => {
        console.error("Failed to load events access:", loadError);
      });
  }, [guardProfile?.role, roleReady]);

  useEffect(() => {
    if (!roleReady || isCalendarCreateFlow) {
      return;
    }

    loadEvents();
  }, [roleReady, loadEvents, isCalendarCreateFlow]);

  useEffect(() => {
    if (!roleReady || !isPlanner) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const createParam = params.get("create");
    const eventDateParam = params.get("eventDate") ?? "";

    if (!createParam) {
      handledCreateParamsRef.current = null;
      return;
    }

    const paramKey = `${createParam}:${eventDateParam}`;

    if (handledCreateParamsRef.current === paramKey) {
      return;
    }

    handledCreateParamsRef.current = paramKey;

    if (createParam === "event") {
      void openCreateFlow({ eventDate: eventDateParam, initialStep: "source" }).finally(() => {
        router.replace("/events");
      });
      return;
    }

    if (createParam === "calendar" || createParam === "calendar-plans") {
      const finishNavigation = () => {
        router.replace("/events");
      };

      if (calendarOriginDateKey) {
        void loadBookingPlansForCreate().finally(finishNavigation);
        return;
      }

      void openCreateFlow({
        eventDate: eventDateParam,
        initialStep: resolveCalendarCreateInitialStep(createParam),
        calendarOriginDateKey: resolveCalendarOriginDateKey(eventDateParam),
      }).finally(finishNavigation);
      return;
    }

    if (createParam === "custom") {
      void openCreateFlow({ eventDate: eventDateParam, initialStep: "form" }).finally(() => {
        router.replace("/events");
      });
      return;
    }

    if (createParam === "plan") {
      void openCreateFlow({ eventDate: eventDateParam, initialStep: "pick-plan" }).finally(() => {
        router.replace("/events");
      });
    }
  }, [roleReady, isPlanner, router]);

  async function loadBookingPlansForCreate() {
    setLoadingPlans(true);
    setError(null);

    try {
      const plans = await listBookingPlans();
      setBookingPlans(plans);
      writeBookingPlansListCache(plans);
    } catch (loadError) {
      console.error("Failed to load booking plans for event create:", loadError);
      setError(loadError instanceof Error ? loadError.message : "Failed to load event plans");
    } finally {
      setLoadingPlans(false);
    }
  }

  function navigateToCalendarOrigin(dateKey: string) {
    stashPlannerCalendarReturnDate(dateKey);
    router.push(buildPlannerCalendarHref(dateKey));
  }

  async function openCreateFlow(options?: {
    eventDate?: string;
    initialStep?: CreateStep;
    calendarOriginDateKey?: string | null;
  }) {
    const originDateKey =
      options?.calendarOriginDateKey ?? resolveCalendarOriginDateKey(options?.eventDate);
    const prefilledEventDate =
      originDateKey ?? sanitizePrefilledEventDateKey(options?.eventDate ?? "");
    setCreateOpen(true);
    setCreateStep(options?.initialStep ?? "source");
    setCreateSaveAttempted(false);
    setCalendarOriginDateKey(originDateKey);
    setForm({
      ...emptyEventForm,
      eventDate: prefilledEventDate,
    });
    setSelectedPlanId(null);
    setError(null);
    setCoverField(emptyEventCoverImageFieldState);
    setCoverPreviewUrl(null);
    setCoverError(null);
    setFallbackColour(null);
    inviteDraft.resetDraft();
    queuedInviteDraft.resetDraft();
    modalInviteDraft.resetDraft();
    setInviteModalOpen(false);
    setUnavailableConfirmOpen(false);
    setPendingPostCreateInviteSend(null);
    await loadBookingPlansForCreate();
  }

  function closeCreateFlow() {
    if (saving) {
      return;
    }

    const originDateKey = calendarOriginDateKey;

    setCreateOpen(false);
    setCreateStep("source");
    setCreateSaveAttempted(false);
    setForm(emptyEventForm);
    setSelectedPlanId(null);
    setError(null);
    setCoverField(emptyEventCoverImageFieldState);
    if (coverPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreviewUrl);
    }
    setCoverPreviewUrl(null);
    setCoverError(null);
    setFallbackColour(null);
    inviteDraft.resetDraft();
    queuedInviteDraft.resetDraft();
    modalInviteDraft.resetDraft();
    setInviteModalOpen(false);
    setUnavailableConfirmOpen(false);
    setPendingPostCreateInviteSend(null);

    if (originDateKey) {
      navigateToCalendarOrigin(originDateKey);
      return;
    }

    setCalendarOriginDateKey(null);
  }

  function handleSelectPlan(plan: BookingPlan) {
    const input = eventInputFromBookingPlan(plan);
    setSelectedPlanId(plan.id);
    setForm({
      ...input,
      eventDate: calendarOriginDateKey ?? input.eventDate,
    });
    setCreateStep("form");
    setError(null);
  }

  function updateField<Key extends keyof EventInput>(key: Key, value: EventInput[Key]) {
    setForm((prev) => {
      if (key === "eventDate" && typeof value === "string") {
        return {
          ...prev,
          eventDate: value,
          setTime: applyEventDateFieldChange(prev.eventDate, value, prev.setTime),
        };
      }

      return { ...prev, [key]: value };
    });
  }

  function openInviteModal() {
    modalInviteDraft.restoreDraft(queuedInviteDraft.getDraftSnapshot());
    setInviteModalOpen(true);
    setError(null);
  }

  function closeInviteModal() {
    setInviteModalOpen(false);
  }

  function queueInviteDraft() {
    const recipientIds = modalInviteDraft.selectedDjIds;
    const validationError = modalInviteDraft.getValidationError(recipientIds);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (recipientIds.length === 0) {
      setError("Select at least one DJ to invite.");
      return;
    }

    queuedInviteDraft.restoreDraft(modalInviteDraft.getDraftSnapshot());
    setError(null);
    setInviteModalOpen(false);
  }

  function finishCreateFlowNavigation(
    createdEventId: string,
    originDateKey: string | null,
    inviteNotice: string | null,
  ) {
    setCreateOpen(false);
    inviteDraft.resetDraft();
    queuedInviteDraft.resetDraft();
    modalInviteDraft.resetDraft();
    setInviteModalOpen(false);
    setUnavailableConfirmOpen(false);
    setPendingPostCreateInviteSend(null);

    if (inviteNotice) {
      stashEventCreateInviteMessage(inviteNotice);
    }

    if (originDateKey) {
      navigateToCalendarOrigin(originDateKey);
      return;
    }

    setCalendarOriginDateKey(null);
    router.push(`/events/${createdEventId}`);
  }

  async function executePostCreateInvites(
    createdEvent: Event,
    recipientIds: string[],
    originDateKey: string | null,
  ) {
    const { successes, failures } = await sendBookingRequestsForRecipients({
      recipientIds,
      bookingInput: eventFormToRequestInput(form, createdEvent.id),
      djOffers: activeInviteDraft.djOffers,
    });

    let inviteNotice: string | null = null;

    if (failures.length > 0) {
      inviteNotice = formatBookingSendFailureMessage(failures, activeInviteDraft.djs);
    } else if (successes.length > 0) {
      inviteNotice = buildCalendarPostCreateBookingSuccessMessage(successes.length);
    }

    setSaving(false);
    finishCreateFlowNavigation(createdEvent.id, originDateKey, inviteNotice);
  }

  async function requestPostCreateInvites(
    createdEvent: Event,
    originDateKey: string | null,
  ) {
    const { sendableIds, skippedIds } = activeInviteDraft.resolveSendableRecipientIds();

    if (skippedIds.length > 0) {
      activeInviteDraft.setSelectedDjIds(sendableIds);
    }

    if (sendableIds.length === 0) {
      setSaving(false);
      finishCreateFlowNavigation(createdEvent.id, originDateKey, null);
      return;
    }

    const validationError = activeInviteDraft.getValidationError(sendableIds);

    if (validationError) {
      const inviteNotice = `Event created, but invites could not be sent: ${validationError}`;
      console.error("Post-create invite validation failed:", validationError);
      setError(inviteNotice);
      setSaving(false);
      finishCreateFlowNavigation(createdEvent.id, originDateKey, inviteNotice);
      return;
    }

    if (activeInviteDraft.unavailableDjWarnings.length > 0) {
      setPendingPostCreateInviteSend({
        createdEvent,
        recipientIds: sendableIds,
        originDateKey,
      });
      setUnavailableConfirmOpen(true);
      setSaving(false);
      return;
    }

    try {
      await executePostCreateInvites(createdEvent, sendableIds, originDateKey);
    } catch (sendError) {
      console.error("Failed to send booking requests after event create:", sendError);
      const message =
        sendError instanceof Error ? sendError.message : "Failed to send booking requests";
      const inviteNotice = `Event created, but invites could not be sent: ${message}`;
      setSaving(false);
      finishCreateFlowNavigation(createdEvent.id, originDateKey, inviteNotice);
    }
  }

  async function handleSaveEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setCreateSaveAttempted(true);
    setError(null);

    const fieldErrors = getEventFormFieldErrors(form);

    if (hasEventFormFieldErrors(fieldErrors)) {
      return;
    }

    if (getEventNotesValidationError(form.notes)) {
      return;
    }

    if (activeInviteDraft.selectedDjIds.length > 0) {
      const { sendableIds } = activeInviteDraft.resolveSendableRecipientIds();
      const inviteValidationError = activeInviteDraft.getValidationError(sendableIds);

      if (inviteValidationError) {
        setError(inviteValidationError);
        return;
      }
    }

    setSaving(true);
    setError(null);

    const originDateKey = resolveCalendarSaveReturnDateKey(
      calendarOriginDateKey,
      form.eventDate,
      isCalendarCreateFlow,
    );

    try {
      const created = await createEvent({
        ...form,
        fallbackColour,
      });

      if (coverField.file) {
        try {
          const coverUrl = await uploadEventCoverImage(created.id, coverField.file);
          await updateEventCoverImageUrl(created.id, coverUrl);
        } catch (uploadError) {
          console.error("Failed to upload event cover image:", uploadError);
          setSaving(false);
          setCalendarOriginDateKey(null);
          setCreateOpen(false);
          inviteDraft.resetDraft();
          queuedInviteDraft.resetDraft();
          modalInviteDraft.resetDraft();
          router.push(`/events/${created.id}?coverUpload=failed`);
          return;
        }
      }

      if (activeInviteDraft.selectedDjIds.length === 0) {
        setSaving(false);
        finishCreateFlowNavigation(created.id, originDateKey, null);
        return;
      }

      await requestPostCreateInvites(created, originDateKey);
    } catch (saveError) {
      console.error("Failed to create event:", saveError);
      setError(getEventsLoadErrorMessage(saveError));
      setSaving(false);
    }
  }

  async function confirmPostCreateInvites() {
    if (!pendingPostCreateInviteSend) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await executePostCreateInvites(
        pendingPostCreateInviteSend.createdEvent,
        pendingPostCreateInviteSend.recipientIds,
        pendingPostCreateInviteSend.originDateKey,
      );
    } catch (sendError) {
      console.error("Failed to send booking requests after event create:", sendError);
      const message =
        sendError instanceof Error ? sendError.message : "Failed to send booking requests";
      setError(message);
      setSaving(false);
    }
  }

  function handleEventsListTabChange() {
    setLocationRevision((current) => current + 1);
    historyBulkManage.cancelSelectionMode();
    setSuccessMessage(null);
  }

  function handleEventsListTabLinkClick(
    event: MouseEvent<HTMLAnchorElement>,
    tab: EventsListTab,
  ) {
    const isTargetTab = tab === "history" ? isHistoryTab : !isHistoryTab;
    const closeEventsOriginatedCreate = createOpen && !isCalendarCreateFlow;

    event.preventDefault();

    if (closeEventsOriginatedCreate) {
      if (!isTargetTab) {
        const href = buildEventsListHref(tab);
        window.history.pushState(window.history.state, "", href);
        handleEventsListTabChange();
      }

      closeCreateFlow();
      return;
    }

    if (isTargetTab) {
      return;
    }

    const href = buildEventsListHref(tab);
    window.history.pushState(window.history.state, "", href);
    handleEventsListTabChange();

    if (createOpen) {
      closeCreateFlow();
    }
  }

  function openHistoryRemoveConfirm() {
    setError(null);
    historyBulkManage.openConfirm();
  }

  function closeHistoryRemoveConfirm() {
    setError(null);
    historyBulkManage.closeConfirm();
  }

  function confirmHistoryRemove() {
    void historyBulkManage.confirmRemove(handleRemoveEventsFromHistory);
  }

  async function handleRemoveEventsFromHistory(eventIds: string[]) {
    setError(null);
    setSuccessMessage(null);

    const hideableEventIds = resolvePlannerHistoryHideEventIds(eventsRef.current, eventIds);

    if (hideableEventIds.length === 0) {
      console.error("[events] history hide skipped: no hideable event ids", {
        idType: "event_id",
        target: "events.history_hidden_at",
        selectedEventIds: eventIds,
        selectedCount: eventIds.length,
      });
      const message = "Could not remove selected events from history.";
      setError(message);
      throw new Error(message);
    }

    try {
      const { successes, failures } = await hideEventsFromHistory(hideableEventIds);

      if (successes.length > 0) {
        const hiddenAt = new Date().toISOString();
        const successIdSet = new Set(successes.map((id) => String(id)));

        setEvents((current) => {
          const next = current.map((event) =>
            successIdSet.has(String(event.id))
              ? { ...event, history_hidden_at: hiddenAt }
              : event,
          );
          writeEventsListCache(isPlanner, next);
          return next;
        });
        setSuccessMessage(
          `${successes.length} event${successes.length === 1 ? "" : "s"} removed from history`,
        );
      }

      if (failures.length > 0) {
        const message =
          failures.length === hideableEventIds.length
            ? "Could not remove selected events from history."
            : `${failures.length} event${failures.length === 1 ? "" : "s"} could not be removed from history.`;

        setError(message);

        if (successes.length === 0) {
          throw new Error(message);
        }
      }

      if (successes.length === 0) {
        const message = "Could not remove selected events from history.";
        setError(message);
        throw new Error(message);
      }
    } catch (removeError) {
      console.error("Failed to remove events from history:", removeError);
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove selected events from history.",
      );
      throw removeError;
    }
  }

  const workspaceHeaderActions: ReactNode | undefined = !isPlanner
    ? undefined
    : hideEventsHeaderCreateForCalendarFlow
      ? EVENTS_HEADER_CREATE_EVENT_PLACEHOLDER
      : !createOpen
        ? historyTabRowSelectionMode
          ? EVENTS_HEADER_CREATE_EVENT_PLACEHOLDER
          : (
              <button
                type="button"
                onClick={() => {
                  void openCreateFlow();
                }}
                className="shrink-0 ftc-btn-primary px-4 py-2.5 text-sm uppercase tracking-wide"
              >
                Create event
              </button>
            )
        : undefined;

  return (
      <PlannerWorkspacePage
        initialRole={resolvedRole}
        activeWorkspaceHref={eventsWorkspaceActiveHref}
        includeChrome={false}
        actions={workspaceHeaderActions}
        secondaryControlsSlot={
          !isCalendarCreateFlow ? (
            <EventsListTabRow
              showTrashButton={historyTrashVisible}
              trashButtonDisabled={historyTrashButtonDisabled}
              onTrashClick={historyBulkManage.enterSelectionMode}
              reserveTrashSlot={
                isPlanner &&
                !historyBulkManage.selectionMode &&
                !historyTrashVisible
              }
              feedbackMessage={isHistoryTab ? successMessage : null}
              feedbackFading={historyFeedbackFading}
              selectionMode={historyTabRowSelectionMode}
              selectionToolbar={
                <HistorySelectionToolbar
                  embedded
                  selectedCount={historyBulkManage.selectedCount}
                  allSelected={allVisibleRemovableHistorySelected}
                  removing={historyBulkManage.removing}
                  onCancel={historyBulkManage.cancelSelectionMode}
                  onSelectAll={() => {
                    historyBulkManage.toggleSelectAllForIds(
                      visibleRemovableHistoryEvents.map((event) => event.id),
                    );
                  }}
                  onRemove={openHistoryRemoveConfirm}
                  canToggleAll={canToggleAllHistorySelection}
                  canDelete={canDeleteHistorySelection}
                  removeLabel="Delete"
                  selectAllLabel="ALL"
                  cancelVariant="backIcon"
                  selectAllToggle
                  centeredSelectAll
                />
              }
            >
              <div className={FTC_PILL_ROW_GAP_CLASS}>
                <Link
                  href={buildEventsListHref("active")}
                  className={ftcFilterPillClass(!createOpen && !isHistoryTab)}
                  onClick={(event) => {
                    handleEventsListTabLinkClick(event, "active");
                  }}
                >
                  {isPlanner ? "Active" : "Upcoming"}
                </Link>
                <Link
                  href={buildEventsListHref("history")}
                  className={ftcFilterPillClass(!createOpen && isHistoryTab)}
                  onClick={(event) => {
                    handleEventsListTabLinkClick(event, "history");
                  }}
                >
                  History
                </Link>
              </div>
            </EventsListTabRow>
          ) : undefined
        }
        secondaryControlsPlaceholder={isCalendarCreateFlow}
      >
          {createOpen && isPlanner ? (
            <PlannerFormCard title="Create event" onCancel={closeCreateFlow} cancelDisabled={saving}>
              {createStep === "source" ? (
                <div className="space-y-3">
                  <PlannerOptionCard
                    title="Event plans"
                    description="Choose one of your saved event plans"
                    onClick={() => {
                      setError(null);
                      setCreateStep("pick-plan");
                    }}
                  />
                  <PlannerOptionCard
                    title="From scratch"
                    description="Start with a blank event"
                    onClick={() => {
                      setForm({
                        ...emptyEventForm,
                        eventDate: calendarOriginDateKey ?? "",
                      });
                      setSelectedPlanId(null);
                      setCreateStep("form");
                      setError(null);
                    }}
                  />
                  {error ? <PlannerInlineError message={error} /> : null}
                </div>
              ) : null}

              {createStep === "pick-plan" ? (
                <div className="space-y-4">
                  {!isCalendarCreateFlow ? (
                    <PlannerBackLink
                      onClick={() => {
                        setCreateStep("source");
                      }}
                    />
                  ) : null}

                  {loadingPlans ? (
                    <p className="text-sm text-ftc-text-muted">Loading saved event plans...</p>
                  ) : error && bookingPlans.length === 0 ? (
                    <div className="space-y-3">
                      <PlannerInlineError message={error} />
                      <button
                        type="button"
                        onClick={() => {
                          void loadBookingPlansForCreate();
                        }}
                        className="ftc-btn-secondary px-4 py-2.5 text-xs uppercase tracking-wide"
                      >
                        Retry
                      </button>
                    </div>
                  ) : bookingPlans.length === 0 ? (
                    <div className="ftc-card-empty px-6 py-8 text-center">
                      <p className="text-sm text-ftc-text-secondary">No saved event plans yet</p>
                      <PlannerLinkAction href="/booking-plans" className="mt-3">
                        Create an event plan
                      </PlannerLinkAction>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {bookingPlans.map((plan) => (
                        <li key={plan.id}>
                          <PlannerOptionCard
                            title={plan.name}
                            description={`${plan.event_name} · ${plan.venue}`}
                            selected={selectedPlanId === plan.id}
                            onClick={() => handleSelectPlan(plan)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              {createStep === "form" ? (
                <form onSubmit={handleSaveEvent} className="space-y-4">
                  {!isCalendarCreateFlow ? (
                    <PlannerBackLink
                      onClick={() => {
                        if (selectedPlanId) {
                          setSelectedPlanId(null);
                          setCreateStep("pick-plan");
                          return;
                        }

                        setCreateStep("source");
                      }}
                    />
                  ) : null}

                  <PlannerFormField
                    label="Event name"
                    value={form.name}
                    onChange={(value) => updateField("name", value)}
                    placeholder="Event name"
                    required
                    maxLength={MAX_EVENT_NAME_LENGTH}
                    error={createFormFieldErrors.name}
                  />
                  <PlannerFormField
                    label="Venue"
                    value={form.venue}
                    onChange={(value) => updateField("venue", value)}
                    placeholder="Venue"
                    required
                    maxLength={MAX_EVENT_VENUE_LENGTH}
                    error={createFormFieldErrors.venue}
                  />
                  <EventCoverImageField
                    eventName={form.name || "Event"}
                    currentCoverUrl={null}
                    value={coverField}
                    previewUrl={coverPreviewUrl}
                    onChange={setCoverField}
                    onPreviewUrlChange={setCoverPreviewUrl}
                    onValidationError={setCoverError}
                    error={coverError}
                    disabled={saving}
                  />
                  <EventFallbackColourField
                    eventName={form.name || "Event"}
                    value={fallbackColour}
                    onChange={setFallbackColour}
                    disabled={saving}
                    flyerActive={createFlyerActive}
                  />
                  <BookingDateField
                    label="Event date"
                    value={form.eventDate}
                    onChange={(value) => updateField("eventDate", value)}
                    minDate={getTodayDateKey()}
                    required
                    error={createFormFieldErrors.eventDate}
                  />
                  <BookingSetTimeRangeField
                    value={form.setTime}
                    onChange={(value) => updateField("setTime", value)}
                    required
                    eventDate={form.eventDate}
                    startError={createFormFieldErrors.startTime}
                    finishError={createFormFieldErrors.finishTime}
                  />
                  <PlannerFormField
                    label="Notes"
                    value={form.notes}
                    onChange={(value) => updateField("notes", value)}
                    placeholder="Notes"
                    multiline
                    maxLength={MAX_EVENT_NOTES_LENGTH}
                    error={createFormNotesValidationError}
                  />

                  {isCalendarCreateFlow ? (
                    <div className="border-t border-ftc-border-subtle pt-4">
                      <EventDetailPrimaryAction onClick={openInviteModal} disabled={saving}>
                        {queuedInviteDraft.selectedDjIds.length > 0
                          ? `Send booking requests (${queuedInviteDraft.selectedDjIds.length} queued)`
                          : "Send booking requests"}
                      </EventDetailPrimaryAction>
                    </div>
                  ) : (
                    <SendBookingRequestsPanel
                      draft={inviteDraft}
                      disabled={saving}
                      embedded
                      listMaxHeightClass="max-h-48"
                    />
                  )}

                  {error ? <PlannerInlineError message={error} /> : null}

                  <button
                    type="submit"
                    disabled={saving || (createSaveAttempted && createFormHasValidationErrors)}
                    aria-disabled={saving || (createSaveAttempted && createFormHasValidationErrors)}
                    className="ftc-btn-primary px-5 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save event"}
                  </button>
                </form>
              ) : null}
            </PlannerFormCard>
          ) : null}

          <SendBookingRequestsModal
            open={inviteModalOpen && isCalendarCreateFlow && createOpen && createStep === "form"}
            draft={modalInviteDraft}
            onClose={closeInviteModal}
            disabled={saving}
            showSendButton
            onSend={queueInviteDraft}
            confirmDiscardOnClose={false}
            sendButtonLabelMode="confirm"
            introText="Event details will be prefilled from this event, each DJ receives a private booking request DM"
          />

          <UnavailableDjBookingConfirmModal
            open={unavailableConfirmOpen}
            loading={saving}
            eventDate={form.eventDate}
            unavailableDjs={activeInviteDraft.unavailableDjWarnings}
            onBack={() => {
              if (!saving) {
                setUnavailableConfirmOpen(false);
                setPendingPostCreateInviteSend(null);
              }
            }}
            onConfirm={() => {
              void confirmPostCreateInvites();
            }}
          />

          {showEventsListContent ? (
            <>
          <HistoryRemoveConfirmDialog
            open={historyBulkManage.confirmOpen}
            count={historyBulkManage.confirmCount}
            loading={historyBulkManage.removing}
            title="Delete selected history?"
            description="This will permanently remove the selected events from your history. This action cannot be undone."
            cancelLabel="Cancel"
            confirmLabel="Delete"
            confirmLoadingLabel="Deleting..."
            errorMessage={error}
            onCancel={closeHistoryRemoveConfirm}
            onConfirm={confirmHistoryRemove}
          />

          {loadingEvents ? (
            <EventListSkeleton showPlannerStats={isPlanner} showFilterPills={false} />
          ) : error && events.length === 0 ? (
            <PlannerInlineError message={error} />
          ) : (
            <>
              {events.length === 0 ? (
                <PlannerEmptyState
                  title={
                    isHistoryTab
                      ? "No past or cancelled events"
                      : isPlanner
                        ? "No events yet — create your first event"
                        : "No event invitations yet"
                  }
                  action={
                    isPlanner && !createOpen && !isHistoryTab ? (
                      <button
                        type="button"
                        onClick={() => {
                          void openCreateFlow();
                        }}
                        className="ftc-btn-primary px-5 py-3 text-sm uppercase tracking-wide"
                      >
                        Create event
                      </button>
                    ) : undefined
                  }
                />
              ) : filteredEvents.length === 0 && !historyBulkManage.removing ? (
                <PlannerEmptyState
                  title={
                    isHistoryTab ? "No past or cancelled events" : "No active events"
                  }
                />
              ) : visibleFilteredEvents.length > 0 ? (
            <ul className={`ftc-gigs-list ${FTC_LIST_GAP_CLASS}`}>
              {visibleFilteredEvents.map((event) => {
                const cancelled = isEventCancelled(event);
                const eventHref = buildEventDetailHref(event.id, listTab);
                const isSelected = historyBulkManage.selectedIds.has(event.id);
                const isHistorySelection =
                  historyBulkManage.showSelectionToolbar && isPlanner && isHistoryTab;
                const selectionLabel = isSelected
                  ? `Deselect ${event.name} for removal from history`
                  : `Select ${event.name} for removal from history`;

                return (
                  <li
                    key={event.id}
                    className={eventsListCardShellClassName(
                      cancelled,
                      isHistorySelection && isSelected,
                      eventListCardDimCancelledAppearance,
                    )}
                    aria-selected={isHistorySelection ? isSelected : undefined}
                  >
                    {isHistorySelection ? (
                      <button
                        type="button"
                        onClick={() => historyBulkManage.toggleItem(event.id)}
                        aria-label={selectionLabel}
                        aria-pressed={isSelected}
                        className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ftc-primary/35"
                      />
                    ) : null}
                    {isHistorySelection ? (
                      <div className="pointer-events-none">
                        <EventsListCardContent
                          event={event}
                          cancelled={cancelled}
                          isPlanner={isPlanner}
                          statusPillsSingleRow={eventListCardStatusPillsSingleRow}
                          dimCancelledAppearance={eventListCardDimCancelledAppearance}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-label={`View ${event.name}`}
                        onClick={() => {
                          seedEventOwnerId(event.id, event.owner_id);
                          prepareEventsListEventNavigation();
                          router.push(eventHref, { scroll: false });
                        }}
                        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ftc-primary/35"
                      >
                        <EventsListCardContent
                          event={event}
                          cancelled={cancelled}
                          isPlanner={isPlanner}
                          statusPillsSingleRow={eventListCardStatusPillsSingleRow}
                          dimCancelledAppearance={eventListCardDimCancelledAppearance}
                        />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
              ) : null}
            </>
          )}
            </>
          ) : null}
      </PlannerWorkspacePage>
  );
}
