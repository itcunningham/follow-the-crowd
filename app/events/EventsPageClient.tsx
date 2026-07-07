"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import EventDateStatusBadge from "@/app/components/EventDateStatusBadge";
import PlannerEventsSubNav from "@/app/components/PlannerEventsSubNav";
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
import { getEventDateValidationError, getTodayDateKey, sanitizePrefilledEventDateKey } from "@/lib/bookingDateTime";
import EventCoverImageField, {
  emptyEventCoverImageFieldState,
  type EventCoverImageFieldState,
} from "@/app/components/events/EventCoverImageField";
import EventFallbackColourField from "@/app/components/events/EventFallbackColourField";
import { EventCoverImageListThumb } from "@/app/components/events/EventCoverImageDisplay";
import { EventListSkeleton, EventsPageLoadingShell } from "@/app/components/skeleton/Skeleton";
import type { EventSelectableFallbackColourKey } from "@/lib/events/eventFallbackColour";
import { listBookingPlans, type BookingPlan } from "@/lib/bookingPlans";
import {
  attachLineupStats,
  createEvent,
  eventInputFromBookingPlan,
  getEventsLoadErrorMessage,
  isEventCancelled,
  listDjInvitedEvents,
  listOwnedEvents,
  updateEventCoverImageUrl,
  type EventInput,
  type EventWithLineupStats,
} from "@/lib/events";
import {
  uploadEventCoverImage,
} from "@/lib/events/eventCoverImage";
import {
  buildEventDetailHref,
  resolveEventsListTabParam,
} from "@/lib/events/eventsListNavigation";
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
  fallbackColour: null,
};

type CreateStep = "source" | "pick-plan" | "form";

type EventsPageClientProps = {
  initialTab: string | null;
};

const EVENTS_LIST_CACHE_KEY = "ftc-events-list-v1";

function getEventsCacheKey(isPlanner: boolean): string {
  return `${EVENTS_LIST_CACHE_KEY}:${isPlanner ? "planner" : "dj"}`;
}

function readEventsListCache(isPlanner: boolean): EventWithLineupStats[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(getEventsCacheKey(isPlanner));

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;

    return Array.isArray(parsed) ? (parsed as EventWithLineupStats[]) : [];
  } catch (cacheError) {
    console.error("[events] Failed to read events cache:", cacheError);
    return [];
  }
}

function writeEventsListCache(isPlanner: boolean, events: EventWithLineupStats[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(getEventsCacheKey(isPlanner), JSON.stringify(events));
  } catch (cacheError) {
    console.error("[events] Failed to write events cache:", cacheError);
  }
}

export default function EventsPageClient({ initialTab }: EventsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [coverField, setCoverField] = useState<EventCoverImageFieldState>(
    emptyEventCoverImageFieldState,
  );
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [fallbackColour, setFallbackColour] = useState<EventSelectableFallbackColourKey | null>(
    null,
  );
  const createFlyerActive = Boolean(
    coverField.file || coverPreviewUrl?.startsWith("blob:"),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventDateOverride, setEventDateOverride] = useState<string | null>(null);
  const [locationRevision, setLocationRevision] = useState(0);

  useEffect(() => {
    function handlePopState() {
      setLocationRevision((current) => current + 1);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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
  const upcomingEvents = useMemo(
    () => events.filter((event) => !isEventCancelled(event)),
    [events],
  );
  const historyEvents = useMemo(
    () => events.filter((event) => isEventCancelled(event)),
    [events],
  );
  const filteredEvents = isHistoryTab ? historyEvents : upcomingEvents;
  const createFormDateValidationError = useMemo(() => {
    if (!createOpen || createStep !== "form") {
      return null;
    }

    return getEventDateValidationError(form.eventDate, form.setTime);
  }, [createOpen, createStep, form.eventDate, form.setTime]);

  const isPlanner = canManageEvents(role);

  const loadEvents = useCallback(async () => {
    const cachedEvents = readEventsListCache(isPlanner);

    if (cachedEvents.length > 0) {
      setEvents(cachedEvents);
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
    const prefilledEventDate = sanitizePrefilledEventDateKey(options?.eventDate ?? "");
    setCreateOpen(true);
    setCreateStep(options?.initialStep ?? "source");
    setForm({
      ...emptyEventForm,
      eventDate: prefilledEventDate,
    });
    setEventDateOverride(prefilledEventDate || null);
    setSelectedPlanId(null);
    setError(null);
    setCoverField(emptyEventCoverImageFieldState);
    setCoverPreviewUrl(null);
    setCoverError(null);
    setFallbackColour(null);
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
    setCoverField(emptyEventCoverImageFieldState);
    if (coverPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreviewUrl);
    }
    setCoverPreviewUrl(null);
    setCoverError(null);
    setFallbackColour(null);
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

    const dateValidationError = getEventDateValidationError(form.eventDate, form.setTime);

    if (dateValidationError) {
      setError(dateValidationError);
      return;
    }

    setSaving(true);
    setError(null);

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
          router.push(`/events/${created.id}?coverUpload=failed`);
          return;
        }
      }

      router.push(`/events/${created.id}`);
    } catch (saveError) {
      console.error("Failed to create event:", saveError);
      setError(getEventsLoadErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  if (loadingAccess) {
    return (
      <OnboardingGuard>
        <EventsPageLoadingShell showPlannerStats={canManageEvents(role)} />
      </OnboardingGuard>
    );
  }

  return (
    <OnboardingGuard>
      <div
        className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
      >
        <AppNavigation />

        <header className="ftc-page-header px-4 py-4 sm:px-6 md:pt-4">
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
            <PlannerFormCard title="Create event" onCancel={closeCreateFlow} cancelDisabled={saving}>
              {createStep === "source" ? (
                <div className="space-y-3">
                  <PlannerOptionCard
                    title="Create from a saved booking plan"
                    description="Prefill event details from a plan, then edit before saving."
                    onClick={() => {
                      setError(null);
                      setCreateStep("pick-plan");
                    }}
                  />
                  <PlannerOptionCard
                    title="Create custom event"
                    description="Enter fresh event details from scratch."
                    onClick={() => {
                      setForm({
                        ...emptyEventForm,
                        eventDate: eventDateOverride ?? "",
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
                  <PlannerBackLink onClick={() => setCreateStep("source")} />

                  {loadingPlans ? (
                    <p className="text-sm text-ftc-text-muted">Loading saved plans...</p>
                  ) : bookingPlans.length === 0 ? (
                    <div className="ftc-card-empty px-4 py-8 text-center">
                      <p className="text-sm text-ftc-text-secondary">No saved booking plans yet.</p>
                      <PlannerLinkAction href="/booking-plans" className="mt-3">
                        Create a booking plan
                      </PlannerLinkAction>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {bookingPlans.map((plan) => (
                        <li key={plan.id}>
                          <PlannerOptionCard
                            title={plan.name}
                            description={`${plan.event_name} · ${plan.venue} · ${plan.event_date}`}
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
                  <PlannerBackLink
                    onClick={() => setCreateStep(selectedPlanId ? "pick-plan" : "source")}
                  />

                  <PlannerFormField
                    label="Event name"
                    value={form.name}
                    onChange={(value) => updateField("name", value)}
                    placeholder="Warehouse Sessions"
                    required
                  />
                  <PlannerFormField
                    label="Venue"
                    value={form.venue}
                    onChange={(value) => updateField("venue", value)}
                    placeholder="The Warehouse, Melbourne"
                    required
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
                  />
                  <BookingSetTimeRangeField
                    value={form.setTime}
                    onChange={(value) => updateField("setTime", value)}
                    required
                  />
                  <PlannerFormField
                    label="Notes"
                    value={form.notes}
                    onChange={(value) => updateField("notes", value)}
                    placeholder="Genre, vibe, travel, equipment..."
                    multiline
                  />

                  {createFormDateValidationError ? (
                    <PlannerInlineError message={createFormDateValidationError} />
                  ) : null}

                  {error && error !== createFormDateValidationError ? (
                    <PlannerInlineError message={error} />
                  ) : null}

                  <button
                    type="submit"
                    disabled={saving || Boolean(createFormDateValidationError)}
                    aria-disabled={saving || Boolean(createFormDateValidationError)}
                    title={
                      createFormDateValidationError
                        ? createFormDateValidationError
                        : undefined
                    }
                    className="ftc-btn-primary px-5 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save event"}
                  </button>
                </form>
              ) : null}
            </PlannerFormCard>
          ) : null}

          {loadingEvents ? (
            <EventListSkeleton showPlannerStats={isPlanner} />
          ) : error && events.length === 0 ? (
            <PlannerInlineError message={error} />
          ) : (
            <>
              {!createOpen ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  <Link
                    href="/events"
                    className={`ftc-filter-pill ${!isHistoryTab ? "ftc-filter-pill-active" : ""}`}
                    onClick={(event) => {
                      if (!isHistoryTab) {
                        event.preventDefault();
                        return;
                      }

                      event.preventDefault();
                      router.push("/events");
                    }}
                  >
                    {isPlanner ? "Active" : "Upcoming"}
                  </Link>
                  <Link
                    href="/events?tab=history"
                    className={`ftc-filter-pill ${isHistoryTab ? "ftc-filter-pill-active" : ""}`}
                    onClick={(event) => {
                      if (isHistoryTab) {
                        event.preventDefault();
                        return;
                      }

                      event.preventDefault();
                      router.push("/events?tab=history");
                    }}
                  >
                    History
                  </Link>
                </div>
              ) : null}

              {events.length === 0 ? (
                <PlannerEmptyState
                  title={
                    isHistoryTab
                      ? "No cancelled events."
                      : isPlanner
                        ? "No events yet. Create your first event."
                        : "No event invitations yet."
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
              ) : filteredEvents.length === 0 ? (
                <PlannerEmptyState
                  title={
                    isHistoryTab ? "No cancelled events." : "No active events."
                  }
                />
              ) : (
            <ul className="space-y-3">
              {filteredEvents.map((event) => {
                const cancelled = isEventCancelled(event);
                const eventHref = buildEventDetailHref(event.id, listTab);

                return (
                <li key={event.id}>
                  <Link
                    href={eventHref}
                    className={`ftc-card block p-4 transition hover:border-ftc-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ftc-primary/35 sm:p-5 ${
                      cancelled ? "ftc-event-card-cancelled" : ""
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <EventCoverImageListThumb
                        eventName={event.name}
                        coverImageUrl={event.cover_image_url}
                        fallbackColour={event.fallback_colour}
                      />
                      <div className="min-w-0 flex-1">
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
                          <div className="mt-3 flex flex-wrap gap-2">
                            <PlannerStatChip label="Invited" value={event.lineupStats.total} />
                            <PlannerStatChip label="Pending" value={event.lineupStats.pending} />
                            <PlannerStatChip label="Accepted" value={event.lineupStats.accepted} />
                            <PlannerStatChip label="Declined" value={event.lineupStats.declined} />
                          </div>
                        ) : null}
                      </div>
                      <span
                        aria-hidden="true"
                        className="mt-1 shrink-0 text-ftc-text-muted"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </span>
                    </div>
                  </Link>
                </li>
                );
              })}
            </ul>
              )}
            </>
          )}
        </div>
      </div>
    </OnboardingGuard>
  );
}
