"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import EventDeleteCancelButton from "@/app/components/EventDeleteCancelButton";
import EventDateStatusBadge from "@/app/components/EventDateStatusBadge";
import EventRunSheetSection from "@/app/components/EventRunSheetSection";
import EventDetailBottomBar, {
  EventDetailPrimaryAction,
  EventDetailSecondaryAction,
} from "@/app/components/event-detail/EventDetailBottomBar";
import EventDetailLineupList from "@/app/components/event-detail/EventDetailLineupList";
import EventDetailMetaList, {
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
import { BookingRateField } from "@/app/components/BookingRateField";
import EventCoverImageField, {
  emptyEventCoverImageFieldState,
  type EventCoverImageFieldState,
} from "@/app/components/events/EventCoverImageField";
import { EventCoverImageContextThumb } from "@/app/components/events/EventCoverImageDisplay";
import { formatRateDisplay } from "@/lib/bookingRate";
import EventBookingDuplicateBadge from "@/app/components/EventBookingDuplicateBadge";
import UnavailableDjBookingConfirmModal from "@/app/components/UnavailableDjBookingConfirmModal";
import {
  getPlannerDjAvailabilityHints,
  getUnavailableDjBookingWarnings,
  type DjPlannerAvailabilityHint,
} from "@/lib/djAvailability";
import BookingStatusBadge from "@/app/components/booking/BookingStatusBadge";
import CancelBookingRequestButton from "@/app/components/CancelBookingRequestButton";
import HideDeclinedBookingButton from "@/app/components/HideDeclinedBookingButton";
import {
  cancelBookingRequest,
  canCancelBookingRequest,
  ALL_SELECTED_DJS_ALREADY_HAVE_EVENT_REQUEST_MESSAGE,
  buildBookingSendResultMessage,
  buildEventBookingDuplicateMap,
  filterActiveBookings,
  filterSendableRecipientIdsForEvent,
  filterVisibleEventLineupBookings,
  getActiveEventLineupStats,
  getBookingMutationErrorMessage,
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
  updateEventCoverImageUrl,
  type Event,
  type EventInput,
} from "@/lib/events";
import {
  deleteEventCoverStorageObject,
  getEventCoverUploadErrorMessage,
  uploadEventCoverImage,
} from "@/lib/events/eventCoverImage";
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
  const [editCoverPreviewUrl, setEditCoverPreviewUrl] = useState<string | null>(null);
  const [editCoverError, setEditCoverError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [sendOpen, setSendOpen] = useState(false);
  const [djs, setDjs] = useState<UserProfile[]>([]);
  const [selectedDjIds, setSelectedDjIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingDjs, setLoadingDjs] = useState(false);
  const [sending, setSending] = useState(false);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [hidingBookingId, setHidingBookingId] = useState<string | null>(null);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [cancellingEvent, setCancellingEvent] = useState(false);
  const [unavailableConfirmOpen, setUnavailableConfirmOpen] = useState(false);
  const [djAvailabilityHints, setDjAvailabilityHints] = useState<
    Map<string, DjPlannerAvailabilityHint>
  >(new Map());

  const isOwner = Boolean(event && currentUserId && event.owner_id === currentUserId);
  const isPlanner = canManageEvents(role);
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
    if (lineupFilter === "all") {
      return activeLineup;
    }

    return activeLineup.filter((booking) => booking.status === lineupFilter);
  }, [activeLineup, lineupFilter]);

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
    if (editCoverPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(editCoverPreviewUrl);
    }
    setEditCoverPreviewUrl(null);
    setEditCoverError(null);
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
    });
    resetEditCoverState();
    setEditOpen(true);
    setError(null);
  }

  async function applyEditCoverChanges(previousCoverUrl: string | null): Promise<string | null> {
    if (!event) {
      return previousCoverUrl;
    }

    if (editCoverField.removeExisting) {
      await updateEventCoverImageUrl(event.id, null);
      await deleteEventCoverStorageObject(previousCoverUrl);
      return null;
    }

    if (editCoverField.file) {
      const nextCoverUrl = await uploadEventCoverImage(event.id, editCoverField.file);
      await updateEventCoverImageUrl(event.id, nextCoverUrl);
      await deleteEventCoverStorageObject(previousCoverUrl);
      return nextCoverUrl;
    }

    return previousCoverUrl;
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
      setError("Please fill in event name, venue, date, and set time.");
      return;
    }

    setSavingEdit(true);
    setError(null);

    try {
      const previousCoverUrl = event.cover_image_url;
      const updated = await updateEvent(event.id, editForm);
      let nextCoverUrl = previousCoverUrl;

      try {
        nextCoverUrl = await applyEditCoverChanges(previousCoverUrl);
      } catch (coverError) {
        console.error("Failed to update event cover image:", coverError);
        setEvent(updated);
        setEditOpen(false);
        setEditForm(null);
        resetEditCoverState();
        setError(getEventCoverUploadErrorMessage(coverError));
        setSuccessMessage("Event details saved, but the flyer could not be updated.");
        return;
      }

      setEvent({ ...updated, cover_image_url: nextCoverUrl });
      setEditOpen(false);
      setEditForm(null);
      resetEditCoverState();
      setSuccessMessage("Event updated");
    } catch (saveError) {
      console.error("Failed to update event:", saveError);
      setError(saveError instanceof Error ? saveError.message : "Failed to update event");
    } finally {
      setSavingEdit(false);
    }
  }

  async function openSendBookings() {
    if (!event || eventIsCancelled) {
      return;
    }

    setSendOpen(true);
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
    setSelectedDjIds([]);
    setSearchQuery("");
    setUnavailableConfirmOpen(false);
  }

  function toggleDjSelection(userId: string) {
    setSelectedDjIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
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
      const input = eventToRequestInput(event);
      const { successes, failures, skippedDuplicateRecipientIds } =
        await sendBookingRequestsToDjs(sendableIds, input, {
          existingEventBookings: lineup,
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
        ? activeLineup.find((booking) => booking.recipient_id === currentUserId) ?? null
        : null,
    [activeLineup, currentUserId],
  );

  const acceptedLineup = useMemo(
    () => activeLineup.filter((booking) => booking.status === "accepted"),
    [activeLineup],
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
            <Link href="/events" className="mt-4 inline-block text-sm font-semibold text-ftc-primary">
              Back to events
            </Link>
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
            <EventDetailOverlayButton href="/events" label="Back to events">
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
              {isOwner && isPlanner ? (
                <EventDetailOverlayButton label="Edit event" onClick={openEditForm}>
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </EventDetailOverlayButton>
              ) : null}
            </div>
          </div>
        </div>

        <EventDetailHero
          eventName={event.name}
          coverImageUrl={event.cover_image_url}
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

          {editOpen && editForm && isOwner ? (
            <PlannerFormCard
              title="Edit event"
              onCancel={() => {
                if (savingEdit) return;
                setEditOpen(false);
                setEditForm(null);
                resetEditCoverState();
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
                  onChange={setEditCoverField}
                  onPreviewUrlChange={setEditCoverPreviewUrl}
                  onValidationError={setEditCoverError}
                  error={editCoverError}
                  disabled={savingEdit}
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
                <BookingRateField
                  value={editForm.rate}
                  onChange={(value) => setEditForm((prev) => (prev ? { ...prev, rate: value } : prev))}
                />
                <PlannerFormField
                  label="Notes"
                  value={editForm.notes}
                  onChange={(value) => setEditForm((prev) => (prev ? { ...prev, notes: value } : prev))}
                  multiline
                />

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="ftc-btn-primary px-5 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save changes"}
                </button>
              </form>
            </PlannerFormCard>
          ) : null}

          {sendOpen && isOwner && !eventIsCancelled ? (
            <PlannerFormCard title="Send bookings" onCancel={closeSendBookings} cancelDisabled={sending}>
              <div className="flex items-start gap-3">
                {event.cover_image_url?.trim() ? (
                  <EventCoverImageContextThumb
                    coverImageUrl={event.cover_image_url.trim()}
                    eventName={event.name}
                  />
                ) : null}
                <p className="min-w-0 text-sm text-ftc-text-secondary">
                  Event details will be prefilled from this event. Each DJ receives a private booking
                  request DM.
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

                    return (
                      <li key={dj.user_id}>
                        <button
                          type="button"
                          disabled={isDuplicateBlocked}
                          onClick={() => toggleDjSelection(dj.user_id)}
                          className={`ftc-option-card flex items-center gap-3 px-3 py-3 disabled:cursor-not-allowed ${
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
                            {dj.genre?.trim() ? (
                              <p className="text-sm text-ftc-text-muted">{dj.genre}</p>
                            ) : null}
                          </div>
                        </button>
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

              <button
                type="button"
                onClick={requestSendBookings}
                disabled={sending || sendableSelectedDjIds.length === 0}
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

          <section className="mt-8">
            <h2 className="text-lg font-bold text-ftc-text">Lineup</h2>
            {acceptedLineup.length === 0 ? (
              <PlannerEmptyPanel
                className="mt-4"
                message={
                  isOwner
                    ? "No confirmed artists yet. Send booking requests to build your lineup."
                    : "Lineup will appear here once artists are confirmed."
                }
              />
            ) : (
              <div className="mt-4">
                <EventDetailLineupList bookings={acceptedLineup} profiles={profiles} />
              </div>
            )}
          </section>

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
                </div>
                {viewerBooking.conversation_id ? (
                  <Link
                    href={`/dm/${viewerBooking.conversation_id}`}
                    className="ftc-btn-secondary px-4 py-2.5 text-xs uppercase tracking-wide"
                  >
                    Open DM
                  </Link>
                ) : null}
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
                            <div className="mt-2">
                              <BookingStatusBadge status={booking.status} />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-stretch gap-2 sm:shrink-0 sm:items-end">
                          {canCancelBookingRequest(booking, currentUserId) ? (
                            <CancelBookingRequestButton
                              loading={cancellingBookingId === booking.id}
                              onConfirm={() => handleCancelBooking(booking.id)}
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
    </OnboardingGuard>
  );
}
