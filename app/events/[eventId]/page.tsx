"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import EventDeleteCancelButton from "@/app/components/EventDeleteCancelButton";
import EventDateStatusBadge from "@/app/components/EventDateStatusBadge";
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
  EVENT_DETAIL_SECTION_SPACING,
} from "@/app/components/event-detail/eventDetailUi";
import EventLineupBookingCard from "@/app/components/event-detail/EventLineupBookingCard";
import { useGuardProfile } from "@/app/components/GuardProfileContext";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import { EventDetailLoadingShell } from "@/app/components/skeleton/Skeleton";
import {
  PlannerEmptyPanel,
  PlannerFilterPills,
  PlannerFormCard,
  PlannerFormField,
  PlannerStatChip,
} from "@/app/components/planner/PlannerUi";
import { BookingDateField, BookingSetTimeRangeField } from "@/app/components/BookingDateTimeFields";
import { getTodayDateKey } from "@/lib/bookingDateTime";
import {
  getEventFormFieldErrors,
  hasEventFormFieldErrors,
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
import SendBookingRequestsPanel from "@/app/components/booking/SendBookingRequestsPanel";
import { useSendBookingRequestsDraft } from "@/app/components/booking/useSendBookingRequestsDraft";
import { sendBookingRequestsForRecipients } from "@/lib/bookings/sendBookingRequestsFlow";
import {
  InlineOptionHelpButton,
  InlineOptionHelpPanel,
} from "@/app/components/booking/InlineOptionHelp";
import BookingSheetDialog, {
  BookingSheetDangerButton,
  BookingSheetSecondaryButton,
} from "@/app/components/booking/BookingSheetDialog";
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
import { getEventCoverUploadErrorMessage, normalizeEventCoverImageUrl } from "@/lib/events/eventCoverImage";
import { consumeEventCreateInviteMessage } from "@/lib/events/eventCreateInviteMessages";
import { shouldConfirmEventEditSave } from "@/lib/events/eventEditConfirmation";
import {
  getBookingImpactingEventFieldChanges,
  postEventGroupChatUpdate,
  shouldPostEventGroupChatUpdate,
} from "@/lib/events/eventGroupChatUpdate";
import { resolveEventDetailBackHref } from "@/lib/events/eventsListNavigation";
import {
  shouldResetMobileEventDetailScroll,
  useMobileEventDetailScrollReset,
} from "@/lib/navigation/useCalendarOriginMobileScrollReset";
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

const STATUS_FILTERS: { value: ActiveBookingStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
];

const CREW_CHAT_HELP = {
  label: "Group chat",
  help: "Opens automatically when 2 DJs accept. With 1 accepted DJ, the planner can start it manually. If all DJs leave or the event is cancelled, group chat locks again.",
};

const HEADER_GROUP_CHAT_CHIP_CLASS =
  "flex min-w-0 shrink items-center rounded-xl border border-ftc-border-subtle bg-ftc-bg/80 py-1 backdrop-blur-sm transition hover:border-ftc-border-strong hover:bg-ftc-bg-elevated focus-within:border-[var(--ftc-color-primary-border)] focus-within:bg-ftc-bg-elevated";

const HEADER_GROUP_CHAT_ACTION_CLASS =
  "flex min-h-8 min-w-0 flex-1 items-center gap-1 rounded-lg px-1 py-0.5 transition hover:text-ftc-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ftc-primary/35 active:bg-ftc-surface-raised/70 disabled:cursor-not-allowed disabled:opacity-50";

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
  const params = useParams<{ eventId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params.eventId;
  const eventsBackHref = useMemo(
    () =>
      resolveEventDetailBackHref(searchParams.get("fromTab"), {
        from: searchParams.get("from"),
        tab: searchParams.get("tab"),
        calendarDate: searchParams.get("calendarDate"),
        calendarView: searchParams.get("calendarView"),
        calendarMonth: searchParams.get("calendarMonth"),
        conversationId: searchParams.get("conversationId"),
        bookingRequestId: searchParams.get("bookingRequestId"),
        fromDmConversation: searchParams.get("fromDmConversation"),
      }),
    [searchParams],
  );

  function goBackToEvents() {
    router.push(eventsBackHref);
  }

  const guardProfile = useGuardProfile();
  const [role, setRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [lineup, setLineup] = useState<BookingRequest[]>([]);
  const [profiles, setProfiles] = useState<Map<string, BookingRecipientProfile>>(new Map());
  const [lineupFilter, setLineupFilter] = useState<ActiveBookingStatusFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const inviteMessage = consumeEventCreateInviteMessage();

    if (inviteMessage) {
      if (inviteMessage.includes("could not be sent")) {
        setError(inviteMessage);
      } else {
        setSuccessMessage(inviteMessage);
      }
    }
  }, []);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EventInput | null>(null);
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

  const [sendOpen, setSendOpen] = useState(false);
  const [sendDiscardConfirmOpen, setSendDiscardConfirmOpen] = useState(false);
  const sendBookingsSectionRef = useRef<HTMLDivElement | null>(null);
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
  const mobileScrollReady = useMobileEventDetailScrollReset(searchParams, eventId, !loading);
  const mobileScrollGateClass =
    shouldApplyMobileScrollGate && !loading && !mobileScrollReady ? "invisible" : "";

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
  const editHeaderState = useEventEditHeaderState({
    eventId,
    role: resolvedRole,
    currentUserId: resolvedUserId,
    event,
  });
  const hasAcceptedBooking = Boolean(
    currentUserId &&
      lineup.some(
        (booking) =>
          booking.recipient_id === currentUserId && booking.status === "accepted",
      ),
  );
  const canOpenCrewChat = isOwner || hasAcceptedBooking;
  const canViewRunSheet = canOpenCrewChat;
  const canEditRunSheet = isOwner && isPlanner;
  const eventIsCancelled = event ? isEventCancelled(event) : false;
  const hasLinkedBookings = lineup.length > 0;
  const canManageEventLifecycle = isOwner && isPlanner && !eventIsCancelled;

  const inviteDraft = useSendBookingRequestsDraft({
    eventDate: event?.event_date ?? "",
    eventId: event?.id ?? null,
    existingBookings: lineup,
    enabled: sendOpen && Boolean(event),
  });

  const visibleLineup = useMemo(() => filterVisibleEventLineupBookings(lineup), [lineup]);
  const activeLineup = useMemo(() => filterActiveBookings(visibleLineup), [visibleLineup]);
  const lineupStats = useMemo(() => getActiveEventLineupStats(lineup), [lineup]);

  const filteredLineup = useMemo(() => {
    const base = lineupFilter === "all" ? visibleLineup : activeLineup;

    if (lineupFilter === "all") {
      return base;
    }

    return base.filter((booking) => booking.status === lineupFilter);
  }, [activeLineup, lineupFilter, visibleLineup]);

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
    if (!eventId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loadedEvent = await getEventById(eventId);

      if (!loadedEvent) {
        setEvent(null);
        setLineup([]);
        setProfiles(new Map());
        setCrewChatUnlock(null);
        setError("Event not found or you do not have access.");
        return;
      }

      setEvent(loadedEvent);

      const [bookings, unlock] = await Promise.all([
        listBookingRequestsForEvent(eventId),
        getCrewChatUnlockStateForEvent(eventId),
      ]);
      setLineup(bookings);
      setCrewChatUnlock(unlock);

      const recipientIds = bookings.map((booking) => booking.recipient_id);

      if (recipientIds.length > 0) {
        const profileMap = await getBookingRecipientProfilesByIds(recipientIds);
        setProfiles(profileMap);
      } else {
        setProfiles(new Map());
      }
    } catch (loadError) {
      console.error("Failed to load event:", loadError);
      setEvent(null);
      setLineup([]);
      setProfiles(new Map());
      setCrewChatUnlock(null);
      setError(getEventsLoadErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const reloadEventLineup = useCallback(async () => {
    if (!eventId) {
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

      if (recipientIds.length > 0) {
        const profileMap = await getBookingRecipientProfilesByIds(recipientIds);
        setProfiles(profileMap);
      } else {
        setProfiles(new Map());
      }
    } catch (loadError) {
      console.error("Failed to reload event lineup:", loadError);
      setError(getEventsLoadErrorMessage(loadError));
    }
  }, [eventId]);

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
    loadEventData();
  }, [loadEventData]);

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
    syncPendingCoverSave({
      file,
      removeExisting: false,
    });
    setEditCoverField((previous) => ({
      file,
      removeExisting: false,
    }));
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
          setEvent(savedEvent);
          setEditOpen(false);
          setEditForm(null);
          resetEditCoverState();
          setEditConfirmOpen(false);
          setSuccessMessage("Event updated. Remember to let affected DJs know.");
          setError("Event saved, but the group chat update could not be posted.");
          return;
        }
      }

      setEvent(savedEvent);
      setEditOpen(false);
      setEditForm(null);
      resetEditCoverState();
      setEditConfirmOpen(false);
      setSuccessMessage(
        shouldNotifyGroupChat && groupChatFieldChanges.length > 0
          ? "Event updated. A summary was posted in the group chat."
          : "Event updated",
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
    setSuccessMessage(null);
  }

  useEffect(() => {
    if (!sendOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sendOpen]);

  useEffect(() => {
    if (!sendOpen) {
      return;
    }

    window.requestAnimationFrame(() => {
      sendBookingsSectionRef.current?.focus({ preventScroll: true });
    });
  }, [sendOpen]);

  function closeSendBookings() {
    if (sending) {
      return;
    }

    setSendOpen(false);
    setSendDiscardConfirmOpen(false);
    inviteDraft.resetDraft();
    setUnavailableConfirmOpen(false);
  }

  function requestCloseSendBookings() {
    if (sending) {
      return;
    }

    if (inviteDraft.hasDraft) {
      setSendDiscardConfirmOpen(true);
      return;
    }

    closeSendBookings();
  }

  useEffect(() => {
    if (!sendOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || sending) {
        return;
      }

      if (sendDiscardConfirmOpen) {
        setSendDiscardConfirmOpen(false);
        return;
      }

      requestCloseSendBookings();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [inviteDraft.hasDraft, sendDiscardConfirmOpen, sendOpen, sending]);

  function requestSendBookings() {
    if (!event) {
      return;
    }

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

        setError("Failed to send booking requests. Please try again.");
        return;
      }

      setSuccessMessage(buildBookingSendResultMessage(successes.length, skippedCount));
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
      setSuccessMessage("Booking request cancelled.");
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
          ? "Booking cancelled."
          : "You withdrew from this event.";
      setSuccessMessage(warning ? `${baseMessage} ${warning}` : baseMessage);
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
      setSuccessMessage("Declined booking hidden from lineup.");
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
      setSuccessMessage("Proposed rate accepted.");
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
      setSuccessMessage("Original offer kept.");
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
      await deleteEmptyEvent(event.id, event.cover_image_url);
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
      await cancelEvent(event.id);
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
  const dmOriginConversationId =
    searchParams.get("from") === "dm"
      ? searchParams.get("conversationId")?.trim() || null
      : searchParams.get("fromDmConversation")?.trim() || null;
  const hideOpenBookingConversation = Boolean(
    dmOriginConversationId &&
      viewerBooking?.conversation_id &&
      viewerBooking.conversation_id === dmOriginConversationId,
  );

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
    showStartCrewChatAction,
    showEventGroupChatAction,
    showCrewChatHelpUi,
    crewChatHelpActionLabel,
  } = crewChatActions;
  const showCrewChatHeaderAction = showStartCrewChatAction || showEventGroupChatAction;

  useEffect(() => {
    if (!showStartCrewChatAction) {
      setCrewChatHelpOpen(false);
    }
  }, [showStartCrewChatAction]);

  const showStickyActions = !editOpen && !sendOpen;
  const showOwnerSendAction = isOwner && isPlanner && !eventIsCancelled;
  const showDjBookingConversationAction =
    showStickyActions &&
    !showOwnerSendAction &&
    Boolean(viewerBooking?.conversation_id && !hideOpenBookingConversation);
  const showBottomBar = showDjBookingConversationAction;
  const showRunSheetSendBookingsAction = showOwnerSendAction && showStickyActions;

  if (loading) {
    return (
      <OnboardingGuard>
        <div className={mobileScrollGateClass}>
          <EventDetailLoadingShell
            backHref={eventsBackHref}
            editHeaderState={editHeaderState}
            onEditClick={openEditForm}
          />
        </div>
      </OnboardingGuard>
    );
  }

  if (!event) {
    return (
      <OnboardingGuard>
        <div
          className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS} ${mobileScrollGateClass}`}
        >
          <AppNavigation />
          <div className="px-4 py-8 sm:px-6">
            <p className="text-sm text-red-400">{error ?? "Event not found."}</p>
            <button
              type="button"
              onClick={goBackToEvents}
              className="mt-4 inline-block text-sm font-semibold text-ftc-primary"
            >
              Back to events
            </button>
          </div>
        </div>
      </OnboardingGuard>
    );
  }

  return (
    <OnboardingGuard>
      <div
        className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS} ${mobileScrollGateClass}`}
      >
        <AppNavigation />

        <div className="border-b border-ftc-border-subtle bg-ftc-bg/95 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <EventDetailOverlayButton onClick={goBackToEvents} label="Back to events">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </EventDetailOverlayButton>

            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              {showCrewChatHeaderAction ? (
                <div
                  className={`group ${HEADER_GROUP_CHAT_CHIP_CLASS} ${
                    showCrewChatHelpUi
                      ? "max-w-[10.5rem] gap-1 px-1 sm:max-w-none"
                      : "max-w-[8.5rem] px-2 sm:max-w-none"
                  }`}
                >
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
                      <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-wide text-ftc-text sm:text-xs">
                        {startingCrewChat ? "Starting..." : "Start group chat"}
                      </span>
                    </button>
                  ) : (
                    <Link
                      href={getEventCrewChatLink(event.id)}
                      aria-label="Group chat"
                      className={HEADER_GROUP_CHAT_ACTION_CLASS}
                    >
                      <EventHeaderChatIcon />
                      <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-wide text-ftc-text sm:text-xs">
                        Group chat
                      </span>
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
        </div>

        {showCrewChatHelpUi && crewChatHelpOpen ? (
          <div className="border-b border-ftc-border-subtle px-4 py-2 sm:px-6">
            <InlineOptionHelpPanel label={CREW_CHAT_HELP.label} help={CREW_CHAT_HELP.help} />
          </div>
        ) : null}

        <EventDetailHero
          eventName={event.name}
          coverImageUrl={event.cover_image_url}
          fallbackColour={event.fallback_colour}
          statusBadge={
            <EventDateStatusBadge
              eventDate={event.event_date}
              setTime={event.set_time}
              status={event.status}
              variant="compact"
            />
          }
        />

        <div className={`px-4 sm:px-6 ${showBottomBar ? "pb-28" : "pb-6"} pt-5`}>
          {searchParams.get("coverUpload") === "failed" ? (
            <p className={`${EVENT_DETAIL_FEEDBACK_CLASS} text-ftc-text-secondary`}>
              Event saved, but the flyer could not be uploaded. Open Edit event to try again.
            </p>
          ) : null}

          {successMessage ? (
            <p className={`${EVENT_DETAIL_FEEDBACK_CLASS} text-ftc-text-secondary`}>
              {successMessage}
            </p>
          ) : null}

          {error ? (
            <p className={`${EVENT_DETAIL_FEEDBACK_CLASS} text-[var(--ftc-color-danger)]`}>
              {error}
            </p>
          ) : null}

          <h1 className="text-xl font-bold leading-tight tracking-tight text-ftc-text sm:text-2xl">
            {event.name}
          </h1>

          <div className="mt-3">
            <EventDetailSummary event={event} />
          </div>

          {event.notes?.trim() ? (
            <section className={EVENT_DETAIL_SECTION_SPACING}>
              <EventDetailSectionTitle>Notes</EventDetailSectionTitle>
              <p className="mt-2 text-sm leading-relaxed text-ftc-text-secondary">{event.notes}</p>
            </section>
          ) : null}

          {editOpen && editForm && canEditEvent ? (
            <section ref={editFormSectionRef} className="mt-4 scroll-mt-24">
            <PlannerFormCard
              title="Edit event"
              cardClassName={`mb-0 ${EVENT_DETAIL_CARD_CLASS}`}
              titleClassName="text-base font-bold text-ftc-text"
              onCancel={() => {
                if (savingEdit) return;
                setEditOpen(false);
                setEditForm(null);
                setEditSaveAttempted(false);
                resetEditCoverState();
                setEditFormError(null);
              }}
              cancelDisabled={savingEdit}
            >
              <form onSubmit={handleSaveEdit} className="ftc-event-edit-form">
                <PlannerFormField
                  label="Event name"
                  value={editForm.name}
                  onChange={(value) => setEditForm((prev) => (prev ? { ...prev, name: value } : prev))}
                  required
                  error={editFormFieldErrors.name}
                />
                <PlannerFormField
                  label="Venue"
                  value={editForm.venue}
                  onChange={(value) => setEditForm((prev) => (prev ? { ...prev, venue: value } : prev))}
                  required
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
                    setEditForm((prev) => (prev ? { ...prev, eventDate: value } : prev))
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
                    {savingEdit ? "Saving event..." : "Save event changes"}
                  </button>
                </div>
              </form>
            </PlannerFormCard>
            </section>
          ) : null}

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
                  onSaved={(message) => setSuccessMessage(message)}
                />
              </div>
            </>
          ) : null}

          {!isOwner && viewerBooking ? (
            <section className={`${EVENT_DETAIL_SECTION_SPACING} ${EVENT_DETAIL_CARD_CLASS}`}>
              <EventDetailSectionTitle>Your booking</EventDetailSectionTitle>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <BookingStatusBadge status={viewerBooking.status} variant="compact" />
                  <p className="mt-2 text-sm text-ftc-text-secondary">
                    Set time {viewerBooking.set_time || "TBC"}
                    {viewerBooking.fee ? ` · ${formatRateDisplay(viewerBooking.fee)}` : ""}
                  </p>
                  {viewerBooking.status === "cancelled" ? (
                    <>
                      {resolveBookingCancelledByLabel(viewerBooking, profiles) ? (
                        <p className="mt-2 text-sm text-ftc-text-muted">
                          Cancelled by {resolveBookingCancelledByLabel(viewerBooking, profiles)}
                        </p>
                      ) : null}
                      {resolveBookingCancellationReasonLabel(viewerBooking) ? (
                        <p className="text-sm text-ftc-text-muted">
                          Reason: {resolveBookingCancellationReasonLabel(viewerBooking)}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  {getAcceptedBookingCancellationRole(viewerBooking, currentUserId) === "dj" ? (
                    <CancelAcceptedBookingButton
                      role="dj"
                      loading={cancellingBookingId === viewerBooking.id}
                      onConfirm={(reason) => handleCancelAcceptedBooking(viewerBooking, reason)}
                      className={`${EVENT_DETAIL_BTN_DESTRUCTIVE} w-full sm:w-auto sm:min-w-[7.5rem]`}
                    />
                  ) : null}
                  {viewerBooking.conversation_id && !hideOpenBookingConversation ? (
                    <Link
                      href={`/dm/${viewerBooking.conversation_id}`}
                      className={`${EVENT_DETAIL_BTN_SECONDARY} w-full sm:w-auto sm:min-w-[7.5rem]`}
                    >
                      Open DM
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {isOwner ? (
            <section className={`${EVENT_DETAIL_SECTION_SPACING} ${EVENT_DETAIL_CARD_CLASS}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <EventDetailSectionTitle>Bookings</EventDetailSectionTitle>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <PlannerStatChip label="Invited" value={lineupStats.total} variant="compact" />
                    <PlannerStatChip label="Pending" value={lineupStats.pending} variant="compact" />
                    <PlannerStatChip label="Accepted" value={lineupStats.accepted} variant="compact" />
                    <PlannerStatChip label="Declined" value={lineupStats.declined} variant="compact" />
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <PlannerFilterPills
                  options={STATUS_FILTERS}
                  value={lineupFilter}
                  onChange={setLineupFilter}
                />
              </div>

              {filteredLineup.length === 0 ? (
                <PlannerEmptyPanel
                  className="mt-5"
                  message="No DJs invited yet, send booking requests to build your lineup"
                />
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {filteredLineup.map((booking) => {
                    const profile = profiles.get(booking.recipient_id);

                    return (
                      <li key={booking.id}>
                        <EventLineupBookingCard
                          booking={booking}
                          profile={profile}
                          currentUserId={currentUserId}
                          cancelledByLabel={resolveBookingCancelledByLabel(booking, profiles)}
                          cancellationReasonLabel={resolveBookingCancellationReasonLabel(booking)}
                          canHideFromLineup={
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
            </section>
          ) : null}

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
        </div>

        {showBottomBar && viewerBooking?.conversation_id ? (
          <EventDetailBottomBar>
            <EventDetailPrimaryAction
              icon="chat"
              href={`/dm/${viewerBooking.conversation_id}?from=events`}
            >
              Open booking conversation
            </EventDetailPrimaryAction>
          </EventDetailBottomBar>
        ) : null}
      </div>

      {sendOpen && isOwner && !eventIsCancelled ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          onClick={() => {
            if (!sending) {
              requestCloseSendBookings();
            }
          }}
        >
          <div
            ref={sendBookingsSectionRef}
            role="dialog"
            aria-modal="true"
            aria-label="Send bookings"
            tabIndex={-1}
            className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-2xl border border-ftc-border-subtle bg-ftc-bg p-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:p-4 sm:pb-0 focus:outline-none"
            onClick={(clickEvent) => clickEvent.stopPropagation()}
          >
            <PlannerFormCard
              title="Send bookings"
              cardClassName="mb-0 p-0 border-0 bg-transparent shadow-none"
              titleClassName="text-base font-bold text-ftc-text"
              onCancel={requestCloseSendBookings}
              cancelDisabled={sending}
            >
              <SendBookingRequestsPanel
                draft={inviteDraft}
                disabled={sending}
                sending={sending}
                showSendButton
                onSend={requestSendBookings}
                introText="Event details will be prefilled from this event, each DJ receives a private booking request DM"
              />
            </PlannerFormCard>
          </div>
        </div>
      ) : null}

      <BookingSheetDialog
        open={sendDiscardConfirmOpen}
        title="Discard booking draft?"
        titleId="discard-send-bookings-title"
        description="Your selected DJs and entered booking details will be lost"
        overlayClassName="z-[60]"
        onBackdropClick={() => setSendDiscardConfirmOpen(false)}
        footer={
          <>
            <BookingSheetSecondaryButton onClick={() => setSendDiscardConfirmOpen(false)}>
              Keep editing
            </BookingSheetSecondaryButton>
            <BookingSheetDangerButton onClick={closeSendBookings}>Discard</BookingSheetDangerButton>
          </>
        }
      />

      <UnavailableDjBookingConfirmModal
        open={unavailableConfirmOpen}
        loading={sending}
        eventDate={event?.event_date ?? ""}
        unavailableDjs={inviteDraft.unavailableDjWarnings}
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
    </OnboardingGuard>
  );
}
