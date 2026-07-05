"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import EventDateStatusBadge from "@/app/components/EventDateStatusBadge";
import PlannerEventsSubNav from "@/app/components/PlannerEventsSubNav";
import { BookingDateField, BookingSetTimeRangeField } from "@/app/components/BookingDateTimeFields";
import { BookingRateField } from "@/app/components/BookingRateField";
import { listBookingPlans, type BookingPlan } from "@/lib/bookingPlans";
import { formatRateDisplay } from "@/lib/bookingRate";
import {
  attachLineupStats,
  createEvent,
  eventInputFromBookingPlan,
  getEventsLoadErrorMessage,
  isEventCancelled,
  listDjInvitedEvents,
  listOwnedEvents,
  type EventInput,
  type EventWithLineupStats,
} from "@/lib/events";
import {
  canManageEvents,
  getCurrentUserProfile,
  type UserRole,
} from "@/lib/user/currentUser";

const emptyEventForm: EventInput = {
  name: "",
  venue: "",
  eventDate: "",
  setTime: "",
  rate: "",
  notes: "",
  bookingPlanId: null,
};

type CreateStep = "source" | "pick-plan" | "form";

type EventsListView = "active" | "cancelled";

export default function EventsPage() {
  const router = useRouter();
  const handledCreateParamsRef = useRef<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [events, setEvents] = useState<EventWithLineupStats[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<CreateStep>("source");
  const [bookingPlans, setBookingPlans] = useState<BookingPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [form, setForm] = useState<EventInput>(emptyEventForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventDateOverride, setEventDateOverride] = useState<string | null>(null);
  const [listView, setListView] = useState<EventsListView>("active");

  const isPlanner = canManageEvents(role);

  const filteredEvents = useMemo(() => {
    if (listView === "cancelled") {
      return events.filter((event) => isEventCancelled(event));
    }

    return events.filter((event) => !isEventCancelled(event));
  }, [events, listView]);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    setError(null);

    try {
      const rows = isPlanner ? await listOwnedEvents() : await listDjInvitedEvents();
      const withStats = await attachLineupStats(rows);
      setEvents(withStats);
    } catch (loadError) {
      console.error("Failed to load events:", loadError);
      setEvents([]);
      setError(getEventsLoadErrorMessage(loadError));
    } finally {
      setLoadingEvents(false);
    }
  }, [isPlanner]);

  useEffect(() => {
    getCurrentUserProfile()
      .then((profile) => {
        setRole(profile?.role ?? null);
        setLoadingAccess(false);
      })
      .catch((loadError) => {
        console.error("Failed to load events access:", loadError);
        setLoadingAccess(false);
      });
  }, []);

  useEffect(() => {
    if (loadingAccess) {
      return;
    }

    loadEvents();
  }, [loadingAccess, loadEvents]);

  useEffect(() => {
    if (loadingAccess || !isPlanner) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const createParam = params.get("create");
    const eventDateParam = params.get("eventDate") ?? "";

    if (!createParam) {
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
  }, [loadingAccess, isPlanner, router]);

  async function openCreateFlow(options?: { eventDate?: string; initialStep?: CreateStep }) {
    setCreateOpen(true);
    setCreateStep(options?.initialStep ?? "source");
    setForm({
      ...emptyEventForm,
      eventDate: options?.eventDate ?? "",
    });
    setEventDateOverride(options?.eventDate ?? null);
    setSelectedPlanId(null);
    setError(null);
    setLoadingPlans(true);

    try {
      const plans = await listBookingPlans();
      setBookingPlans(plans);
    } catch (loadError) {
      console.error("Failed to load booking plans for event create:", loadError);
      setError(loadError instanceof Error ? loadError.message : "Failed to load booking plans");
    } finally {
      setLoadingPlans(false);
    }
  }

  function closeCreateFlow() {
    if (saving) {
      return;
    }

    setCreateOpen(false);
    setCreateStep("source");
    setForm(emptyEventForm);
    setSelectedPlanId(null);
    setEventDateOverride(null);
    setError(null);
  }

  function handleSelectPlan(plan: BookingPlan) {
    const input = eventInputFromBookingPlan(plan);
    setSelectedPlanId(plan.id);
    setForm({
      ...input,
      eventDate: eventDateOverride ?? input.eventDate,
    });
    setCreateStep("form");
    setError(null);
  }

  function updateField<Key extends keyof EventInput>(key: Key, value: EventInput[Key]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !form.name.trim() ||
      !form.venue.trim() ||
      !form.eventDate.trim() ||
      !form.setTime.trim()
    ) {
      setError("Please fill in event name, venue, date, and set time.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const created = await createEvent(form);
      router.push(`/events/${created.id}`);
    } catch (saveError) {
      console.error("Failed to create event:", saveError);
      setError(saveError instanceof Error ? saveError.message : "Failed to create event");
    } finally {
      setSaving(false);
    }
  }

  if (loadingAccess) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-ftc-bg text-sm text-ftc-text-muted">
        Loading...
      </div>
    );
  }

  return (
    <OnboardingGuard>
      <div
        className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
      >
        <AppNavigation />

        <header className="border-b border-ftc-border px-4 py-4 sm:px-6 md:pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-ftc-text">Events</h1>
              <p className="mt-1 text-sm text-ftc-text-muted">
                {isPlanner
                  ? "Manage your upcoming events, lineup and bookings."
                  : "Events you have been invited to book."}
              </p>
            </div>
            {isPlanner && !createOpen ? (
              <button
                type="button"
                onClick={() => {
                  void openCreateFlow();
                }}
                className="shrink-0 ftc-btn-primary px-4 py-2.5 text-sm uppercase tracking-wide"
              >
                Create event
              </button>
            ) : null}
          </div>
          {isPlanner ? <PlannerEventsSubNav /> : null}
        </header>

        <div className="px-4 py-4 sm:px-6">
          {createOpen && isPlanner ? (
            <section className="mb-6 ftc-card p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-ftc-text">Create event</h2>
                <button
                  type="button"
                  onClick={closeCreateFlow}
                  disabled={saving}
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
                    className="w-full rounded-2xl border border-ftc-border bg-ftc-bg-elevated/40 px-4 py-4 text-left transition hover:border-ftc-primary/35 hover:bg-ftc-primary/10"
                  >
                    <p className="text-base font-semibold text-ftc-text">Create from a saved booking plan</p>
                    <p className="mt-2 text-sm text-ftc-text-secondary">
                      Prefill event details from a plan, then edit before saving.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm({
                        ...emptyEventForm,
                        eventDate: eventDateOverride ?? "",
                      });
                      setSelectedPlanId(null);
                      setCreateStep("form");
                      setError(null);
                    }}
                    className="w-full rounded-2xl border border-ftc-border bg-ftc-bg-elevated/40 px-4 py-4 text-left transition hover:border-ftc-primary/35 hover:bg-ftc-primary/10"
                  >
                    <p className="text-base font-semibold text-ftc-text">Create custom event</p>
                    <p className="mt-2 text-sm text-ftc-text-secondary">Enter fresh event details from scratch.</p>
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
                            onClick={() => handleSelectPlan(plan)}
                            className={`w-full rounded-xl border px-4 py-4 text-left transition ${
                              selectedPlanId === plan.id
                                ? "border-ftc-primary/45 bg-ftc-primary/10"
                                : "border-ftc-border bg-ftc-bg-elevated/40 hover:border-ftc-primary/25 hover:bg-ftc-primary/10"
                            }`}
                          >
                            <p className="font-semibold text-ftc-text">{plan.name}</p>
                            <p className="mt-1 text-sm text-ftc-text-secondary">
                              {plan.event_name} · {plan.venue} · {plan.event_date}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              {createStep === "form" ? (
                <form onSubmit={handleSaveEvent} className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setCreateStep(selectedPlanId ? "pick-plan" : "source")}
                    className="text-xs font-semibold uppercase tracking-wide text-ftc-text-muted transition hover:text-ftc-text-secondary"
                  >
                    ← Back
                  </button>

                  <EventField
                    label="Event name"
                    value={form.name}
                    onChange={(value) => updateField("name", value)}
                    placeholder="Warehouse Sessions"
                    required
                  />
                  <EventField
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
                    value={form.rate}
                    onChange={(value) => updateField("rate", value)}
                  />
                  <EventField
                    label="Notes"
                    value={form.notes}
                    onChange={(value) => updateField("notes", value)}
                    placeholder="Genre, vibe, travel, equipment..."
                    multiline
                  />

                  {error ? <p className="text-sm text-red-400">{error}</p> : null}

                  <button
                    type="submit"
                    disabled={saving}
                    className="ftc-btn-primary px-5 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save event"}
                  </button>
                </form>
              ) : null}
            </section>
          ) : null}

          {loadingEvents ? (
            <p className="text-sm text-ftc-text-muted">Loading events...</p>
          ) : error && events.length === 0 ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : filteredEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ftc-border bg-ftc-surface/30 px-6 py-12 text-center">
              <p className="text-base font-medium text-ftc-text-secondary">
                {events.length === 0
                  ? isPlanner
                    ? "No events yet. Create your first event."
                    : "No event invitations yet."
                  : listView === "cancelled"
                    ? "No cancelled events."
                    : "No active events."}
              </p>
              {isPlanner && events.length === 0 && !createOpen ? (
                <button
                  type="button"
                  onClick={() => {
                  void openCreateFlow();
                }}
                  className="mt-6 ftc-btn-primary px-5 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Create event
                </button>
              ) : null}
            </div>
          ) : (
            <>
              {isPlanner ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  {(
                    [
                      { value: "active", label: "Active" },
                      { value: "cancelled", label: "Cancelled" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setListView(option.value)}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition ${
                        listView === option.value
                          ? "border-ftc-primary/45 bg-ftc-primary/10 text-ftc-primary"
                          : "border-ftc-border-strong bg-ftc-surface/80 text-ftc-text-secondary hover:border-ftc-primary/25 hover:text-ftc-primary"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            <ul className="space-y-3">
              {filteredEvents.map((event) => {
                const cancelled = isEventCancelled(event);

                return (
                <li
                  key={event.id}
                  className={`rounded-2xl border p-4 sm:p-5 ${
                    cancelled
                      ? "border-ftc-border/60 bg-ftc-surface/40 opacity-80"
                      : "border-ftc-border bg-ftc-surface/80"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={`text-lg font-semibold ${
                            cancelled ? "text-ftc-text-secondary" : "text-ftc-text"
                          }`}
                        >
                          {event.name}
                        </h3>
                        <EventDateStatusBadge eventDate={event.event_date} status={event.status} />
                      </div>
                      <p className={`mt-2 text-sm ${cancelled ? "text-ftc-text-muted" : "text-ftc-text-secondary"}`}>
                        {event.venue} · {event.event_date}
                      </p>
                      <p className={`mt-1 text-sm ${cancelled ? "text-ftc-text-muted" : "text-ftc-text-muted"}`}>
                        {event.set_time}
                      </p>
                      {isPlanner ? (
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide">
                          <LineupStat label="Invited" value={event.lineupStats.total} />
                          <LineupStat label="Pending" value={event.lineupStats.pending} />
                          <LineupStat label="Accepted" value={event.lineupStats.accepted} />
                          <LineupStat label="Declined" value={event.lineupStats.declined} />
                        </div>
                      ) : null}
                    </div>

                    <Link
                      href={`/events/${event.id}`}
                      className="shrink-0 ftc-btn-primary px-3 py-1.5 text-xs uppercase tracking-wide"
                    >
                      Open event
                    </Link>
                  </div>
                </li>
                );
              })}
            </ul>
            </>
          )}
        </div>
      </div>
    </OnboardingGuard>
  );
}

function LineupStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border border-ftc-border-strong bg-ftc-surface/80 px-2.5 py-1 text-ftc-text-secondary">
      {label}: <span className="text-ftc-text">{value}</span>
    </span>
  );
}

function EventField({
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
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
        {label}
      </span>
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
