"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import PlannerEventsSubNav from "@/app/components/PlannerEventsSubNav";
import { BookingDateField, BookingSetTimeRangeField } from "@/app/components/BookingDateTimeFields";
import { BookingRateField } from "@/app/components/BookingRateField";
import { listBookingPlans, type BookingPlan } from "@/lib/bookingPlans";
import { formatRateDisplay } from "@/lib/bookingRate";
import {
  attachLineupStats,
  createEvent,
  eventInputFromBookingPlan,
  formatEventStatusLabel,
  getEventsLoadErrorMessage,
  listDjInvitedEvents,
  listOwnedEvents,
  type EventInput,
  type EventStatus,
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
  status: "draft",
  bookingPlanId: null,
};

const EVENT_STATUSES: { value: EventStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

type CreateStep = "source" | "pick-plan" | "form";

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

  const isPlanner = canManageEvents(role);

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
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#070708] text-sm text-zinc-500">
        Loading...
      </div>
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
            <div>
              <h1 className="text-xl font-semibold text-zinc-50">Events</h1>
              <p className="mt-1 text-sm text-zinc-500">
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
                className="shrink-0 rounded-xl border border-blue-500/45 bg-blue-600/20 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.22)] transition hover:border-blue-400/60 hover:bg-blue-600/30"
              >
                Create event
              </button>
            ) : null}
          </div>
          {isPlanner ? <PlannerEventsSubNav /> : null}
        </header>

        <div className="px-4 py-4 sm:px-6">
          {createOpen && isPlanner ? (
            <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-zinc-50">Create event</h2>
                <button
                  type="button"
                  onClick={closeCreateFlow}
                  disabled={saving}
                  className="text-xs font-semibold uppercase tracking-wide text-zinc-500 transition hover:text-zinc-300 disabled:opacity-50"
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
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 py-4 text-left transition hover:border-blue-500/40 hover:bg-blue-600/10"
                  >
                    <p className="text-base font-semibold text-zinc-50">Create from a saved booking plan</p>
                    <p className="mt-2 text-sm text-zinc-400">
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
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 py-4 text-left transition hover:border-blue-500/40 hover:bg-blue-600/10"
                  >
                    <p className="text-base font-semibold text-zinc-50">Create custom event</p>
                    <p className="mt-2 text-sm text-zinc-400">Enter fresh event details from scratch.</p>
                  </button>
                  {error ? <p className="text-sm text-red-400">{error}</p> : null}
                </div>
              ) : null}

              {createStep === "pick-plan" ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setCreateStep("source")}
                    className="text-xs font-semibold uppercase tracking-wide text-zinc-500 transition hover:text-zinc-300"
                  >
                    ← Back
                  </button>

                  {loadingPlans ? (
                    <p className="text-sm text-zinc-500">Loading saved plans...</p>
                  ) : bookingPlans.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-6 text-center">
                      <p className="text-sm text-zinc-400">No saved booking plans yet.</p>
                      <Link
                        href="/booking-plans"
                        className="mt-3 inline-block text-sm font-semibold text-blue-300 transition hover:text-blue-200"
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
                                ? "border-blue-500/50 bg-blue-600/10"
                                : "border-zinc-800 bg-zinc-950/40 hover:border-blue-500/30 hover:bg-blue-600/10"
                            }`}
                          >
                            <p className="font-semibold text-zinc-50">{plan.name}</p>
                            <p className="mt-1 text-sm text-zinc-400">
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
                    className="text-xs font-semibold uppercase tracking-wide text-zinc-500 transition hover:text-zinc-300"
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
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                      Event status
                    </span>
                    <select
                      value={form.status}
                      onChange={(event) => updateField("status", event.target.value as EventStatus)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15"
                    >
                      {EVENT_STATUSES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {error ? <p className="text-sm text-red-400">{error}</p> : null}

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl border border-blue-500/45 bg-blue-600/20 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.22)] transition hover:border-blue-400/60 hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save event"}
                  </button>
                </form>
              ) : null}
            </section>
          ) : null}

          {loadingEvents ? (
            <p className="text-sm text-zinc-500">Loading events...</p>
          ) : error && events.length === 0 ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center">
              <p className="text-base font-medium text-zinc-300">
                {isPlanner ? "No events yet. Create your first event." : "No event invitations yet."}
              </p>
              {isPlanner && !createOpen ? (
                <button
                  type="button"
                  onClick={() => {
                  void openCreateFlow();
                }}
                  className="mt-6 rounded-xl border border-blue-500/45 bg-blue-600/20 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.22)] transition hover:border-blue-400/60 hover:bg-blue-600/30"
                >
                  Create event
                </button>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-3">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-zinc-50">{event.name}</h3>
                        <EventStatusBadge status={event.status} />
                      </div>
                      <p className="mt-2 text-sm text-zinc-400">
                        {event.venue} · {event.event_date}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">{event.set_time}</p>
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
                      className="shrink-0 rounded-lg border border-blue-500/35 bg-blue-600/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-300 transition hover:border-blue-400/50 hover:bg-blue-600/20"
                    >
                      Open event
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </OnboardingGuard>
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
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15"
        />
      )}
    </label>
  );
}
