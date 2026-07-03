"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import { BookingDateField, BookingSetTimeRangeField } from "@/app/components/BookingDateTimeFields";
import { BookingRateField } from "@/app/components/BookingRateField";
import { formatRateDisplay } from "@/lib/bookingRate";
import {
  formatBookingStatusLabel,
  getEventLineupStats,
  listBookingRequestsForEvent,
  sendBookingRequestsToDjs,
  type BookingRequest,
  type BookingRequestStatus,
  type BookingStatusFilter,
} from "@/lib/bookingRequests";
import {
  eventToRequestInput,
  formatEventStatusLabel,
  getEventById,
  getEventsLoadErrorMessage,
  updateEvent,
  type Event,
  type EventInput,
  type EventStatus,
} from "@/lib/events";
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

const STATUS_FILTERS: { value: BookingStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
];

const EVENT_STATUSES: { value: EventStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function EventStatusBadge({ status }: { status: EventStatus }) {
  const classes =
    status === "upcoming"
      ? "border-blue-500/40 bg-blue-600/15 text-blue-300"
      : status === "completed"
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
        : status === "cancelled"
          ? "border-red-500/40 bg-red-500/10 text-red-300"
          : "border-zinc-600/50 bg-zinc-800/80 text-zinc-300";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${classes}`}
    >
      {formatEventStatusLabel(status)}
    </span>
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

export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  const [role, setRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [lineup, setLineup] = useState<BookingRequest[]>([]);
  const [profiles, setProfiles] = useState<Map<string, BookingRecipientProfile>>(new Map());
  const [lineupFilter, setLineupFilter] = useState<BookingStatusFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EventInput | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [sendOpen, setSendOpen] = useState(false);
  const [djs, setDjs] = useState<UserProfile[]>([]);
  const [selectedDjIds, setSelectedDjIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingDjs, setLoadingDjs] = useState(false);
  const [sending, setSending] = useState(false);

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

  const lineupStats = useMemo(() => getEventLineupStats(lineup), [lineup]);

  const filteredLineup = useMemo(() => {
    if (lineupFilter === "all") {
      return lineup;
    }

    return lineup.filter((booking) => booking.status === lineupFilter);
  }, [lineup, lineupFilter]);

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
      status: event.status,
      bookingPlanId: event.booking_plan_id,
    });
    setEditOpen(true);
    setError(null);
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
      const updated = await updateEvent(event.id, editForm);
      setEvent(updated);
      setEditOpen(false);
      setEditForm(null);
      setSuccessMessage("Event updated");
    } catch (saveError) {
      console.error("Failed to update event:", saveError);
      setError(saveError instanceof Error ? saveError.message : "Failed to update event");
    } finally {
      setSavingEdit(false);
    }
  }

  async function openSendBookings() {
    if (!event) {
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
      const alreadyInvited = new Set(lineup.map((booking) => booking.recipient_id));
      setDjs(bookableDjs.filter((dj) => !alreadyInvited.has(dj.user_id)));
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
  }

  function toggleDjSelection(userId: string) {
    setSelectedDjIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  async function handleSendBookings() {
    if (!event) {
      return;
    }

    if (selectedDjIds.length === 0) {
      setError("Select at least one DJ.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const input = eventToRequestInput(event);
      const { successes, failures } = await sendBookingRequestsToDjs(selectedDjIds, input);

      if (successes.length === 0) {
        setError("Failed to send booking requests. Please try again.");
        return;
      }

      setSuccessMessage(
        `Sent booking request to ${successes.length} DJ${successes.length === 1 ? "" : "s"}.`,
      );
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

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#070708] text-sm text-zinc-500">
        Loading...
      </div>
    );
  }

  if (!event) {
    return (
      <OnboardingGuard>
        <div
          className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-[#070708] font-sans text-zinc-100 ${MOBILE_NAV_OFFSET_CLASS}`}
        >
          <AppNavigation />
          <div className="px-4 py-8 sm:px-6">
            <p className="text-sm text-red-400">{error ?? "Event not found."}</p>
            <Link href="/events" className="mt-4 inline-block text-sm font-semibold text-blue-300">
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
        className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-[#070708] font-sans text-zinc-100 ${MOBILE_NAV_OFFSET_CLASS}`}
      >
        <AppNavigation />

        <header className="border-b border-zinc-800/80 px-4 py-4 sm:px-6 md:pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href="/events"
                className="text-xs font-semibold uppercase tracking-wide text-zinc-500 transition hover:text-zinc-300"
              >
                ← Events
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-zinc-50">{event.name}</h1>
                <EventStatusBadge status={event.status} />
              </div>
            </div>

            {canOpenCrewChat ? (
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <Link
                  href={`/events/${event.id}/chat`}
                  className="rounded-lg border border-blue-500/35 bg-blue-600/10 px-3 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-blue-300 transition hover:border-blue-400/50 hover:bg-blue-600/20"
                >
                  Open crew chat
                </Link>
                {isOwner && isPlanner ? (
                  <>
                    <button
                      type="button"
                      onClick={openEditForm}
                      className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-300 transition hover:border-blue-500/35 hover:text-blue-300"
                    >
                      Edit event
                    </button>
                    <button
                      type="button"
                      onClick={openSendBookings}
                      className="rounded-lg border border-blue-500/35 bg-blue-600/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-300 transition hover:border-blue-400/50 hover:bg-blue-600/20"
                    >
                      Send booking requests
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        <div className="px-4 py-4 sm:px-6">
          {successMessage ? (
            <p className="mb-4 rounded-xl border border-blue-500/30 bg-blue-600/10 px-4 py-3 text-sm text-blue-200">
              {successMessage}
            </p>
          ) : null}

          {error ? (
            <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          {editOpen && editForm && isOwner ? (
            <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-zinc-50">Edit event</h2>
                <button
                  type="button"
                  onClick={() => {
                    if (savingEdit) return;
                    setEditOpen(false);
                    setEditForm(null);
                  }}
                  disabled={savingEdit}
                  className="text-xs font-semibold uppercase tracking-wide text-zinc-500 transition hover:text-zinc-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <EventField
                  label="Event name"
                  value={editForm.name}
                  onChange={(value) => setEditForm((prev) => (prev ? { ...prev, name: value } : prev))}
                  required
                />
                <EventField
                  label="Venue"
                  value={editForm.venue}
                  onChange={(value) => setEditForm((prev) => (prev ? { ...prev, venue: value } : prev))}
                  required
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
                <EventField
                  label="Notes"
                  value={editForm.notes}
                  onChange={(value) => setEditForm((prev) => (prev ? { ...prev, notes: value } : prev))}
                  multiline
                />
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Event status
                  </span>
                  <select
                    value={editForm.status}
                    onChange={(event) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, status: event.target.value as EventStatus } : prev,
                      )
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15"
                  >
                    {EVENT_STATUSES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-xl border border-blue-500/45 bg-blue-600/20 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.22)] transition hover:border-blue-400/60 hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save changes"}
                </button>
              </form>
            </section>
          ) : null}

          {sendOpen && isOwner ? (
            <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-400">
                    Send bookings
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-zinc-50">Select DJs</h2>
                </div>
                <button
                  type="button"
                  onClick={closeSendBookings}
                  disabled={sending}
                  className="text-xs font-semibold uppercase tracking-wide text-zinc-500 transition hover:text-zinc-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              <p className="mb-4 text-sm text-zinc-400">
                Event details will be prefilled from this event. Each DJ receives a private booking
                request DM.
              </p>

              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search DJs by name or genre"
                className="mb-4 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15"
              />

              {loadingDjs ? (
                <p className="text-sm text-zinc-500">Loading DJs...</p>
              ) : filteredDjs.length === 0 ? (
                <p className="text-sm text-zinc-400">No available DJs to invite.</p>
              ) : (
                <ul className="max-h-80 space-y-2 overflow-y-auto">
                  {filteredDjs.map((dj) => {
                    const selected = selectedDjIds.includes(dj.user_id);
                    const displayName = dj.display_name?.trim() || "DJ";

                    return (
                      <li key={dj.user_id}>
                        <button
                          type="button"
                          onClick={() => toggleDjSelection(dj.user_id)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                            selected
                              ? "border-blue-500/50 bg-blue-600/10"
                              : "border-zinc-800 bg-zinc-950/40 hover:border-blue-500/30"
                          }`}
                        >
                          <ProfileAvatar
                            name={displayName}
                            avatarUrl={dj.avatar_url}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-50">{displayName}</p>
                            {dj.genre?.trim() ? (
                              <p className="text-sm text-zinc-500">{dj.genre}</p>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <button
                type="button"
                onClick={handleSendBookings}
                disabled={sending || selectedDjIds.length === 0}
                className="mt-4 w-full rounded-xl border border-blue-500/45 bg-blue-600/20 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.22)] transition hover:border-blue-400/60 hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending
                  ? "Sending..."
                  : `Send to ${selectedDjIds.length} DJ${selectedDjIds.length === 1 ? "" : "s"}`}
              </button>
            </section>
          ) : null}

          <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-400">
              Event details
            </h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <DetailItem label="Venue" value={event.venue} />
              <DetailItem label="Date" value={event.event_date} />
              <DetailItem label="Set time" value={event.set_time} />
              <DetailItem label="Rate" value={formatRateDisplay(event.rate)} />
            </dl>
            {event.notes?.trim() ? (
              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Notes</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-300">{event.notes}</p>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-400">
                  {isOwner ? "Lineup / Bookings" : "Your booking"}
                </h2>
                {isOwner ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide">
                    <LineupStat label="Invited" value={lineupStats.total} />
                    <LineupStat label="Pending" value={lineupStats.pending} />
                    <LineupStat label="Accepted" value={lineupStats.accepted} />
                    <LineupStat label="Declined" value={lineupStats.declined} />
                  </div>
                ) : null}
              </div>
            </div>

            {isOwner ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {STATUS_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setLineupFilter(filter.value)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition ${
                      lineupFilter === filter.value
                        ? "border-blue-500/50 bg-blue-600/15 text-blue-300"
                        : "border-zinc-700 bg-zinc-900/80 text-zinc-400 hover:border-blue-500/30 hover:text-blue-300"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            ) : null}

            {filteredLineup.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-8 text-center">
                <p className="text-sm text-zinc-400">
                  {isOwner
                    ? "No DJs invited yet. Send booking requests to build your lineup."
                    : "No booking linked to this event yet."}
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {filteredLineup.map((booking) => {
                  const profile = profiles.get(booking.recipient_id);
                  const displayName = profile?.display_name?.trim() || "DJ";

                  return (
                    <li
                      key={booking.id}
                      className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <ProfileAvatar
                          name={displayName}
                          avatarUrl={profile?.avatar_url}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-50">{displayName}</p>
                          {profile?.genre?.trim() ? (
                            <p className="text-sm text-zinc-500">{profile.genre}</p>
                          ) : null}
                          <div className="mt-2">
                            <BookingStatusBadge status={booking.status} />
                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/dm/${booking.conversation_id}`}
                        className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-300 transition hover:border-blue-500/35 hover:text-blue-300"
                      >
                        Open DM
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </OnboardingGuard>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-zinc-200">{value}</dd>
    </div>
  );
}

function LineupStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2.5 py-1 text-zinc-400">
      {label}: <span className="text-zinc-200">{value}</span>
    </span>
  );
}

function EventField({
  label,
  value,
  onChange,
  required = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
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
          rows={3}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15"
        />
      )}
    </label>
  );
}
