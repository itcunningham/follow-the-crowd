"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import EventDateStatusBadge from "@/app/components/EventDateStatusBadge";
import PlannerEventsSubNav from "@/app/components/PlannerEventsSubNav";
import {
  PlannerBackLink,
  PlannerEmptyState,
  PlannerFilterPills,
  PlannerFormCard,
  PlannerFormField,
  PlannerInlineError,
  PlannerLinkAction,
  PlannerOptionCard,
  PlannerStatChip,
} from "@/app/components/planner/PlannerUi";
import { BookingDateField, BookingSetTimeRangeField } from "@/app/components/BookingDateTimeFields";
import { BookingRateField } from "@/app/components/BookingRateField";
import EventCoverImageField, {
  emptyEventCoverImageFieldState,
  type EventCoverImageFieldState,
} from "@/app/components/events/EventCoverImageField";
import EventFallbackColourField from "@/app/components/events/EventFallbackColourField";
import { EventCoverImageListThumb } from "@/app/components/events/EventCoverImageDisplay";
import type { EventSelectableFallbackColourKey } from "@/lib/events/eventFallbackColour";
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
  updateEventCoverImageUrl,
  type EventInput,
  type EventWithLineupStats,
} from "@/lib/events";
import {
  getEventCoverUploadErrorMessage,
  uploadEventCoverImage,
} from "@/lib/events/eventCoverImage";
import {
  buildEventDetailHref,
  buildEventsListHref,
  eventsListTabFromView,
  eventsListViewFromTab,
  parseEventsListTab,
  type EventsListView,
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

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-ftc-bg text-sm text-ftc-text-muted">
          Loading...
        </div>
      }
    >
      <EventsPageContent />
    </Suspense>
  );
}

function EventsPageContent() {
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventDateOverride, setEventDateOverride] = useState<string | null>(null);
  const urlTab = parseEventsListTab(searchParams.get("tab"));
  const [listView, setListView] = useState<EventsListView>(() => eventsListViewFromTab(urlTab));

  const isPlanner = canManageEvents(role);
  const activeListTab = eventsListTabFromView(listView);

  useEffect(() => {
    const tab = parseEventsListTab(searchParams.get("tab"));
    console.log("[events nav] current tab", tab);
    setListView(eventsListViewFromTab(tab));
  }, [searchParams]);

  function handleListViewChange(nextView: EventsListView) {
    if (nextView === listView) {
      return;
    }

    const nextTab = eventsListTabFromView(nextView);
    console.log("[events nav] current tab", nextTab);
    setListView(nextView);
    router.push(buildEventsListHref(nextTab), { scroll: false });
  }

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
                  <PlannerFormField
                    label="Notes"
                    value={form.notes}
                    onChange={(value) => updateField("notes", value)}
                    placeholder="Genre, vibe, travel, equipment..."
                    multiline
                  />

                  {error ? <PlannerInlineError message={error} /> : null}

                  <button
                    type="submit"
                    disabled={saving}
                    className="ftc-btn-primary px-5 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save event"}
                  </button>
                </form>
              ) : null}
            </PlannerFormCard>
          ) : null}

          {loadingEvents ? (
            <p className="text-sm text-ftc-text-muted">Loading events...</p>
          ) : error && events.length === 0 ? (
            <PlannerInlineError message={error} />
          ) : events.length === 0 ? (
            <PlannerEmptyState
              title={
                isPlanner
                  ? "No events yet. Create your first event."
                  : "No event invitations yet."
              }
              action={
                isPlanner && !createOpen ? (
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
          ) : (
            <>
              <div className="mb-4">
                <PlannerFilterPills
                  options={
                    [
                      { value: "active", label: isPlanner ? "Active" : "Upcoming" },
                      { value: "cancelled", label: "History" },
                    ] as const
                  }
                  value={listView}
                  onChange={handleListViewChange}
                />
              </div>
              {filteredEvents.length === 0 ? (
                <PlannerEmptyState
                  title={
                    listView === "cancelled"
                      ? "No cancelled events."
                      : "No active events."
                  }
                />
              ) : (
            <ul className="space-y-3">
              {filteredEvents.map((event) => {
                const cancelled = isEventCancelled(event);
                const eventHref = buildEventDetailHref(event.id, activeListTab);

                return (
                <li key={event.id}>
                  <Link
                    href={eventHref}
                    onClick={() => {
                      console.log("[events nav] event href", eventHref);
                    }}
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
