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
  EventDetailSecondaryAction,
} from "@/app/components/event-detail/EventDetailBottomBar";
import EventDetailMetaList, {
  EventDetailEditButton,
  EventDetailHero,
  EventDetailOverlayButton,
} from "@/app/components/event-detail/EventDetailLayout";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import {
  PlannerEmptyPanel,
  PlannerFilterPills,
  PlannerFormCard,
  PlannerFormField,
  PlannerStatChip,
} from "@/app/components/planner/PlannerUi";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import DjBookingAvailabilityBadge from "@/app/components/DjBookingAvailabilityBadge";
import { BookingDateField, BookingSetTimeRangeField } from "@/app/components/BookingDateTimeFields";
import EventCoverImageField, {
  emptyEventCoverImageFieldState,
  type EventCoverImageFieldState,
} from "@/app/components/events/EventCoverImageField";
import EventFallbackColourField from "@/app/components/events/EventFallbackColourField";
import EventEditConfirmDialog from "@/app/components/events/EventEditConfirmDialog";
import { EventCoverImageContextThumb } from "@/app/components/events/EventCoverImageDisplay";
import {
  isSelectableEventFallbackColourKey,
  type EventSelectableFallbackColourKey,
} from "@/lib/events/eventFallbackColour";
import { formatRateDisplay, isPositiveWholeDollarRate, normalizeStoredRate } from "@/lib/bookingRate";
import EventBookingDuplicateBadge from "@/app/components/EventBookingDuplicateBadge";
import UnavailableDjBookingConfirmModal from "@/app/components/UnavailableDjBookingConfirmModal";
import {
  getPlannerDjAvailabilityHints,
  getUnavailableDjBookingWarnings,
  type DjPlannerAvailabilityHint,
} from "@/lib/djAvailability";
import BookingStatusBadge from "@/app/components/booking/BookingStatusBadge";
import EventDjSendOfferControls, {
  DEFAULT_DJ_SEND_OFFER,
  formatDjSendOfferSummary,
  type DjSendOffer,
} from "@/app/components/booking/EventDjSendOfferControls";
import BookingRateProposalPanel from "@/app/components/booking/BookingRateProposalPanel";
import CancelBookingRequestButton from "@/app/components/CancelBookingRequestButton";
import CancelAcceptedBookingButton from "@/app/components/booking/CancelAcceptedBookingButton";
import HideDeclinedBookingButton from "@/app/components/HideDeclinedBookingButton";
import {
  cancelBookingRequest,
  cancelAcceptedBookingRequest,
  canCancelBookingRequest,
  getAcceptedBookingCancellationRole,
  resolveBookingCancellationReasonLabel,
  resolveBookingCancelledByLabel,
  acceptProposedBookingRate,
  ALL_SELECTED_DJS_ALREADY_HAVE_EVENT_REQUEST_MESSAGE,
  buildBookingSendResultMessage,
  buildEventBookingDuplicateMap,
  declineProposedBookingRate,
  filterActiveBookings,
  filterSendableRecipientIdsForEvent,
  filterVisibleEventLineupBookings,
  getActiveEventLineupStats,
  getBookingMutationErrorMessage,
  getBookingOfferRateLabel,
  hasPendingRateProposal,
  hideDeclinedBookingFromLineup,
  listBookingRequestsForEvent,
  sendBookingRequestsToDjs,
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
import { getEventCoverUploadErrorMessage, normalizeEventCoverImageUrl } from "@/lib/events/eventCoverImage";
import { shouldConfirmEventEditSave } from "@/lib/events/eventEditConfirmation";
import {
  getBookingImpactingEventFieldChanges,
  postEventGroupChatUpdate,
  shouldPostEventGroupChatUpdate,
} from "@/lib/events/eventGroupChatUpdate";
import { resolveEventDetailBackHref } from "@/lib/events/eventsListNavigation";
import {
  canManageEvents,
  getBookingRecipientProfilesByIds,
  getCurrentUserId,
  getCurrentUserProfile,
  listBookableDjs,
  type BookingRecipientProfile,
  type UserProfile,
  type UserRole,
} from "@/lib/user/currentUser";

const STATUS_FILTERS: { value: ActiveBookingStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
];

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
      }),
    [searchParams],
  );

  function goBackToEvents() {
    router.push(eventsBackHref);
  }

  const [role, setRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [lineup, setLineup] = useState<BookingRequest[]>([]);
  const [profiles, setProfiles] = useState<Map<string, BookingRecipientProfile>>(new Map());
  const [lineupFilter, setLineupFilter] = useState<ActiveBookingStatusFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EventInput | null>(null);
  const [editCoverField, setEditCoverField] = useState<EventCoverImageFieldState>(
    emptyEventCoverImageFieldState,
  );
  const pendingCoverSaveRef = useRef<EventCoverImageFieldState>(emptyEventCoverImageFieldState);
  const [editCoverPreviewUrl, setEditCoverPreviewUrl] = useState<string | null>(null);
  const [editCoverError, setEditCoverError] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const editFormSectionRef = useRef<HTMLElement | null>(null);

  const [sendOpen, setSendOpen] = useState(false);
  const [djOffers, setDjOffers] = useState<Record<string, DjSendOffer>>({});
  const [djs, setDjs] = useState<UserProfile[]>([]);
  const [selectedDjIds, setSelectedDjIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingDjs, setLoadingDjs] = useState(false);
  const [sending, setSending] = useState(false);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [proposalLoadingId, setProposalLoadingId] = useState<string | null>(null);
  const [hidingBookingId, setHidingBookingId] = useState<string | null>(null);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [cancellingEvent, setCancellingEvent] = useState(false);
  const [unavailableConfirmOpen, setUnavailableConfirmOpen] = useState(false);
  const [djAvailabilityHints, setDjAvailabilityHints] = useState<
    Map<string, DjPlannerAvailabilityHint>
  >(new Map());

  const isOwner = Boolean(event && currentUserId && event.owner_id === currentUserId);
  const editFlyerActive = Boolean(
    editCoverField.file ||
      editCoverPreviewUrl?.startsWith("blob:") ||
      (!editCoverField.removeExisting &&
        normalizeEventCoverImageUrl(event?.cover_image_url)),
  );
  const isPlanner = canManageEvents(role);
  const canEditEvent = isOwner && isPlanner;
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

  const filteredDjs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return djs;
    }

    return djs.filter((dj) => {
      const name = dj.display_name?.toLowerCase() ?? "";
      const genre = dj.genre?.toLowerCase() ?? "";
      return name.includes(query) || genre.includes(query);
    });
  }, [djs, searchQuery]);

  const eventBookingDuplicates = useMemo(
    () => buildEventBookingDuplicateMap(lineup),
    [lineup],
  );

  const sendableSelectedDjIds = useMemo(
    () => filterSendableRecipientIdsForEvent(selectedDjIds, lineup).sendableIds,
    [selectedDjIds, lineup],
  );

  const unavailableDjWarnings = useMemo(
    () => getUnavailableDjBookingWarnings(sendableSelectedDjIds, djs, djAvailabilityHints),
    [sendableSelectedDjIds, djs, djAvailabilityHints],
  );

  const allSelectedAreDuplicates =
    selectedDjIds.length > 0 && sendableSelectedDjIds.length === 0;

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

  const sendButtonLabel = sending
    ? "Sending..."
    : sendableSelectedDjIds.length === 0
      ? "No new DJs to send"
      : `Send to ${sendableSelectedDjIds.length} DJ${sendableSelectedDjIds.length === 1 ? "" : "s"}`;

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
        setError("Event not found or you do not have access.");
        return;
      }

      setEvent(loadedEvent);

      const bookings = await listBookingRequestsForEvent(eventId);
      setLineup(bookings);

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
      const bookings = await listBookingRequestsForEvent(eventId);
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
    setError(message);
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

    const shouldNotifyGroupChat = shouldPostEventGroupChatUpdate(event, editForm, lineup);
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

    if (
      !editForm.name.trim() ||
      !editForm.venue.trim() ||
      !editForm.eventDate.trim() ||
      !editForm.setTime.trim()
    ) {
      showEditFormError("Please fill in event name, venue, date, and set time.");
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
    setDjOffers({});
    setSelectedDjIds([]);
    setSearchQuery("");
    setError(null);
    setSuccessMessage(null);
    setLoadingDjs(true);

    try {
      const bookableDjs = await listBookableDjs();
      setDjs(bookableDjs);

      if (event?.event_date?.trim()) {
        const hints = await getPlannerDjAvailabilityHints(
          bookableDjs.map((dj) => dj.user_id),
          event.event_date,
        );
        setDjAvailabilityHints(hints);
      } else {
        setDjAvailabilityHints(new Map());
      }
    } catch (loadError) {
      console.error("Failed to load DJs for event bookings:", loadError);
      setError(loadError instanceof Error ? loadError.message : "Failed to load DJs");
    } finally {
      setLoadingDjs(false);
    }
  }

  function closeSendBookings() {
    if (sending) {
      return;
    }

    setSendOpen(false);
    setDjOffers({});
    setSelectedDjIds([]);
    setSearchQuery("");
    setUnavailableConfirmOpen(false);
  }

  function toggleDjSelection(userId: string) {
    setSelectedDjIds((prev) => {
      if (prev.includes(userId)) {
        setDjOffers((offers) => {
          const next = { ...offers };
          delete next[userId];
          return next;
        });
        return prev.filter((id) => id !== userId);
      }

      if (event) {
        setDjOffers((offers) => ({
          ...offers,
          [userId]: offers[userId] ?? {
            rateMode: "fixed",
            fee: "",
          },
        }));
      }

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

  function requestSendBookings() {
    if (!event) {
      return;
    }

    const { sendableIds, skippedIds } = filterSendableRecipientIdsForEvent(
      selectedDjIds,
      lineup,
    );

    if (skippedIds.length > 0) {
      setSelectedDjIds(sendableIds);
    }

    if (sendableIds.length === 0) {
      setError(ALL_SELECTED_DJS_ALREADY_HAVE_EVENT_REQUEST_MESSAGE);
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

    void executeSendBookings(sendableIds, skippedIds.length);
  }

  async function executeSendBookings(
    recipientIds: string[] = sendableSelectedDjIds,
    skippedDuplicateCount = 0,
  ) {
    if (!event) {
      return;
    }

    const { sendableIds, skippedIds } = filterSendableRecipientIdsForEvent(
      recipientIds,
      lineup,
    );
    const totalSkippedDuplicates = skippedDuplicateCount + skippedIds.length;

    if (sendableIds.length === 0) {
      setError(ALL_SELECTED_DJS_ALREADY_HAVE_EVENT_REQUEST_MESSAGE);
      setSelectedDjIds([]);
      return;
    }

    if (skippedIds.length > 0) {
      setSelectedDjIds(sendableIds);
    }

    setSending(true);
    setError(null);

    try {
      const baseInput = eventToRequestInput(event);
      const { successes, failures, skippedDuplicateRecipientIds } =
        await sendBookingRequestsToDjs(sendableIds, baseInput, {
          existingEventBookings: lineup,
          perRecipient: (recipientId) => {
            const offer = djOffers[recipientId] ?? DEFAULT_DJ_SEND_OFFER;

            return {
              rateMode: offer.rateMode,
              fee: normalizeStoredRate(offer.fee),
            };
          },
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
      await cancelAcceptedBookingRequest(booking, reason, djDisplayName);
      await reloadEventLineup();
      setSuccessMessage(
        booking.sender_id === currentUserId
          ? "Booking cancelled."
          : "You withdrew from this event.",
      );
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
      router.replace("/events");
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
      router.replace("/events");
    } catch (cancelError) {
      console.error("Failed to cancel event:", cancelError);
      setError(getEventsLoadErrorMessage(cancelError));
      setCancellingEvent(false);
    }
  }

  const viewerBooking = useMemo(
    () =>
      currentUserId
        ? visibleLineup.find((booking) => booking.recipient_id === currentUserId) ?? null
        : null,
    [visibleLineup, currentUserId],
  );

  const showStickyActions = !editOpen && !sendOpen;
  const showOwnerSendAction = isOwner && isPlanner && !eventIsCancelled;
  const showBottomBar =
    showStickyActions &&
    (showOwnerSendAction || canOpenCrewChat || Boolean(viewerBooking?.conversation_id));

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-ftc-bg text-sm text-ftc-text-muted">
        Loading...
      </div>
    );
  }

  if (!event) {
    return (
      <OnboardingGuard>
        <div
          className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
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
        className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
      >
        <AppNavigation />

        <div className="border-b border-ftc-border-subtle bg-ftc-bg/95 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <EventDetailOverlayButton onClick={goBackToEvents} label="Back to events">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </EventDetailOverlayButton>

            <div className="flex items-center gap-2">
              {canOpenCrewChat ? (
                <EventDetailOverlayButton
                  href={`/events/${event.id}/chat`}
                  label="Open group chat"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 2 2 0 0 1-1.8 1.1h-3.7l-3 3v-3H8a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" />
                  </svg>
                </EventDetailOverlayButton>
              ) : null}
              {canEditEvent ? (
                <EventDetailEditButton onClick={openEditForm} />
              ) : null}
            </div>
          </div>
        </div>

        <EventDetailHero
          eventName={event.name}
          coverImageUrl={event.cover_image_url}
          fallbackColour={event.fallback_colour}
          statusBadge={<EventDateStatusBadge eventDate={event.event_date} status={event.status} />}
        />

        <div className={`px-4 sm:px-6 ${showBottomBar ? "pb-28" : "pb-6"} pt-5`}>
          {searchParams.get("coverUpload") === "failed" ? (
            <p className="mb-4 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-3 text-sm text-ftc-text-secondary">
              Event saved, but the flyer could not be uploaded. Open Edit event to try again.
            </p>
          ) : null}

          {successMessage ? (
            <p className="mb-4 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-3 text-sm text-ftc-text-secondary">
              {successMessage}
            </p>
          ) : null}

          {error ? (
            <p className="mb-4 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-3 text-sm text-[var(--ftc-color-danger)]">
              {error}
            </p>
          ) : null}

          <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-ftc-text sm:text-3xl">
            {event.name}
          </h1>

          <div className="mt-5">
            <EventDetailMetaList event={event} />
          </div>

          {event.notes?.trim() ? (
            <section className="mt-8">
              <h2 className="text-lg font-bold text-ftc-text">About</h2>
              <p className="mt-3 text-sm leading-relaxed text-ftc-text-secondary">{event.notes}</p>
            </section>
          ) : null}

          {isOwner && isPlanner && canManageEventLifecycle ? (
            <div className="mt-6">
              <EventDeleteCancelButton
                mode={hasLinkedBookings ? "cancel" : "delete"}
                loading={hasLinkedBookings ? cancellingEvent : deletingEvent}
                disabled={deletingEvent || cancellingEvent}
                onConfirm={hasLinkedBookings ? handleCancelEvent : handleDeleteEvent}
              />
            </div>
          ) : null}

          {editOpen && editForm && canEditEvent ? (
            <section ref={editFormSectionRef} className="scroll-mt-24">
            <PlannerFormCard
              title="Edit event"
              onCancel={() => {
                if (savingEdit) return;
                setEditOpen(false);
                setEditForm(null);
                resetEditCoverState();
                setEditFormError(null);
              }}
              cancelDisabled={savingEdit}
            >
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <PlannerFormField
                  label="Event name"
                  value={editForm.name}
                  onChange={(value) => setEditForm((prev) => (prev ? { ...prev, name: value } : prev))}
                  required
                />
                <PlannerFormField
                  label="Venue"
                  value={editForm.venue}
                  onChange={(value) => setEditForm((prev) => (prev ? { ...prev, venue: value } : prev))}
                  required
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
                  required
                />
                <BookingSetTimeRangeField
                  value={editForm.setTime}
                  onChange={(value) =>
                    setEditForm((prev) => (prev ? { ...prev, setTime: value } : prev))
                  }
                  required
                />
                <PlannerFormField
                  label="Notes"
                  value={editForm.notes}
                  onChange={(value) => setEditForm((prev) => (prev ? { ...prev, notes: value } : prev))}
                  multiline
                />

                {editFormError ? (
                  <p className="text-sm text-[var(--ftc-color-danger)]">{editFormError}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="ftc-btn-primary px-5 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save changes"}
                </button>
              </form>
            </PlannerFormCard>
            </section>
          ) : null}

          {sendOpen && isOwner && !eventIsCancelled ? (
            <PlannerFormCard title="Send bookings" onCancel={closeSendBookings} cancelDisabled={sending}>
              <div className="flex items-start gap-3">
                <EventCoverImageContextThumb
                  eventName={event.name}
                  coverImageUrl={event.cover_image_url}
                  fallbackColour={event.fallback_colour}
                />
                <p className="min-w-0 text-sm text-ftc-text-secondary">
                  Event details will be prefilled from this event. Each DJ receives a private booking
                  request DM.
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ftc-text-muted">
                  Per-DJ offers
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ftc-text-secondary">
                  Select DJs below, then set a fixed offer or open to offers for each one.
                </p>
              </div>

              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search DJs by name or genre"
                className="mb-4 mt-4 ftc-input px-3.5 py-2.5"
              />

              {loadingDjs ? (
                <p className="text-sm text-ftc-text-muted">Loading DJs...</p>
              ) : filteredDjs.length === 0 ? (
                <PlannerEmptyPanel message="No available DJs to invite." />
              ) : (
                <ul className="max-h-80 space-y-2 overflow-y-auto">
                  {filteredDjs.map((dj) => {
                    const selected = selectedDjIds.includes(dj.user_id);
                    const displayName = dj.display_name?.trim() || "DJ";
                    const availabilityHint = djAvailabilityHints.get(dj.user_id);
                    const duplicateStatus = eventBookingDuplicates.get(dj.user_id);
                    const isDuplicateBlocked = Boolean(duplicateStatus);
                    const offer = djOffers[dj.user_id] ?? DEFAULT_DJ_SEND_OFFER;

                    return (
                      <li key={dj.user_id}>
                        <button
                          type="button"
                          disabled={isDuplicateBlocked}
                          onClick={() => toggleDjSelection(dj.user_id)}
                          className={`ftc-option-card flex w-full items-center gap-3 px-3 py-3 disabled:cursor-not-allowed ${
                            selected
                              ? "ftc-option-card-selected"
                              : isDuplicateBlocked
                                ? "opacity-70"
                                : ""
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                              selected
                                ? "border-0 bg-ftc-primary text-ftc-bg"
                                : "border-ftc-border-subtle bg-ftc-bg-input text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                          <ProfileAvatar
                            name={displayName}
                            avatarUrl={dj.avatar_url}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1 text-left">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-ftc-text">{displayName}</p>
                              {duplicateStatus ? (
                                <EventBookingDuplicateBadge status={duplicateStatus} />
                              ) : null}
                              {availabilityHint ? (
                                <DjBookingAvailabilityBadge hint={availabilityHint} />
                              ) : null}
                            </div>
                            {dj.genre?.trim() ? (
                              <p className="text-sm text-ftc-text-muted">{dj.genre}</p>
                            ) : null}
                          </div>
                        </button>
                        {selected ? (
                          <div className="mt-2 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated p-3">
                            <EventDjSendOfferControls
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

              {allSelectedAreDuplicates ? (
                <p className="mt-4 text-xs text-ftc-text-muted">
                  Selected DJs already have a request for this event.
                </p>
              ) : null}

              {sendOfferSummary.length > 0 ? (
                <div className="mt-4 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated p-4">
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
                      Enter a positive whole-dollar amount for each fixed offer before sending.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <button
                type="button"
                onClick={requestSendBookings}
                disabled={sending || sendableSelectedDjIds.length === 0 || hasInvalidFixedOffers}
                className="mt-4 w-full ftc-btn-primary px-5 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendButtonLabel}
              </button>
            </PlannerFormCard>
          ) : null}

          {canViewRunSheet ? (
            <div className="mt-8">
              <EventRunSheetSection
                eventId={event.id}
                canEdit={canEditRunSheet}
                lineup={lineup}
                profiles={profiles}
                onSaved={(message) => setSuccessMessage(message)}
              />
            </div>
          ) : null}

          {!isOwner && viewerBooking ? (
            <section className="mt-8 ftc-card p-4 sm:p-5">
              <h2 className="text-lg font-bold text-ftc-text">Your booking</h2>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <BookingStatusBadge status={viewerBooking.status} />
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
                    />
                  ) : null}
                  {viewerBooking.conversation_id ? (
                    <Link
                      href={`/dm/${viewerBooking.conversation_id}`}
                      className="ftc-btn-secondary px-4 py-2.5 text-xs uppercase tracking-wide"
                    >
                      Open DM
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {isOwner ? (
            <section className="mt-8 ftc-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-ftc-text">Bookings</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <PlannerStatChip label="Invited" value={lineupStats.total} />
                    <PlannerStatChip label="Pending" value={lineupStats.pending} />
                    <PlannerStatChip label="Accepted" value={lineupStats.accepted} />
                    <PlannerStatChip label="Declined" value={lineupStats.declined} />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <PlannerFilterPills
                  options={STATUS_FILTERS}
                  value={lineupFilter}
                  onChange={setLineupFilter}
                />
              </div>

              {filteredLineup.length === 0 ? (
                <PlannerEmptyPanel
                  className="mt-6"
                  message="No DJs invited yet. Send booking requests to build your lineup."
                />
              ) : (
                <ul className="mt-4 space-y-3">
                  {filteredLineup.map((booking) => {
                    const profile = profiles.get(booking.recipient_id);
                    const displayName = profile?.display_name?.trim() || "DJ";
                    const cancelledByLabel = resolveBookingCancelledByLabel(booking, profiles);
                    const cancellationReasonLabel = resolveBookingCancellationReasonLabel(booking);
                    const acceptedCancellationRole = getAcceptedBookingCancellationRole(
                      booking,
                      currentUserId,
                    );
                    const canHideFromLineup =
                      isOwner &&
                      isPlanner &&
                      booking.status === "declined" &&
                      !booking.lineup_hidden_at;

                    return (
                      <li
                        key={booking.id}
                        className={`ftc-card relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
                          canHideFromLineup ? "pr-12 sm:pr-14" : ""
                        }`}
                      >
                        {canHideFromLineup ? (
                          <HideDeclinedBookingButton
                            className="absolute right-3 top-3"
                            loading={hidingBookingId === booking.id}
                            disabled={Boolean(hidingBookingId) && hidingBookingId !== booking.id}
                            onConfirm={() => handleHideFromLineup(booking.id)}
                          />
                        ) : null}
                        <div className="flex min-w-0 items-center gap-3">
                          <ProfileAvatar
                            name={displayName}
                            avatarUrl={profile?.avatar_url}
                            size="md"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-ftc-text">{displayName}</p>
                            {profile?.genre?.trim() ? (
                              <p className="text-sm text-ftc-text-muted">{profile.genre}</p>
                            ) : null}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <BookingStatusBadge status={booking.status} />
                              {hasPendingRateProposal(booking) ? (
                                <span className="inline-flex rounded-full border border-ftc-border-subtle bg-ftc-bg-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ftc-primary">
                                  Rate proposed
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-xs text-ftc-text-muted">
                              {booking.rate_mode === "open" ? "Open offer" : "Fixed offer"} ·{" "}
                              {getBookingOfferRateLabel(booking)}
                            </p>
                            {cancelledByLabel ? (
                              <p className="mt-2 text-xs text-ftc-text-muted">
                                Cancelled by {cancelledByLabel}
                              </p>
                            ) : null}
                            {cancellationReasonLabel ? (
                              <p className="text-xs text-ftc-text-muted">
                                Reason: {cancellationReasonLabel}
                              </p>
                            ) : null}
                            <BookingRateProposalPanel
                              booking={booking}
                              currentUserId={currentUserId}
                              loading={proposalLoadingId === booking.id}
                              onAcceptProposal={() => handleAcceptProposedRate(booking)}
                              onKeepOriginalOffer={() => handleKeepOriginalOffer(booking)}
                              onDeclineBooking={() => handleCancelBooking(booking.id)}
                            />
                          </div>
                        </div>

                        <div className="flex flex-col items-stretch gap-2 sm:shrink-0 sm:items-end">
                          {canCancelBookingRequest(booking, currentUserId) ? (
                            <CancelBookingRequestButton
                              loading={cancellingBookingId === booking.id}
                              onConfirm={() => handleCancelBooking(booking.id)}
                            />
                          ) : null}
                          {acceptedCancellationRole === "planner" ? (
                            <CancelAcceptedBookingButton
                              role="planner"
                              loading={cancellingBookingId === booking.id}
                              onConfirm={(reason) => handleCancelAcceptedBooking(booking, reason)}
                            />
                          ) : null}
                          <Link
                            href={`/dm/${booking.conversation_id}`}
                            className="ftc-btn-secondary px-3 py-1.5 text-xs uppercase tracking-wide"
                          >
                            Open DM
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}
        </div>

        {showBottomBar ? (
          <EventDetailBottomBar>
            {showOwnerSendAction ? (
              <EventDetailPrimaryAction onClick={openSendBookings}>
                Send booking requests
              </EventDetailPrimaryAction>
            ) : null}
            {!showOwnerSendAction && viewerBooking?.conversation_id ? (
              <EventDetailPrimaryAction href={`/dm/${viewerBooking.conversation_id}`}>
                Open booking conversation
              </EventDetailPrimaryAction>
            ) : null}
            {!showOwnerSendAction && !viewerBooking?.conversation_id && canOpenCrewChat ? (
              <EventDetailPrimaryAction href={`/events/${event.id}/chat`}>
                Group chat
              </EventDetailPrimaryAction>
            ) : null}
            {(showOwnerSendAction || Boolean(viewerBooking?.conversation_id)) && canOpenCrewChat ? (
              <EventDetailSecondaryAction href={`/events/${event.id}/chat`}>
                Group chat
              </EventDetailSecondaryAction>
            ) : null}
          </EventDetailBottomBar>
        ) : null}
      </div>

      <UnavailableDjBookingConfirmModal
        open={unavailableConfirmOpen}
        loading={sending}
        eventDate={event?.event_date ?? ""}
        unavailableDjs={unavailableDjWarnings}
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
