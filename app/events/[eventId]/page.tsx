"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { looksLikeUserId, resolveUserDisplayName } from "@/lib/user/displayName";
import { parseCalendarOriginFromEventDetail, resolveSentBookingsLinkedToPlannerEvent } from "@/lib/calendar";
import { buildEventDetailDmThreadHref } from "@/lib/dm/threadNavigation";
import { collectEventDetailProfileIds, formatDjBookingMessageLabel } from "@/lib/events/eventDetailDjBookingUi";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import EventDeleteCancelButton from "@/app/components/EventDeleteCancelButton";
import EventRunSheetSection from "@/app/components/EventRunSheetSection";
import EventDetailBottomBar, {
  EventDetailPrimaryAction,
} from "@/app/components/event-detail/EventDetailBottomBar";
import {
  EventDetailEditHeaderSlot,
  EventDetailHero,
  EventDetailOverlayButton,
  EventDetailSectionTitle,
  EventDetailSummary,
} from "@/app/components/event-detail/EventDetailLayout";
import {
  EVENT_DETAIL_BTN_DESTRUCTIVE,
  EVENT_DETAIL_BTN_PRIMARY_WIDE,
  EVENT_DETAIL_BTN_SECONDARY,
  EVENT_DETAIL_CARD_CLASS,
  EVENT_DETAIL_FEEDBACK_CLASS,
  EVENT_DETAIL_NOTES_TEXT_CLASS,
  EVENT_DETAIL_PAGE_CONTENT_CLASS,
  EVENT_DETAIL_PAGE_SHELL_CLASS,
  EVENT_DETAIL_SECTION_SPACING,
  getEventDetailPageContentBottomClass,
} from "@/app/components/event-detail/eventDetailUi";
import EventLineupBookingCard from "@/app/components/event-detail/EventLineupBookingCard";
import { EventDetailBookingCancellationDetails } from "@/app/components/event-detail/EventDetailBookingCancellationDetails";
import { useGuardProfile } from "@/app/components/GuardProfileContext";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import { EventDetailLoadingShell, EventDetailPlannerLowerSectionsSkeleton } from "@/app/components/skeleton/Skeleton";
import {
  PlannerEmptyPanel,
  PlannerFilterPills,
  PlannerFormCard,
  PlannerFormField,
} from "@/app/components/planner/PlannerUi";
import { useSyncPlannerTitleFeedback } from "@/app/components/planner/PlannerTitleFeedbackProvider";
import { PlannerTitleFeedbackSlot } from "@/app/components/planner/PlannerTitleFeedbackSlot";
import {
  PLANNER_EVENT_DETAIL_HEADER_CONTROLS_ROW_CLASS,
  PLANNER_EVENT_DETAIL_HEADER_FEEDBACK_CELL_CLASS,
  PLANNER_WORKSPACE_PAGE_INSET_CLASS,
} from "@/lib/design/plannerWorkspaceTokens";
import { FTC_EVENT_TITLE_CLAMP_CLASS } from "@/lib/design/ftcDesignSystem";
import { BookingDateField, BookingSetTimeRangeField } from "@/app/components/BookingDateTimeFields";
import { applyEventDateFieldChange, getTodayDateKey } from "@/lib/bookingDateTime";
import {
  getEventFormFieldErrors,
  hasEventFormFieldErrors,
  MAX_EVENT_NAME_LENGTH,
  MAX_EVENT_VENUE_LENGTH,
} from "@/lib/events/eventFormFieldValidation";
import EventCoverImageField, {
  emptyEventCoverImageFieldState,
  type EventCoverImageFieldState,
} from "@/app/components/events/EventCoverImageField";
import EventFallbackColourField from "@/app/components/events/EventFallbackColourField";
import EventEditConfirmDialog from "@/app/components/events/EventEditConfirmDialog";
import {
  isSelectableEventFallbackColourKey,
  type EventSelectableFallbackColourKey,
} from "@/lib/events/eventFallbackColour";
import { formatRateDisplay } from "@/lib/bookingRate";
import UnavailableDjBookingConfirmModal from "@/app/components/UnavailableDjBookingConfirmModal";
import BookingStatusBadge from "@/app/components/booking/BookingStatusBadge";
import SendBookingRequestsModal from "@/app/components/booking/SendBookingRequestsModal";
import { canViewEventsSubNav } from "@/lib/plannerEventsNav";
import { readCachedNavRole } from "@/lib/navigationRoleCache";
import { useSendBookingRequestsDraft } from "@/app/components/booking/useSendBookingRequestsDraft";
import { sendBookingRequestsForRecipients } from "@/lib/bookings/sendBookingRequestsFlow";
import {
  InlineOptionHelpButton,
  InlineOptionHelpPanel,
} from "@/app/components/booking/InlineOptionHelp";
import CancelAcceptedBookingButton from "@/app/components/booking/CancelAcceptedBookingButton";
import {
  cancelBookingRequest,
  cancelAcceptedBookingRequest,
  getAcceptedBookingCancellationRole,
  resolveBookingCancellationReasonLabel,
  resolveBookingCancelledByLabel,
  acceptProposedBookingRate,
  ALL_SELECTED_DJS_ALREADY_HAVE_EVENT_REQUEST_MESSAGE,
  buildBookingSendResultMessage,
  declineProposedBookingRate,
  filterActiveBookings,
  filterVisibleEventLineupBookings,
  getActiveEventLineupStats,
  getBookingMutationErrorMessage,
  hideDeclinedBookingFromLineup,
  listBookingRequestsForEvent,
  listSentBookingRequests,
  type ActiveBookingStatusFilter,
  type BookingRequest,
  type BookingRequestStatus,
} from "@/lib/bookingRequests";
import {
  cancelEvent,
  deleteEmptyEvent,
  eventToRequestInput,
  getEventById,
  getEventsLoadErrorMessage,
  isEventCancelled,
  isPlannerEventInHistoryTab,
  updateEvent,
  updateEventWithCover,
  type Event,
  type EventInput,
} from "@/lib/events";
import {
  getCrewChatUnlockStateForEvent,
  startEventCrewChat,
  type CrewChatUnlockState,
} from "@/lib/events/crewChatUnlock";
import { computeCrewChatEventActions } from "@/lib/events/crewChatEventActions";
import { getEventCrewChatLink } from "@/lib/eventCrewChat";
import { loadEventRunSheet } from "@/lib/eventRunSheet";
import { getEventCoverUploadErrorMessage, normalizeEventCoverImageUrl } from "@/lib/events/eventCoverImage";
import { consumeEventCreateInviteMessage } from "@/lib/events/eventCreateInviteMessages";
import {
  cancelCalendarLinkedOrphanSentBookingsForEvent,
  syncPlannerEventCancelledFromClientCaches,
  syncPlannerEventDeletedFromClientCaches,
} from "@/lib/events/plannerEventLifecycleClientSync";
import { shouldConfirmEventEditSave } from "@/lib/events/eventEditConfirmation";
import { isEventDetailEditDirty } from "@/lib/events/eventEditDirty";
import UnsavedChangesDiscardDialog from "@/app/components/UnsavedChangesDiscardDialog";
import {
  getBookingImpactingEventFieldChanges,
  postEventGroupChatUpdate,
  shouldPostEventGroupChatUpdate,
} from "@/lib/events/eventGroupChatUpdate";
import { readCachedEventSummaryById } from "@/lib/events/eventDetailCache";
import {
  resolveEventDetailBackHref,
} from "@/lib/events/eventsListNavigation";
import {
  consumeCrewChatEventDetailOrigin,
  markCrewChatOpenedFromEventDetail,
} from "@/lib/events/eventDetailCrewChatReturn";
import {
  resolveEventDetailDmOriginConversationId,
} from "@/lib/events/eventsListNavigation";
import { DM_CHAT_SCROLL_RESTORE_PARAM } from "@/lib/dm/dmChatScrollRestoration";
import { CREW_CHAT_EVENT_DETAIL_RETURN_PARAM } from "@/lib/events/eventDetailCrewChatReturn";
import {
  BOOKING_REQUEST_CANCELLED_SUCCESS_MESSAGE,
  useInlineTabFeedbackDismiss,
  EVENT_UPDATED_SUCCESS_MESSAGE,
} from "@/lib/design/inlineTabFeedback";
import {
  shouldResetMobileEventDetailScroll,
  useMobileEventDetailScrollReset,
} from "@/lib/navigation/useCalendarOriginMobileScrollReset";
import { scrollDocumentToTop } from "@/lib/navigation/scrollPageToTop";
import { getEventNotesValidationError, MAX_EVENT_NOTES_LENGTH } from "@/lib/events/eventNotes";
import { useEventEditHeaderState } from "@/lib/events/useEventEditHeaderVisibility";
import {
  canManageEvents,
  getBookingRecipientProfilesByIds,
  getCurrentUserId,
  getCurrentUserProfile,
  type BookingRecipientProfile,
  type UserRole,
} from "@/lib/user/currentUser";

const CREW_CHAT_HELP = {
  label: "Start group chat",
  help: "Start now with 1 accepted DJ or wait. It opens automatically when a 2nd DJ accepts",
};

const HEADER_GROUP_CHAT_CHIP_CLASS =
  "flex shrink-0 items-center gap-1 rounded-xl border border-ftc-border-subtle bg-ftc-bg/80 py-1 pl-2 pr-1.5 backdrop-blur-sm transition hover:border-ftc-border-strong hover:bg-ftc-bg-elevated focus-within:border-[var(--ftc-color-primary-border)] focus-within:bg-ftc-bg-elevated";

const HEADER_GROUP_CHAT_ACTION_CLASS =
  "flex min-h-8 items-center gap-1 rounded-lg px-0.5 py-0.5 transition hover:text-ftc-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ftc-primary/35 active:bg-ftc-surface-raised/70 disabled:cursor-not-allowed disabled:opacity-50";

const HEADER_GROUP_CHAT_LABEL_CLASS =
  "whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-ftc-text sm:text-xs";

function EventHeaderChatIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-ftc-primary transition-colors group-hover:text-ftc-primary-dim"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 2 2 0 0 1-1.8 1.1h-3.7l-3 3v-3H8a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" />
    </svg>
  );
}

export default function EventDetailPage() {
  return (
    <OnboardingGuard>
      <EventDetailPageView />
    </OnboardingGuard>
  );
}

function EventDetailPageView() {
  const params = useParams<{ eventId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params.eventId;
  const hasValidEventId = Boolean(eventId && looksLikeUserId(eventId));
  const cachedEventSummary = useMemo(
    () => (hasValidEventId ? readCachedEventSummaryById(eventId) : null),
    [eventId, hasValidEventId],
  );
  const guardProfile = useGuardProfile();
  const [role, setRole] = useState<UserRole | null>(null);
  const isDjWorkspace = !canViewEventsSubNav(
    guardProfile?.role ?? role ?? readCachedNavRole(),
  );
  const eventsBackHref = useMemo(
    () =>
      resolveEventDetailBackHref(searchParams.get("fromTab"), {
        isDjWorkspace,
        from: searchParams.get("from"),
        tab: searchParams.get("tab"),
        calendarDate: searchParams.get("calendarDate"),
        calendarView: searchParams.get("calendarView"),
        calendarMonth: searchParams.get("calendarMonth"),
        conversationId: searchParams.get("conversationId"),
        bookingRequestId: searchParams.get("bookingRequestId"),
        fromDmConversation: searchParams.get("fromDmConversation"),
        dmReturnFrom: searchParams.get("dmReturnFrom"),
        profileUserId: searchParams.get("profileUserId"),
        restoreScroll: searchParams.get(DM_CHAT_SCROLL_RESTORE_PARAM),
        eventReturn: searchParams.get(CREW_CHAT_EVENT_DETAIL_RETURN_PARAM),
        eventId,
        crewChatEventId: eventId,
      }),
    [eventId, isDjWorkspace, searchParams],
  );
  const calendarOrigin = useMemo(
    () =>
      parseCalendarOriginFromEventDetail({
        get: (key) => searchParams.get(key),
      }),
    [searchParams],
  );
  const buildEventDetailLineupDmHref = useCallback(
    (conversationId: string) =>
      buildEventDetailDmThreadHref(
        conversationId,
        eventId,
        calendarOrigin,
        searchParams.toString() || null,
      ),
    [calendarOrigin, eventId, searchParams],
  );

  function goBackToEvents() {
    // Crew Chat is the one origin that pops rather than pushes. `router.push`
    // appends a second copy of the conversation, so the entry immediately
    // behind it is still Event Details -- Back from the returned chat reopened
    // it, then Back again reached Events. Popping the real entry removes Event
    // Details from history instead of burying it, and restores the exact URL
    // the reader left, query string included. That is what brings back the
    // event card's View Event control: it renders on `?from=dm`, which a
    // rebuilt bare href drops but a genuine history pop preserves.
    if (searchParams.get("from") === "crew-chat" && consumeCrewChatEventDetailOrigin(eventId)) {
      router.back();
      return;
    }

    // Marked-origin check failed: a shared link, a cold load or a refresh, where
    // there is no crew chat entry behind this one and `back()` would leave the
    // app. Replace rather than push so the fallback cannot itself leave an
    // Event Details entry behind the conversation.
    if (searchParams.get("from") === "crew-chat") {
      router.replace(eventsBackHref);
      return;
    }

    router.push(eventsBackHref);
  }

  function closeEventEditForm() {
    setEditOpen(false);
    setEditForm(null);
    setEditSaveAttempted(false);
    resetEditCoverState();
    setEditFormError(null);
    setEditDiscardDialogOpen(false);
  }

  function handleEventDetailBack() {
    if (savingEdit) {
      return;
    }

    // Back while editing with dirty changes: confirm (matches profile).
    // Cancel closes edit immediately with no sheet — Cancel already means discard.
    if (
      editOpen &&
      editForm &&
      event &&
      isEventDetailEditDirty(event, editForm, editCoverField)
    ) {
      setEditDiscardDialogOpen(true);
      return;
    }

    if (editOpen) {
      closeEventEditForm();
    }

    // Dirty Run Sheet edit: same discard sheet. Run Sheet Cancel stays immediate.
    if (runSheetUnsavedEditing) {
      setRunSheetDiscardDialogOpen(true);
      return;
    }

    goBackToEvents();
  }

  const eventRef = useRef<Event | null>(cachedEventSummary);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(() => !cachedEventSummary);
  const [lineupLoading, setLineupLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(() => cachedEventSummary);
  eventRef.current = event;
  const [lineup, setLineup] = useState<BookingRequest[]>([]);
  const [calendarLinkedOrphanBookings, setCalendarLinkedOrphanBookings] = useState<BookingRequest[]>(
    [],
  );
  const [profiles, setProfiles] = useState<Map<string, BookingRecipientProfile>>(new Map());
  const [lineupFilter, setLineupFilter] = useState<ActiveBookingStatusFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [headerFeedbackMessage, setHeaderFeedbackMessage] = useState<string | null>(null);
  const clearHeaderFeedbackMessage = useCallback(() => {
    setHeaderFeedbackMessage(null);
  }, []);
  const headerFeedbackFading = useInlineTabFeedbackDismiss(
    headerFeedbackMessage,
    clearHeaderFeedbackMessage,
  );
  useSyncPlannerTitleFeedback(headerFeedbackMessage, headerFeedbackFading, true);

  useEffect(() => {
    setHeaderFeedbackMessage(null);
  }, [eventId]);

  useEffect(() => {
    const inviteMessage = consumeEventCreateInviteMessage();

    if (inviteMessage) {
      if (inviteMessage.includes("could not be sent")) {
        setError(inviteMessage);
      } else {
        setHeaderFeedbackMessage(inviteMessage);
      }
    }
  }, []);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EventInput | null>(null);
  const [editDiscardDialogOpen, setEditDiscardDialogOpen] = useState(false);
  const [runSheetUnsavedEditing, setRunSheetUnsavedEditing] = useState(false);
  const [runSheetDiscardDialogOpen, setRunSheetDiscardDialogOpen] = useState(false);
  const runSheetDiscardEditsRef = useRef<(() => void) | null>(null);
  const handleRunSheetUnsavedEditingChange = useCallback((unsaved: boolean) => {
    setRunSheetUnsavedEditing(unsaved);
    if (!unsaved) {
      setRunSheetDiscardDialogOpen(false);
    }
  }, []);
  const [editCoverField, setEditCoverField] = useState<EventCoverImageFieldState>(
    emptyEventCoverImageFieldState,
  );
  const pendingCoverSaveRef = useRef<EventCoverImageFieldState>(emptyEventCoverImageFieldState);
  const [editCoverPreviewUrl, setEditCoverPreviewUrl] = useState<string | null>(null);
  const [editCoverError, setEditCoverError] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editSaveAttempted, setEditSaveAttempted] = useState(false);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const editFormSectionRef = useRef<HTMLElement | null>(null);
  const scrollToTopAfterSuccessfulSaveRef = useRef(false);

  const [sendOpen, setSendOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [proposalLoadingId, setProposalLoadingId] = useState<string | null>(null);
  const [hidingBookingId, setHidingBookingId] = useState<string | null>(null);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [cancellingEvent, setCancellingEvent] = useState(false);
  const [startingCrewChat, setStartingCrewChat] = useState(false);
  const [crewChatUnlock, setCrewChatUnlock] = useState<CrewChatUnlockState | null>(null);
  const [crewChatHelpOpen, setCrewChatHelpOpen] = useState(false);
  const [unavailableConfirmOpen, setUnavailableConfirmOpen] = useState(false);

  const shouldApplyMobileScrollGate = shouldResetMobileEventDetailScroll(searchParams);
  const mobileScrollReady = useMobileEventDetailScrollReset(
    searchParams,
    eventId,
    Boolean(event) && !lineupLoading,
  );
  const showEventDetailLoadingShell =
    (loadingEvent && !event) ||
    (shouldApplyMobileScrollGate && !mobileScrollReady);

  const resolvedRole = role ?? guardProfile?.role ?? null;
  const resolvedUserId = currentUserId ?? guardProfile?.user_id ?? null;
  const isOwner = Boolean(event && resolvedUserId && event.owner_id === resolvedUserId);
  const editFlyerActive = Boolean(
    editCoverField.file ||
      editCoverPreviewUrl?.startsWith("blob:") ||
      (!editCoverField.removeExisting &&
        normalizeEventCoverImageUrl(event?.cover_image_url)),
  );
  const isPlanner = canManageEvents(resolvedRole);
  const canEditEvent = isOwner && isPlanner;
  const editHeaderStateRaw = useEventEditHeaderState({
    eventId,
    role: resolvedRole,
    currentUserId: resolvedUserId,
    event,
  });
  const fromHistoryTab = searchParams.get("fromTab") === "history";
  const isHistoryEventDetail = Boolean(event && isPlannerEventInHistoryTab(event));
  const editHeaderState =
    fromHistoryTab || isHistoryEventDetail || editOpen ? "hidden" : editHeaderStateRaw;
  const hasAcceptedBooking = Boolean(
    currentUserId &&
      lineup.some(
        (booking) =>
          booking.recipient_id === currentUserId && booking.status === "accepted",
      ),
  );
  const hasPendingBooking = Boolean(
    currentUserId &&
      lineup.some(
        (booking) =>
          booking.recipient_id === currentUserId && booking.status === "pending",
      ),
  );
  const canOpenCrewChat = isOwner || hasAcceptedBooking;
  const canViewRunSheet = canOpenCrewChat || hasPendingBooking;
  const canEditRunSheet = isOwner && isPlanner && !isHistoryEventDetail;
  const eventIsCancelled = event ? isEventCancelled(event) : false;
  const hasLinkedBookings = lineup.length > 0;
  const canManageEventLifecycle =
    isOwner && isPlanner && !eventIsCancelled && !isHistoryEventDetail;

  const inviteDraft = useSendBookingRequestsDraft({
    eventDate: event?.event_date ?? "",
    eventId: event?.id ?? null,
    existingBookings: lineup,
    enabled: sendOpen && Boolean(event),
  });

  const visibleLineup = useMemo(() => filterVisibleEventLineupBookings(lineup), [lineup]);
  const activeLineup = useMemo(() => filterActiveBookings(visibleLineup), [visibleLineup]);
  const lineupStats = useMemo(() => getActiveEventLineupStats(lineup), [lineup]);
  const bookingStatusFilters = useMemo(
    () =>
      [
        { value: "all" as const, label: `All ${lineupStats.total}` },
        {
          value: "pending" as const,
          label: lineupStats.pending > 0 ? `Pending ${lineupStats.pending}` : "Pending",
        },
        {
          value: "accepted" as const,
          label: lineupStats.accepted > 0 ? `Accepted ${lineupStats.accepted}` : "Accepted",
        },
        {
          value: "declined" as const,
          label: lineupStats.declined > 0 ? `Declined ${lineupStats.declined}` : "Declined",
        },
      ] satisfies { value: ActiveBookingStatusFilter; label: string }[],
    [lineupStats],
  );

  const filteredLineup = useMemo(() => {
    const base =
      lineupFilter === "all"
        ? isHistoryEventDetail
          ? visibleLineup
          : activeLineup
        : activeLineup;

    if (lineupFilter === "all") {
      return base;
    }

    return base.filter((booking) => booking.status === lineupFilter);
  }, [activeLineup, isHistoryEventDetail, lineupFilter, visibleLineup]);

  /**
   * Height of a real rendered booking card, so the empty state can occupy
   * exactly the same space when a filter matches nothing.
   *
   * Measured rather than hard-coded because a card is not one fixed size: the
   * baseline is the same across pending/accepted/declined, but cancellation
   * detail or a pending rate proposal makes it taller. A fixed value can only
   * ever be right for one of those.
   *
   * When no card has rendered yet there is nothing to match, because that only
   * happens when the event has no bookings at all -- every filter then shows
   * the same empty state, so there is no height to jump between. The CSS
   * fallback on the wrapper covers that case.
   */
  const [lineupCardHeight, setLineupCardHeight] = useState<number | null>(null);
  const firstLineupCardRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    const node = firstLineupCardRef.current;

    if (!node) {
      return;
    }

    const measure = () => setLineupCardHeight(node.getBoundingClientRect().height);

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => observer.disconnect();
  }, [filteredLineup]);

  const editFormFieldErrors = useMemo(() => {
    if (!editForm || !editSaveAttempted) {
      return {};
    }

    return getEventFormFieldErrors(editForm);
  }, [editForm, editSaveAttempted]);
  const editFormHasFieldErrors = hasEventFormFieldErrors(editFormFieldErrors);
  const editFormNotesValidationError = useMemo(() => {
    if (!editForm || !editSaveAttempted) {
      return null;
    }

    return getEventNotesValidationError(editForm.notes);
  }, [editForm, editSaveAttempted]);
  const editFormHasValidationErrors =
    editFormHasFieldErrors || Boolean(editFormNotesValidationError);

  const loadEventData = useCallback(async () => {
    if (!hasValidEventId) {
      setEvent(null);
      setLineup([]);
      setCalendarLinkedOrphanBookings([]);
      setProfiles(new Map());
      setCrewChatUnlock(null);
      setError("Event not found or you do not have access");
      setLoadingEvent(false);
      setLineupLoading(false);
      return;
    }

    if (!eventRef.current) {
      setLoadingEvent(true);
    }
    setLineupLoading(true);
    setError(null);

    try {
      const [loadedEvent, bookings, unlock, sentBookings] = await Promise.all([
        getEventById(eventId),
        listBookingRequestsForEvent(eventId),
        getCrewChatUnlockStateForEvent(eventId),
        listSentBookingRequests(),
      ]);

      if (!loadedEvent) {
        setEvent(null);
        setLineup([]);
        setCalendarLinkedOrphanBookings([]);
        setProfiles(new Map());
        setCrewChatUnlock(null);
        setError("Event not found or you do not have access");
        return;
      }

      const linkedBookings = resolveSentBookingsLinkedToPlannerEvent(loadedEvent, sentBookings);

      setEvent(loadedEvent);
      setLineup(bookings);
      setCalendarLinkedOrphanBookings(
        linkedBookings.filter((booking) => !booking.event_id?.trim()),
      );
      setCrewChatUnlock(unlock);

      const recipientIds = bookings.map((booking) => booking.recipient_id);
      let profileIds = collectEventDetailProfileIds(recipientIds, loadedEvent.owner_id);

      try {
        const runSheet = await loadEventRunSheet(eventId);
        const runSheetRecipientIds = runSheet.rows
          .map((row) => {
            if (row.custom_data && typeof row.custom_data === "object") {
              const recipientId = (row.custom_data as { booking_recipient_id?: unknown })
                .booking_recipient_id;
              return typeof recipientId === "string" ? recipientId : null;
            }
            return null;
          })
          .filter((id): id is string => id !== null);

        profileIds = [...new Set([...profileIds, ...runSheetRecipientIds])];
      } catch {
      }

      if (profileIds.length > 0) {
        const profileMap = await getBookingRecipientProfilesByIds(profileIds);
        setProfiles(profileMap);
      } else {
        setProfiles(new Map());
      }
    } catch (loadError) {
      console.error("Failed to load event:", loadError);
      if (!eventRef.current) {
        setEvent(null);
      }
      setLineup([]);
      setCalendarLinkedOrphanBookings([]);
      setProfiles(new Map());
      setCrewChatUnlock(null);
      setError(getEventsLoadErrorMessage(loadError));
    } finally {
      setLoadingEvent(false);
      setLineupLoading(false);
    }
  }, [eventId, hasValidEventId]);

  const reloadEventLineup = useCallback(async () => {
    if (!hasValidEventId) {
      return;
    }

    try {
      const [loadedEvent, bookings] = await Promise.all([
        getEventById(eventId),
        listBookingRequestsForEvent(eventId),
      ]);

      if (loadedEvent) {
        setEvent(loadedEvent);
        const unlock = await getCrewChatUnlockStateForEvent(eventId);
        setCrewChatUnlock(unlock);
      }

      setLineup(bookings);

      const recipientIds = bookings.map((booking) => booking.recipient_id);
      const profileIds = collectEventDetailProfileIds(
        recipientIds,
        loadedEvent?.owner_id ?? eventRef.current?.owner_id,
      );

      if (profileIds.length > 0) {
        const profileMap = await getBookingRecipientProfilesByIds(profileIds);
        setProfiles(profileMap);
      } else {
        setProfiles(new Map());
      }
    } catch (loadError) {
      console.error("Failed to reload event lineup:", loadError);
      setError(getEventsLoadErrorMessage(loadError));
    }
  }, [eventId, hasValidEventId]);

  useEffect(() => {
    Promise.all([getCurrentUserProfile(), getCurrentUserId()])
      .then(([profile, userId]) => {
        setRole(profile?.role ?? null);
        setCurrentUserId(userId);
      })
      .catch((loadError) => {
        console.error("Failed to load event page access:", loadError);
      });
  }, []);

  useEffect(() => {
    const summary = hasValidEventId ? readCachedEventSummaryById(eventId) : null;
    setEvent(summary);
    setLoadingEvent(!summary);
    setLineupLoading(true);
    setLineup([]);
    setCalendarLinkedOrphanBookings([]);
    setProfiles(new Map());
    setCrewChatUnlock(null);
  }, [eventId, hasValidEventId]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  /**
   * Reconcile Bookings / Run Sheet when a DJ accepts (or any booking changes)
   * on another device.
   *
   * Events list already listens for `ftc-notifications-updated` (fired by
   * `notifyBookingRequestsChanged`). Event Details only reloaded after local
   * mutations via `reloadEventLineup`, so a remote accept left cards on
   * PENDING until a hard refresh. Same shared signal — database stays source
   * of truth.
   */
  useEffect(() => {
    if (!hasValidEventId) {
      return;
    }

    function handleBookingsChanged() {
      void reloadEventLineup();
    }

    window.addEventListener("ftc-notifications-updated", handleBookingsChanged);

    return () => {
      window.removeEventListener("ftc-notifications-updated", handleBookingsChanged);
    };
  }, [hasValidEventId, reloadEventLineup]);

  function resetEditCoverState() {
    setEditCoverField(emptyEventCoverImageFieldState);
    pendingCoverSaveRef.current = emptyEventCoverImageFieldState;
    if (editCoverPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(editCoverPreviewUrl);
    }
    setEditCoverPreviewUrl(null);
    setEditCoverError(null);
  }

  function syncPendingCoverSave(next: EventCoverImageFieldState) {
    pendingCoverSaveRef.current = next;
  }

  function readPendingCoverSave(): EventCoverImageFieldState {
    return {
      file: pendingCoverSaveRef.current.file,
      removeExisting: pendingCoverSaveRef.current.removeExisting,
    };
  }

  function handleEditCoverChange(next: EventCoverImageFieldState) {
    setEditCoverField(next);
    syncPendingCoverSave(next);
  }

  function handleEditCoverFileSelected(file: File | null) {
    if (file) {
      const next = { file, removeExisting: false };
      syncPendingCoverSave(next);
      setEditCoverField(next);
      return;
    }

    const next = {
      file: null,
      removeExisting: pendingCoverSaveRef.current.removeExisting,
    };
    syncPendingCoverSave(next);
    setEditCoverField(next);
  }

  function showEditFormError(message: string) {
    setEditFormError(message);
    requestAnimationFrame(() => {
      editFormSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openEditForm() {
    if (!event) {
      return;
    }

    setEditForm({
      name: event.name,
      venue: event.venue,
      eventDate: event.event_date,
      setTime: event.set_time,
      rate: event.rate,
      notes: event.notes,
      bookingPlanId: event.booking_plan_id,
      fallbackColour: isSelectableEventFallbackColourKey(event.fallback_colour ?? "")
        ? event.fallback_colour
        : null,
    });
    resetEditCoverState();
    setEditFormError(null);
    setEditSaveAttempted(false);
    setEditOpen(true);
    setError(null);

    requestAnimationFrame(() => {
      editFormSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function performSaveEdit(coverChange: EventCoverImageFieldState) {
    if (!event || !editForm) {
      return;
    }

    const fieldErrors = getEventFormFieldErrors(editForm);

    if (hasEventFormFieldErrors(fieldErrors)) {
      setEditConfirmOpen(false);
      return;
    }

    if (getEventNotesValidationError(editForm.notes)) {
      setEditConfirmOpen(false);
      return;
    }

    const shouldNotifyGroupChat =
      Boolean(crewChatUnlock?.isUnlocked) &&
      shouldPostEventGroupChatUpdate(event, editForm, lineup);
    const groupChatFieldChanges = shouldNotifyGroupChat
      ? getBookingImpactingEventFieldChanges(event, editForm)
      : [];

    setSavingEdit(true);
    setEditFormError(null);
    setError(null);

    try {
      const previousCoverUrl = event.cover_image_url;
      let savedEvent: Event;

      try {
        savedEvent = await updateEventWithCover(
          event.id,
          editForm,
          {
            file: coverChange.file,
            removeExisting: coverChange.removeExisting,
          },
          previousCoverUrl,
        );
      } catch (coverError) {
        console.error("Failed to update event cover image:", coverError);
        const attemptedCoverUpload = Boolean(coverChange.file || coverChange.removeExisting);

        if (attemptedCoverUpload) {
          showEditFormError(getEventCoverUploadErrorMessage(coverError));
          return;
        }

        savedEvent = await updateEvent(event.id, editForm);
      }

      if (shouldNotifyGroupChat && groupChatFieldChanges.length > 0) {
        try {
          await postEventGroupChatUpdate(savedEvent.id, savedEvent.name, groupChatFieldChanges);
        } catch (groupChatError) {
          console.error("Failed to post event group chat update:", groupChatError);
          scrollToTopAfterSuccessfulSaveRef.current = true;
          setEvent(savedEvent);
          setEditOpen(false);
          setEditForm(null);
          resetEditCoverState();
          setEditConfirmOpen(false);
          setHeaderFeedbackMessage("Event updated. Remember to let affected DJs know.");
          setError("Event saved, but the group chat update could not be posted");
          return;
        }
      }

      scrollToTopAfterSuccessfulSaveRef.current = true;
      setEvent(savedEvent);
      setEditOpen(false);
      setEditForm(null);
      resetEditCoverState();
      setEditConfirmOpen(false);
      setHeaderFeedbackMessage(
        shouldNotifyGroupChat && groupChatFieldChanges.length > 0
          ? "Event updated. A summary was posted in the group chat."
          : EVENT_UPDATED_SUCCESS_MESSAGE,
      );
    } catch (saveError) {
      console.error("Failed to update event:", saveError);
      showEditFormError(saveError instanceof Error ? saveError.message : "Failed to update event");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleSaveEdit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();

    if (!event || !editForm) {
      return;
    }

    setEditSaveAttempted(true);
    setEditFormError(null);

    const fieldErrors = getEventFormFieldErrors(editForm);

    if (hasEventFormFieldErrors(fieldErrors)) {
      return;
    }

    if (getEventNotesValidationError(editForm.notes)) {
      return;
    }

    const coverChange = readPendingCoverSave();
    const hasBlobPreview = editCoverPreviewUrl?.startsWith("blob:") ?? false;

    if (hasBlobPreview && !coverChange.file) {
      showEditFormError(
        "Flyer selection was lost before save. Choose the image again, then save.",
      );
      return;
    }

    if (shouldConfirmEventEditSave(event, editForm, lineup)) {
      setEditConfirmOpen(true);
      return;
    }

    await performSaveEdit(coverChange);
  }

  async function openSendBookings() {
    if (!event || eventIsCancelled) {
      return;
    }

    setSendOpen(true);
    inviteDraft.resetDraft();
    setError(null);
    setHeaderFeedbackMessage(null);
  }

  function closeSendBookings() {
    if (sending) {
      return;
    }

    setSendOpen(false);
    inviteDraft.resetDraft();
    setUnavailableConfirmOpen(false);
  }

  function requestSendBookings() {
    if (!event) {
      return;
    }

    setError(null);

    const { sendableIds, skippedIds } = inviteDraft.resolveSendableRecipientIds();

    if (skippedIds.length > 0) {
      inviteDraft.setSelectedDjIds(sendableIds);
    }

    if (sendableIds.length === 0) {
      setError(ALL_SELECTED_DJS_ALREADY_HAVE_EVENT_REQUEST_MESSAGE);
      return;
    }

    const validationError = inviteDraft.getValidationError(sendableIds);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (inviteDraft.unavailableDjWarnings.length > 0) {
      setUnavailableConfirmOpen(true);
      return;
    }

    void executeSendBookings(sendableIds, skippedIds.length);
  }

  async function executeSendBookings(
    recipientIds: string[] = inviteDraft.sendableSelectedDjIds,
    skippedDuplicateCount = 0,
  ) {
    if (!event) {
      return;
    }

    const { sendableIds, skippedIds } = inviteDraft.resolveSendableRecipientIds(recipientIds);
    const totalSkippedDuplicates = skippedDuplicateCount + skippedIds.length;

    if (sendableIds.length === 0) {
      setError(ALL_SELECTED_DJS_ALREADY_HAVE_EVENT_REQUEST_MESSAGE);
      inviteDraft.setSelectedDjIds([]);
      return;
    }

    if (skippedIds.length > 0) {
      inviteDraft.setSelectedDjIds(sendableIds);
    }

    setSending(true);
    setError(null);

    try {
      const { successes, failures, skippedDuplicateRecipientIds } =
        await sendBookingRequestsForRecipients({
          recipientIds: sendableIds,
          bookingInput: eventToRequestInput(event),
          existingBookings: lineup,
          djOffers: inviteDraft.djOffers,
        });
      const skippedCount = totalSkippedDuplicates + skippedDuplicateRecipientIds.length;

      if (successes.length === 0) {
        if (skippedCount > 0) {
          setError(ALL_SELECTED_DJS_ALREADY_HAVE_EVENT_REQUEST_MESSAGE);
          return;
        }

        const failureDetail = failures
          .map((failure) => failure.message.trim())
          .filter(Boolean)
          .join("; ");
        setError(failureDetail || "Failed to send booking requests. Please try again.");
        return;
      }

      setHeaderFeedbackMessage(buildBookingSendResultMessage(successes.length, skippedCount));
      setUnavailableConfirmOpen(false);
      closeSendBookings();
      await loadEventData();

      if (failures.length > 0) {
        console.error("[events] Some booking sends failed:", failures);
      }
    } catch (sendError) {
      console.error("Failed to send event booking requests:", sendError);
      setError(sendError instanceof Error ? sendError.message : "Failed to send booking requests");
    } finally {
      setSending(false);
    }
  }

  async function handleCancelBooking(bookingId: string) {
    setCancellingBookingId(bookingId);
    setError(null);

    try {
      await cancelBookingRequest(bookingId);
      await reloadEventLineup();
      setHeaderFeedbackMessage(BOOKING_REQUEST_CANCELLED_SUCCESS_MESSAGE);
    } catch (cancelError) {
      console.error("Failed to cancel booking request:", cancelError);
      setError(getBookingMutationErrorMessage(cancelError));
    } finally {
      setCancellingBookingId(null);
    }
  }

  async function handleCancelAcceptedBooking(booking: BookingRequest, reason: string) {
    setCancellingBookingId(booking.id);
    setError(null);

    try {
      const profile = profiles.get(booking.recipient_id);
      const djDisplayName = profile?.display_name?.trim() || "DJ";
      const { warning } = await cancelAcceptedBookingRequest(
        booking,
        reason,
        djDisplayName,
      );
      await reloadEventLineup();
      const baseMessage =
        booking.sender_id === currentUserId
          ? "Booking cancelled"
          : "You withdrew from this event";
      setHeaderFeedbackMessage(warning ? `${baseMessage}. ${warning}` : baseMessage);
    } catch (cancelError) {
      console.error("Failed to cancel accepted booking:", cancelError);
      setError(getBookingMutationErrorMessage(cancelError));
    } finally {
      setCancellingBookingId(null);
    }
  }

  async function handleHideFromLineup(bookingId: string) {
    setHidingBookingId(bookingId);
    setError(null);

    try {
      await hideDeclinedBookingFromLineup(bookingId);
      await reloadEventLineup();
      setHeaderFeedbackMessage("Declined booking hidden from lineup");
    } catch (hideError) {
      console.error("Failed to hide declined booking from lineup:", hideError);
      setError(getBookingMutationErrorMessage(hideError));
    } finally {
      setHidingBookingId(null);
    }
  }

  async function handleAcceptProposedRate(booking: BookingRequest) {
    setProposalLoadingId(booking.id);
    setError(null);

    try {
      await acceptProposedBookingRate(booking.id);
      await reloadEventLineup();
      setHeaderFeedbackMessage("Proposed rate accepted");
    } catch (acceptError) {
      console.error("Failed to accept proposed rate:", acceptError);
      setError(getBookingMutationErrorMessage(acceptError));
    } finally {
      setProposalLoadingId(null);
    }
  }

  async function handleKeepOriginalOffer(booking: BookingRequest) {
    setProposalLoadingId(booking.id);
    setError(null);

    try {
      await declineProposedBookingRate(booking.id);
      await reloadEventLineup();
      setHeaderFeedbackMessage(
        booking.rate_mode === "open" ? "Rate declined" : "Original offer kept",
      );
    } catch (declineError) {
      console.error("Failed to keep original offer:", declineError);
      setError(getBookingMutationErrorMessage(declineError));
    } finally {
      setProposalLoadingId(null);
    }
  }

  async function handleDeleteEvent() {
    if (!event) {
      return;
    }

    setDeletingEvent(true);
    setError(null);

    try {
      const linkedBookings = await cancelCalendarLinkedOrphanSentBookingsForEvent(event);
      const relatedBookingIds = [
        ...lineup.map((booking) => booking.id),
        ...calendarLinkedOrphanBookings.map((booking) => booking.id),
        ...linkedBookings.map((booking) => booking.id),
      ];

      await deleteEmptyEvent(event.id, event.cover_image_url);
      syncPlannerEventDeletedFromClientCaches(event.id, relatedBookingIds);
      router.replace(eventsBackHref);
    } catch (deleteError) {
      console.error("Failed to delete event:", deleteError);
      setError(getEventsLoadErrorMessage(deleteError));
      setDeletingEvent(false);
    }
  }

  async function handleCancelEvent() {
    if (!event) {
      return;
    }

    setCancellingEvent(true);
    setError(null);

    try {
      const cancelResult = await cancelEvent(event.id);
      const cancelledOrphans = await cancelCalendarLinkedOrphanSentBookingsForEvent(event);
      const relatedBookingIds = [
        ...lineup.map((booking) => booking.id),
        ...calendarLinkedOrphanBookings.map((booking) => booking.id),
        ...cancelResult.cancelledBookings.map((booking) => booking.id),
        ...cancelledOrphans.map((booking) => booking.id),
      ];

      syncPlannerEventCancelledFromClientCaches(
        event.id,
        relatedBookingIds,
        cancelResult.event,
      );
      router.replace(eventsBackHref);
    } catch (cancelError) {
      console.error("Failed to cancel event:", cancelError);
      setError(getEventsLoadErrorMessage(cancelError));
      setCancellingEvent(false);
    }
  }

  async function handleStartCrewChat() {
    if (!event || startingCrewChat) {
      return;
    }

    setStartingCrewChat(true);
    setError(null);

    try {
      const updatedEvent = await startEventCrewChat(event.id);
      setEvent(updatedEvent);
      const unlock = await getCrewChatUnlockStateForEvent(event.id);
      setCrewChatUnlock(unlock);
    } catch (startError) {
      console.error("Failed to start crew chat:", startError);
      setError(getEventsLoadErrorMessage(startError));
    } finally {
      setStartingCrewChat(false);
    }
  }

  const viewerBooking = useMemo(
    () =>
      currentUserId
        ? visibleLineup.find((booking) => booking.recipient_id === currentUserId) ?? null
        : null,
    [visibleLineup, currentUserId],
  );
  const plannerDisplayName = useMemo(() => {
    const ownerId = event?.owner_id?.trim();

    if (!ownerId) {
      return null;
    }

    return resolveUserDisplayName(profiles.get(ownerId), { fallback: "" }) || null;
  }, [event?.owner_id, profiles]);
  const djBookingMessageLabel = formatDjBookingMessageLabel(plannerDisplayName);
  const showDjWithdrawAction =
    !isOwner &&
    !isHistoryEventDetail &&
    viewerBooking != null &&
    getAcceptedBookingCancellationRole(viewerBooking, currentUserId) === "dj";
  const dmOriginConversationId = resolveEventDetailDmOriginConversationId({
    from: searchParams.get("from"),
    conversationId: searchParams.get("conversationId"),
    fromDmConversation: searchParams.get("fromDmConversation"),
  });
  const hideOpenBookingConversation = Boolean(
    dmOriginConversationId &&
      viewerBooking?.conversation_id &&
      viewerBooking.conversation_id === dmOriginConversationId,
  );
  /** Opened via Crew Chat "View Event" — Back returns to that chat; Group chat chip is redundant. */
  const openedFromCrewChat = searchParams.get("from") === "crew-chat";

  const crewChatActions = useMemo(
    () =>
      computeCrewChatEventActions({
        unlock: crewChatUnlock,
        isOwner,
        isPlanner,
        eventIsCancelled,
        hasAcceptedBooking,
      }),
    [crewChatUnlock, eventIsCancelled, hasAcceptedBooking, isOwner, isPlanner],
  );
  const {
    showStartCrewChatAction: showStartCrewChatActionRaw,
    showEventGroupChatAction,
    showCrewChatHelpUi,
    crewChatHelpActionLabel,
  } = crewChatActions;
  const showStartCrewChatAction =
    showStartCrewChatActionRaw && !isHistoryEventDetail;
  const showEventGroupChatHeaderLink = showEventGroupChatAction && !openedFromCrewChat;
  // Edit event owns the header (Cancel); Group chat is leave-the-form navigation.
  const showCrewChatHeaderAction =
    !editOpen && (showStartCrewChatAction || showEventGroupChatHeaderLink);

  useEffect(() => {
    if (!showStartCrewChatAction || editOpen) {
      setCrewChatHelpOpen(false);
    }
  }, [editOpen, showStartCrewChatAction]);

  const showStickyActions = !editOpen && !sendOpen;
  const showReadOnlyEventDetails = !editOpen;

  useLayoutEffect(() => {
    if (editOpen || !scrollToTopAfterSuccessfulSaveRef.current) {
      return;
    }

    scrollToTopAfterSuccessfulSaveRef.current = false;
    scrollDocumentToTop();
  }, [editOpen]);
  const showOwnerSendAction =
    isOwner && isPlanner && !eventIsCancelled && !isHistoryEventDetail;
  const showOpenDmInYourBookingSection =
    !isOwner &&
    Boolean(viewerBooking?.conversation_id && !hideOpenBookingConversation);
  const showDjBookingConversationAction =
    showStickyActions &&
    !showOwnerSendAction &&
    Boolean(viewerBooking?.conversation_id && !hideOpenBookingConversation) &&
    !showOpenDmInYourBookingSection;
  const showBottomBar = showDjBookingConversationAction;
  const showRunSheetSendBookingsAction = showOwnerSendAction && showStickyActions;

  if (showEventDetailLoadingShell) {
    return (
      <EventDetailLoadingShell
        backHref={eventsBackHref}
        editHeaderState={editHeaderState}
        onEditClick={openEditForm}
      />
    );
  }

  if (!event) {
    return (
      <div className={EVENT_DETAIL_PAGE_SHELL_CLASS}>
        <AppNavigation />
        <div className={`${PLANNER_WORKSPACE_PAGE_INSET_CLASS} py-8 ${MOBILE_NAV_OFFSET_CLASS}`}>
          <p className="text-sm text-red-400">{error ?? "Event not found"}</p>
          <button
            type="button"
            onClick={goBackToEvents}
            className="mt-4 inline-block text-sm font-semibold text-ftc-primary"
          >
            Back to events
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className={EVENT_DETAIL_PAGE_SHELL_CLASS}>
        <AppNavigation />

        <header
          className={`ftc-page-header border-b border-ftc-border-subtle bg-ftc-bg/95 backdrop-blur-md ${PLANNER_WORKSPACE_PAGE_INSET_CLASS} py-3`}
        >
          <div className={PLANNER_EVENT_DETAIL_HEADER_CONTROLS_ROW_CLASS}>
            <div className="shrink-0">
              <EventDetailOverlayButton onClick={handleEventDetailBack} label="Back to events">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </EventDetailOverlayButton>
            </div>

            <div className={PLANNER_EVENT_DETAIL_HEADER_FEEDBACK_CELL_CLASS}>
              <PlannerTitleFeedbackSlot variant="header-controls" />
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {showCrewChatHeaderAction ? (
                <div className={`group ${HEADER_GROUP_CHAT_CHIP_CLASS}`}>
                  {showStartCrewChatAction ? (
                    <button
                      type="button"
                      onClick={() => {
                        void handleStartCrewChat();
                      }}
                      disabled={startingCrewChat}
                      aria-label="Start group chat"
                      className={HEADER_GROUP_CHAT_ACTION_CLASS}
                    >
                      <EventHeaderChatIcon />
                      <span className={HEADER_GROUP_CHAT_LABEL_CLASS}>
                        {startingCrewChat ? "Starting" : "Start group chat"}
                      </span>
                    </button>
                  ) : (
                    <Link
                      href={getEventCrewChatLink(event.id, {
                        eventDetailReturn: searchParams.toString() || null,
                      })}
                      aria-label="Group chat"
                      className={HEADER_GROUP_CHAT_ACTION_CLASS}
                      onClick={() => markCrewChatOpenedFromEventDetail(event.id)}
                    >
                      <EventHeaderChatIcon />
                      <span className={HEADER_GROUP_CHAT_LABEL_CLASS}>Group chat</span>
                    </Link>
                  )}
                  {showCrewChatHelpUi ? (
                    <InlineOptionHelpButton
                      label={crewChatHelpActionLabel}
                      open={crewChatHelpOpen}
                      onToggle={() => {
                        setCrewChatHelpOpen((current) => !current);
                      }}
                      disabled={startingCrewChat}
                    />
                  ) : null}
                </div>
              ) : null}
              <EventDetailEditHeaderSlot state={editHeaderState} onEditClick={openEditForm} />
            </div>
          </div>
        </header>

        {showCrewChatHelpUi && crewChatHelpOpen ? (
          <div className="border-b border-ftc-border-subtle px-4 py-2 sm:px-6">
            <InlineOptionHelpPanel label={CREW_CHAT_HELP.label} help={CREW_CHAT_HELP.help} />
          </div>
        ) : null}

        {showReadOnlyEventDetails ? (
          <EventDetailHero
            eventName={event.name}
            coverImageUrl={event.cover_image_url}
            fallbackColour={event.fallback_colour}
            compact={isHistoryEventDetail}
          />
        ) : null}

        <div
          className={`${EVENT_DETAIL_PAGE_CONTENT_CLASS} ${getEventDetailPageContentBottomClass(showBottomBar)}`}
        >
          {showReadOnlyEventDetails ? (
            <>
              {searchParams.get("coverUpload") === "failed" ? (
                <p className={`${EVENT_DETAIL_FEEDBACK_CLASS} text-ftc-text-secondary`}>
                  Event saved, but the flyer could not be uploaded. Open Edit event to try again.
                </p>
              ) : null}

              {error ? (
                <p className={`${EVENT_DETAIL_FEEDBACK_CLASS} text-[var(--ftc-color-danger)]`}>
                  {error}
                </p>
              ) : null}

              <h1
                className={`${FTC_EVENT_TITLE_CLAMP_CLASS} text-xl font-bold leading-tight tracking-tight text-ftc-text sm:text-2xl`}
              >
                {event.name}
              </h1>

              <div className="mt-3">
                <EventDetailSummary event={event} />
              </div>

              {event.notes?.trim() ? (
                <section className={`${EVENT_DETAIL_SECTION_SPACING} min-w-0`}>
                  <EventDetailSectionTitle>Notes</EventDetailSectionTitle>
                  <p
                    className={`mt-2 text-sm leading-relaxed text-ftc-text-secondary ${EVENT_DETAIL_NOTES_TEXT_CLASS}`}
                  >
                    {event.notes}
                  </p>
                </section>
              ) : null}
            </>
          ) : null}

          {editOpen && editForm && canEditEvent && !isHistoryEventDetail ? (
            <section ref={editFormSectionRef} className="scroll-mt-24">
            <PlannerFormCard
              title="Edit event"
              cardClassName={`mb-0 ${EVENT_DETAIL_CARD_CLASS}`}
              titleClassName="text-base font-bold text-ftc-text"
              onCancel={() => {
                if (savingEdit) return;
                closeEventEditForm();
              }}
              cancelDisabled={savingEdit}
            >
              <form onSubmit={handleSaveEdit} className="ftc-event-edit-form">
                <PlannerFormField
                  label="Event name"
                  value={editForm.name}
                  onChange={(value) => setEditForm((prev) => (prev ? { ...prev, name: value } : prev))}
                  required
                  maxLength={MAX_EVENT_NAME_LENGTH}
                  error={editFormFieldErrors.name}
                />
                <PlannerFormField
                  label="Venue"
                  value={editForm.venue}
                  onChange={(value) => setEditForm((prev) => (prev ? { ...prev, venue: value } : prev))}
                  required
                  maxLength={MAX_EVENT_VENUE_LENGTH}
                  error={editFormFieldErrors.venue}
                />
                <EventCoverImageField
                  eventName={editForm.name || event.name}
                  currentCoverUrl={event.cover_image_url}
                  value={editCoverField}
                  previewUrl={editCoverPreviewUrl}
                  onChange={handleEditCoverChange}
                  onFileSelected={handleEditCoverFileSelected}
                  onPreviewUrlChange={setEditCoverPreviewUrl}
                  onValidationError={setEditCoverError}
                  error={editCoverError}
                  disabled={savingEdit}
                />
                <EventFallbackColourField
                  eventName={editForm.name || event.name}
                  value={
                    isSelectableEventFallbackColourKey(editForm.fallbackColour ?? "")
                      ? (editForm.fallbackColour as EventSelectableFallbackColourKey)
                      : null
                  }
                  onChange={(next) =>
                    setEditForm((prev) => (prev ? { ...prev, fallbackColour: next } : prev))
                  }
                  disabled={savingEdit}
                  flyerActive={editFlyerActive}
                />
                <BookingDateField
                  label="Event date"
                  value={editForm.eventDate}
                  onChange={(value) =>
                    setEditForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            eventDate: value,
                            setTime: applyEventDateFieldChange(prev.eventDate, value, prev.setTime),
                          }
                        : prev,
                    )
                  }
                  minDate={getTodayDateKey()}
                  required
                  error={editFormFieldErrors.eventDate}
                />
                <BookingSetTimeRangeField
                  value={editForm.setTime}
                  onChange={(value) =>
                    setEditForm((prev) => (prev ? { ...prev, setTime: value } : prev))
                  }
                  required
                  eventDate={editForm.eventDate}
                  startError={editFormFieldErrors.startTime}
                  finishError={editFormFieldErrors.finishTime}
                />
                <PlannerFormField
                  label="Notes"
                  value={editForm.notes}
                  onChange={(value) => setEditForm((prev) => (prev ? { ...prev, notes: value } : prev))}
                  multiline
                  maxLength={MAX_EVENT_NOTES_LENGTH}
                  error={editFormNotesValidationError}
                />

                {editFormError ? (
                  <p className="text-sm text-[var(--ftc-color-danger)]">{editFormError}</p>
                ) : null}

                <div className="pt-0.5">
                  <button
                    type="submit"
                    disabled={savingEdit || (editSaveAttempted && editFormHasValidationErrors)}
                    aria-disabled={savingEdit || (editSaveAttempted && editFormHasValidationErrors)}
                    className={EVENT_DETAIL_BTN_PRIMARY_WIDE}
                  >
                    {savingEdit ? "Saving" : "Save"}
                  </button>
                </div>
              </form>
            </PlannerFormCard>
            </section>
          ) : null}

          {showReadOnlyEventDetails ? (
            <>
              {lineupLoading ? (
                <EventDetailPlannerLowerSectionsSkeleton />
              ) : (
                <>
                  {canViewRunSheet ? (
                    <>
                      {showRunSheetSendBookingsAction ? (
                        <div className="mt-8">
                          <EventDetailPrimaryAction onClick={openSendBookings}>
                            Invite DJs
                          </EventDetailPrimaryAction>
                        </div>
                      ) : null}
                      <div className={showRunSheetSendBookingsAction ? "mt-4" : "mt-8"}>
                        <EventRunSheetSection
                          eventId={event.id}
                          canEdit={canEditRunSheet}
                          lineup={lineup}
                          profiles={profiles}
                          onSaved={setHeaderFeedbackMessage}
                          onUnsavedEditingChange={handleRunSheetUnsavedEditingChange}
                          discardEditsRef={runSheetDiscardEditsRef}
                          fromTab={searchParams.get("fromTab")}
                          calendarOrigin={calendarOrigin}
                          emptyStateMessage={
                            isHistoryEventDetail
                              ? "No run sheet was saved for this event"
                              : undefined
                          }
                        />
                      </div>
                    </>
                  ) : null}

                  {!isOwner && viewerBooking ? (
                    <section className={`${EVENT_DETAIL_SECTION_SPACING} ${EVENT_DETAIL_CARD_CLASS}`}>
                      <EventDetailSectionTitle>Your booking</EventDetailSectionTitle>
                      <div className="mt-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <BookingStatusBadge status={viewerBooking.status} variant="compact" />
                          <p className="mt-2 text-sm text-ftc-text-secondary">
                            {viewerBooking.set_time || "TBC"}
                            {viewerBooking.fee ? ` · ${formatRateDisplay(viewerBooking.fee)}` : ""}
                          </p>
                          {viewerBooking.status === "cancelled" ? (
                            <EventDetailBookingCancellationDetails
                              cancelledByLabel={resolveBookingCancelledByLabel(viewerBooking, profiles)}
                              cancellationReasonLabel={resolveBookingCancellationReasonLabel(viewerBooking)}
                            />
                          ) : null}
                        </div>
                        {viewerBooking.conversation_id && !hideOpenBookingConversation ? (
                          <div className="flex w-full min-w-0 shrink-0 sm:w-auto sm:max-w-[14rem] sm:items-end">
                            <Link
                              href={buildEventDetailLineupDmHref(viewerBooking.conversation_id)}
                              className={`${EVENT_DETAIL_BTN_SECONDARY} w-full min-w-0 sm:min-w-[7.5rem]`}
                            >
                              <span className="block truncate">{djBookingMessageLabel}</span>
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    </section>
                  ) : null}

                  {!isOwner && (hasPendingBooking || hasAcceptedBooking) && lineup.length > 1 ? (
                    <section className={`${EVENT_DETAIL_SECTION_SPACING} ${EVENT_DETAIL_CARD_CLASS}`}>
                      <EventDetailSectionTitle>Lineup</EventDetailSectionTitle>
                      <ul className="mt-3 space-y-2.5">
                        {lineup.map((booking) => {
                          const profile = profiles.get(booking.recipient_id);
                          return (
                            <li key={booking.id}>
                              <EventLineupBookingCard
                                booking={booking}
                                profile={profile}
                                currentUserId={currentUserId}
                                eventDetailId={eventId}
                                readOnly
                                cancelledByLabel={resolveBookingCancelledByLabel(booking, profiles)}
                                cancellationReasonLabel={resolveBookingCancellationReasonLabel(booking)}
                                canHideFromLineup={false}
                                hiding={false}
                                hideDisabled={true}
                                cancelling={false}
                                proposalLoading={false}
                                onHideFromLineup={() => {}}
                                onCancelBooking={() => {}}
                                onCancelAccepted={() => {}}
                                onAcceptProposal={() => {}}
                                onKeepOriginalOffer={() => {}}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ) : null}

                  {isOwner ? (
                    <section className={`${EVENT_DETAIL_SECTION_SPACING} ${EVENT_DETAIL_CARD_CLASS}`}>
                      <EventDetailSectionTitle>Bookings</EventDetailSectionTitle>

                      <div className="mt-3">
                        <PlannerFilterPills
                          options={bookingStatusFilters}
                          value={lineupFilter}
                          onChange={setLineupFilter}
                          layout="scroll"
                        />
                      </div>

                      {/* Both states share one wrapper so switching filters cannot move the
                          section's bottom edge, and with it the Cancel Event button. The
                          minimum is the measured height of a real booking card; the class is
                          only the fallback for an event that has never had one. */}
                      <div
                        className="mt-3 flex min-h-[7.5rem] flex-col justify-center"
                        style={
                          lineupCardHeight ? { minHeight: `${lineupCardHeight}px` } : undefined
                        }
                      >
                        {filteredLineup.length === 0 ? (
                          <PlannerEmptyPanel
                            message={
                              isHistoryEventDetail
                                ? "No bookings for this event"
                                : "No DJs invited yet, send booking requests to build your lineup"
                            }
                          />
                        ) : (
                          <ul className="space-y-2.5">
                            {filteredLineup.map((booking, bookingIndex) => {
                              const profile = profiles.get(booking.recipient_id);

                              return (
                                <li
                                  key={booking.id}
                                  ref={bookingIndex === 0 ? firstLineupCardRef : undefined}
                                >
                                  <EventLineupBookingCard
                                    booking={booking}
                                    profile={profile}
                                    currentUserId={currentUserId}
                                    eventDetailId={eventId}
                                    eventDetailFromTab={searchParams.get("fromTab")}
                                    eventDetailReturn={searchParams.toString() || null}
                                    dmOriginConversationId={dmOriginConversationId}
                                    calendarOrigin={calendarOrigin}
                                    readOnly={isHistoryEventDetail}
                                    cancelledByLabel={resolveBookingCancelledByLabel(booking, profiles)}
                                    cancellationReasonLabel={resolveBookingCancellationReasonLabel(booking)}
                                    canHideFromLineup={
                                      !isHistoryEventDetail &&
                                      isOwner &&
                                      isPlanner &&
                                      booking.status === "declined" &&
                                      !booking.lineup_hidden_at
                                    }
                                    hiding={hidingBookingId === booking.id}
                                    hideDisabled={Boolean(hidingBookingId) && hidingBookingId !== booking.id}
                                    cancelling={cancellingBookingId === booking.id}
                                    proposalLoading={proposalLoadingId === booking.id}
                                    onHideFromLineup={() => handleHideFromLineup(booking.id)}
                                    onCancelBooking={() => handleCancelBooking(booking.id)}
                                    onCancelAccepted={(reason) => handleCancelAcceptedBooking(booking, reason)}
                                    onAcceptProposal={() => handleAcceptProposedRate(booking)}
                                    onKeepOriginalOffer={() => handleKeepOriginalOffer(booking)}
                                  />
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </section>
                  ) : null}
                </>
              )}

              {isOwner && isPlanner && canManageEventLifecycle ? (
                <div className="mt-8 border-t border-ftc-border-subtle pt-6">
                  <EventDeleteCancelButton
                    mode={hasLinkedBookings ? "cancel" : "delete"}
                    loading={hasLinkedBookings ? cancellingEvent : deletingEvent}
                    disabled={deletingEvent || cancellingEvent}
                    onConfirm={hasLinkedBookings ? handleCancelEvent : handleDeleteEvent}
                  />
                </div>
              ) : null}

              {showDjWithdrawAction && viewerBooking ? (
                <div className="mt-8 border-t border-ftc-border-subtle pt-6">
                  <CancelAcceptedBookingButton
                    role="dj"
                    loading={cancellingBookingId === viewerBooking.id}
                    onConfirm={(reason) => handleCancelAcceptedBooking(viewerBooking, reason)}
                    className={`${EVENT_DETAIL_BTN_DESTRUCTIVE} w-full`}
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {showBottomBar && viewerBooking?.conversation_id ? (
          <EventDetailBottomBar>
            <EventDetailPrimaryAction
              icon="chat"
              href={buildEventDetailLineupDmHref(viewerBooking.conversation_id)}
            >
              {djBookingMessageLabel}
            </EventDetailPrimaryAction>
          </EventDetailBottomBar>
        ) : null}
      </div>

      {sendOpen && isOwner && !eventIsCancelled && !isHistoryEventDetail ? (
        <SendBookingRequestsModal
          open
          draft={inviteDraft}
          onClose={closeSendBookings}
          sending={sending}
          showSendButton
          onSend={requestSendBookings}
          errorMessage={error}
          introText="Event details will be prefilled from this event, each DJ receives a private booking request DM"
          dialogClassName="relative z-10 max-h-[90dvh] w-full max-w-2xl overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] touch-pan-y rounded-t-2xl border border-ftc-border-subtle bg-ftc-bg p-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:p-4 sm:pb-0 focus:outline-none"
          formCardClassName="mb-0 p-0 border-0 bg-transparent shadow-none"
          formTitleClassName="text-base font-bold text-ftc-text"
        />
      ) : null}

      <UnavailableDjBookingConfirmModal
        open={unavailableConfirmOpen}
        loading={sending}
        eventDate={event?.event_date ?? ""}
        unavailableDjs={inviteDraft.unavailableDjWarnings}
        overlayClassName="z-[70]"
        onBack={() => {
          if (!sending) {
            setUnavailableConfirmOpen(false);
          }
        }}
        onConfirm={executeSendBookings}
      />

      <EventEditConfirmDialog
        open={editConfirmOpen}
        loading={savingEdit}
        onCancel={() => {
          if (!savingEdit) {
            setEditConfirmOpen(false);
          }
        }}
        onConfirm={() => {
          void performSaveEdit(readPendingCoverSave());
        }}
      />

      <UnsavedChangesDiscardDialog
        open={editDiscardDialogOpen}
        titleId="discard-event-edits-title"
        onKeepEditing={() => setEditDiscardDialogOpen(false)}
        onDiscard={() => {
          closeEventEditForm();
          goBackToEvents();
        }}
      />

      <UnsavedChangesDiscardDialog
        open={runSheetDiscardDialogOpen}
        titleId="discard-run-sheet-edits-title"
        onKeepEditing={() => setRunSheetDiscardDialogOpen(false)}
        onDiscard={() => {
          runSheetDiscardEditsRef.current?.();
          setRunSheetUnsavedEditing(false);
          setRunSheetDiscardDialogOpen(false);
          goBackToEvents();
        }}
      />
    </>
  );
}
