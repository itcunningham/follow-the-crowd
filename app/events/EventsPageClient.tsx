"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { getTodayDateKey, formatDisplayEventDate, sanitizePrefilledEventDateKey } from "@/lib/bookingDateTime";
import {
  getEventFormFieldErrors,
  hasEventFormFieldErrors,
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
  FTC_SURFACE_ROW_CLASS,
} from "@/lib/design/ftcDesignSystem";
import { EventListSkeleton, EventsListTabRow } from "@/app/components/skeleton/Skeleton";
import {
  HistoryRemoveConfirmDialog,
  HistorySelectionCheckbox,
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
  isCalendarOriginEventsFlow,
  resolveCalendarCreateBootstrapState,
  resolveCalendarCreateInitialStep,
  resolveCalendarSaveReturnDateKey,
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

function EventsListCardChevron() {
  return (
    <span aria-hidden="true" className="mt-0.5 shrink-0 self-start text-ftc-text-muted">
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

function EventsListCardContent({
  event,
  cancelled,
  isPlanner,
  leading,
  showChevron = true,
}: {
  event: EventWithLineupStats;
  cancelled: boolean;
  isPlanner: boolean;
  leading?: ReactNode;
  showChevron?: boolean;
}) {
  const titleClassName = cancelled ? "text-ftc-text-secondary" : "text-ftc-text";
  const metaClassName = cancelled ? "text-ftc-text-muted" : "text-ftc-text-secondary";

  return (
    <div className="flex items-start gap-3.5 sm:gap-4">
      {leading}
      <EventCoverImageListThumb
        eventName={event.name}
        coverImageUrl={event.cover_image_url}
        fallbackColour={event.fallback_colour}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3
            className={`min-w-0 flex-1 text-[1.0625rem] font-bold leading-snug sm:text-lg ${titleClassName}`}
          >
            {event.name}
          </h3>
          <div className="shrink-0 self-start">
            <EventDateStatusBadge
              eventDate={event.event_date}
              setTime={event.set_time}
              status={event.status}
              variant="compact"
            />
          </div>
        </div>
        <p className={`mt-1.5 text-sm ${metaClassName}`}>
          {event.venue} · {formatDisplayEventDate(event.event_date)}
        </p>
        <p className="mt-1 text-sm text-ftc-text-muted">{event.set_time}</p>
        {isPlanner ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <PlannerStatChip label="Invited" value={event.lineupStats.total} variant="compact" />
            <PlannerStatChip label="Pending" value={event.lineupStats.pending} variant="compact" />
            <PlannerStatChip label="Accepted" value={event.lineupStats.accepted} variant="compact" />
            <PlannerStatChip label="Declined" value={event.lineupStats.declined} variant="compact" />
          </div>
        ) : null}
      </div>
      {showChevron ? <EventsListCardChevron /> : null}
    </div>
  );
}

function eventsListCardClassName(cancelled: boolean, isSelected = false) {
  return [
    FTC_SURFACE_ROW_CLASS,
    "block w-full focus-visible:outline-none",
    cancelled ? "ftc-event-card-cancelled" : "",
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
  const searchParams = useSearchParams();
  const guardProfile = useGuardProfile();
  const handledCreateParamsRef = useRef<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(
    () => guardProfile?.role ?? readCachedNavRole(),
  );
  const [events, setEvents] = useState<EventWithLineupStats[]>([]);
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

  const listTab = useMemo(
    () =>
      resolveEventsListTabParam(
        searchParams.get("tab"),
        initialTab,
        typeof window === "undefined" ? null : window.location.search,
      ),
    [searchParams, initialTab, locationRevision],
  );
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
  const removableHistoryEvents = useMemo(
    () => (isPlanner ? filterVisiblePlannerHistoryEvents(events) : []),
    [events, isPlanner],
  );
  const filteredEvents = isHistoryTab ? historyEvents : upcomingEvents;
  const historyBulkManage = useHistoryBulkManage(
    isPlanner && isHistoryTab ? removableHistoryEvents : [],
  );
  const historyLoadSettled = eventsListReady && !loadingEvents;
  const showHistoryTrashButton =
    isPlanner &&
    isHistoryTab &&
    !createOpen &&
    !historyBulkManage.selectionMode &&
    (!historyLoadSettled || removableHistoryEvents.length > 0);
  const historyTrashButtonDisabled =
    !historyLoadSettled || removableHistoryEvents.length === 0;

  const visibleFilteredEvents = useMemo(
    () => filterOutRemovingHistoryItems(filteredEvents, historyBulkManage.removingIds),
    [filteredEvents, historyBulkManage.removingIds],
  );

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
    setCalendarOriginDateKey(null);
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
    }
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
    setForm((prev) => ({ ...prev, [key]: value }));
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
    setCalendarOriginDateKey(null);
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

  async function handleRemoveEventsFromHistory(eventIds: string[]) {
    setError(null);
    setSuccessMessage(null);

    try {
      const { successes, failures } = await hideEventsFromHistory(eventIds);

      if (successes.length > 0) {
        const hiddenAt = new Date().toISOString();

        setEvents((current) => {
          const next = current.map((event) =>
            successes.includes(event.id) ? { ...event, history_hidden_at: hiddenAt } : event,
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
          failures.length === eventIds.length
            ? "Could not remove selected events from history."
            : `${failures.length} event${failures.length === 1 ? "" : "s"} could not be removed from history.`;

        setError(message);

        if (successes.length === 0) {
          throw new Error(message);
        }
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

  return (
      <PlannerWorkspacePage
        initialRole={resolvedRole}
        activeWorkspaceHref={eventsWorkspaceActiveHref}
        actions={
          isPlanner && !createOpen ? (
            <button
              type="button"
              onClick={() => {
                void openCreateFlow();
              }}
              className="shrink-0 ftc-btn-primary px-4 py-2.5 text-sm uppercase tracking-wide"
            >
              Create event
            </button>
          ) : undefined
        }
        secondaryControlsSlot={
          !isCalendarCreateFlow ? (
            <EventsListTabRow
              showTrashButton={showHistoryTrashButton}
              trashButtonDisabled={historyTrashButtonDisabled}
              onTrashClick={historyBulkManage.enterSelectionMode}
              reserveTrashSlot={
                isPlanner &&
                !historyBulkManage.selectionMode &&
                !showHistoryTrashButton
              }
            >
              <div className={FTC_PILL_ROW_GAP_CLASS}>
                <Link
                  href={buildEventsListHref("active")}
                  className={`ftc-filter-pill ${!isHistoryTab ? "ftc-filter-pill-active" : ""}`}
                  onClick={(event) => {
                    if (!isHistoryTab) {
                      event.preventDefault();
                      return;
                    }

                    handleEventsListTabChange();
                  }}
                >
                  {isPlanner ? "Active" : "Upcoming"}
                </Link>
                <Link
                  href={buildEventsListHref("history")}
                  className={`ftc-filter-pill ${isHistoryTab ? "ftc-filter-pill-active" : ""}`}
                  onClick={(event) => {
                    if (isHistoryTab) {
                      event.preventDefault();
                      return;
                    }

                    handleEventsListTabChange();
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
                    title="From event plans"
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
                        setCreateStep(selectedPlanId ? "pick-plan" : "source");
                      }}
                    />
                  ) : null}

                  <PlannerFormField
                    label="Event name"
                    value={form.name}
                    onChange={(value) => updateField("name", value)}
                    placeholder="Event name"
                    required
                    error={createFormFieldErrors.name}
                  />
                  <PlannerFormField
                    label="Venue"
                    value={form.venue}
                    onChange={(value) => updateField("venue", value)}
                    placeholder="Venue"
                    required
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
          {successMessage ? (
            <p className="mb-4 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-3 text-sm text-ftc-text-secondary">
              {successMessage}
            </p>
          ) : null}

          {isPlanner && isHistoryTab && historyBulkManage.showSelectionToolbar ? (
            <HistorySelectionToolbar
              selectedCount={historyBulkManage.selectedCount}
              allSelected={historyBulkManage.allSelected}
              removing={historyBulkManage.removing}
              onCancel={historyBulkManage.cancelSelectionMode}
              onSelectAll={historyBulkManage.selectAll}
              onRemove={historyBulkManage.openConfirm}
            />
          ) : null}

          <HistoryRemoveConfirmDialog
            open={historyBulkManage.confirmOpen}
            count={historyBulkManage.confirmCount}
            loading={historyBulkManage.removing}
            title="Delete selected history?"
            description="This will permanently remove the selected events from your history. This action cannot be undone."
            cancelLabel="Cancel"
            confirmLabel="Delete"
            confirmLoadingLabel="Deleting..."
            onCancel={historyBulkManage.closeConfirm}
            onConfirm={() => {
              void historyBulkManage.confirmRemove(handleRemoveEventsFromHistory);
            }}
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
            <ul className={FTC_LIST_GAP_CLASS}>
              {visibleFilteredEvents.map((event) => {
                const cancelled = isEventCancelled(event);
                const eventHref = buildEventDetailHref(event.id, listTab);
                const isSelected = historyBulkManage.selectedIds.has(event.id);
                const selectionLabel = `Select ${event.name} for removal from history`;

                if (historyBulkManage.showSelectionToolbar && isPlanner && isHistoryTab) {
                  return (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => historyBulkManage.toggleItem(event.id)}
                        aria-label={selectionLabel}
                        aria-pressed={isSelected}
                        className={`flex ${eventsListCardClassName(cancelled, isSelected)}`}
                      >
                        <EventsListCardContent
                          event={event}
                          cancelled={cancelled}
                          isPlanner={isPlanner}
                          showChevron={false}
                          leading={
                            <HistorySelectionCheckbox
                              checked={isSelected}
                              label={selectionLabel}
                              presentational
                            />
                          }
                        />
                      </button>
                    </li>
                  );
                }

                return (
                <li key={event.id}>
                  <button
                    type="button"
                    aria-label={`View ${event.name}`}
                    onClick={() => {
                      seedEventOwnerId(event.id, event.owner_id);
                      prepareEventsListEventNavigation();
                      router.push(eventHref, { scroll: false });
                    }}
                    className={`block ${eventsListCardClassName(cancelled)}`}
                  >
                    <EventsListCardContent
                      event={event}
                      cancelled={cancelled}
                      isPlanner={isPlanner}
                    />
                  </button>
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
