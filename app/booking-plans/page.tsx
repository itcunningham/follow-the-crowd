"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppNavigation from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import {
  PlannerWorkspacePageHeader,
  PLANNER_WORKSPACE_CONTENT_CLASS,
  PLANNER_WORKSPACE_SHELL_CLASS,
} from "@/app/components/planner/PlannerWorkspaceLayout";
import { PlannerFormCard, PlannerFormField, PlannerInlineError } from "@/app/components/planner/PlannerUi";
import {
  BookingPlanListSkeleton,
  SavedEventPlansSectionHeading,
} from "@/app/components/skeleton/Skeleton";
import { BookingDateField, BookingSetTimeRangeField } from "@/app/components/BookingDateTimeFields";
import { getEventDateValidationError } from "@/lib/bookingDateTime";
import { getEventNotesValidationError, MAX_EVENT_NOTES_LENGTH } from "@/lib/events/eventNotes";
import {
  createBookingPlan,
  listBookingPlans,
  updateBookingPlan,
  type BookingPlan,
  type BookingPlanInput,
} from "@/lib/bookingPlans";
import {
  canAccessBookingPlans,
  getCurrentUserProfile,
  getDefaultRouteForRole,
  type UserRole,
} from "@/lib/user/currentUser";
import { readCachedNavRole } from "@/lib/navigationRoleCache";
import { stashPendingBookingPlanId } from "@/lib/bookings/planDeepLink";

const emptyPlanForm: BookingPlanInput = {
  name: "",
  eventName: "",
  venue: "",
  eventDate: "",
  setTime: "",
  fee: "",
  notes: "",
};

function getPlanLoadErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const supabaseError = error as { message?: string; code?: string };

    if (supabaseError.code === "42P01" || supabaseError.code === "PGRST205") {
      return "Event plans table is not set up yet. Run scripts/setupBookingPlans.sql.";
    }

    if (supabaseError.message) {
      return supabaseError.message;
    }
  }

  return error instanceof Error ? error.message : "Failed to load event plans";
}

export default function BookingPlansPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);
  const [cachedRole] = useState<UserRole | null>(() => readCachedNavRole());
  const displayRole = role ?? cachedRole;
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [plans, setPlans] = useState<BookingPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [form, setForm] = useState<BookingPlanInput>(emptyPlanForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const planFormDateValidationError = useMemo(() => {
    if (!formOpen) {
      return null;
    }

    return getEventDateValidationError(form.eventDate, form.setTime);
  }, [formOpen, form.eventDate, form.setTime]);
  const planFormNotesValidationError = useMemo(() => {
    if (!formOpen) {
      return null;
    }

    return getEventNotesValidationError(form.notes);
  }, [formOpen, form.notes]);
  const planFormValidationError = planFormDateValidationError ?? planFormNotesValidationError;

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    setError(null);

    try {
      const rows = await listBookingPlans();
      setPlans(rows);
    } catch (loadError) {
      console.error("Failed to load booking plans:", loadError);
      setPlans([]);
      setError(getPlanLoadErrorMessage(loadError));
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    getCurrentUserProfile()
      .then((profile) => {
        const userRole = profile?.role ?? null;
        setRole(userRole);

        if (!canAccessBookingPlans(userRole)) {
          router.replace(getDefaultRouteForRole(userRole));
          return;
        }

        setLoadingAccess(false);
      })
      .catch((loadError) => {
        console.error("Failed to load booking plans access:", loadError);
        setLoadingAccess(false);
      });
  }, [router]);

  useEffect(() => {
    if (loadingAccess || !canAccessBookingPlans(role)) {
      return;
    }

    loadPlans();
  }, [loadingAccess, role, loadPlans]);

  function openCreateForm() {
    setFormOpen(true);
    setEditingPlanId(null);
    setForm(emptyPlanForm);
    setError(null);
    setSuccessMessage(null);
  }

  function openEditForm(plan: BookingPlan) {
    setFormOpen(true);
    setEditingPlanId(plan.id);
    setForm({
      name: plan.name,
      eventName: plan.event_name,
      venue: plan.venue,
      eventDate: plan.event_date,
      setTime: plan.set_time,
      fee: "",
      notes: plan.notes,
    });
    setError(null);
    setSuccessMessage(null);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setFormOpen(false);
    setEditingPlanId(null);
    setForm(emptyPlanForm);
    setError(null);
  }

  function updateField<Key extends keyof BookingPlanInput>(
    key: Key,
    value: BookingPlanInput[Key],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSavePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !form.name.trim() ||
      !form.eventName.trim() ||
      !form.venue.trim() ||
      !form.eventDate.trim() ||
      !form.setTime.trim()
    ) {
      setError("Please fill in all required plan fields.");
      return;
    }

    const dateValidationError = getEventDateValidationError(form.eventDate, form.setTime);

    if (dateValidationError) {
      setError(dateValidationError);
      return;
    }

    const notesValidationError = getEventNotesValidationError(form.notes);

    if (notesValidationError) {
      setError(notesValidationError);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (editingPlanId) {
        const updatedPlan = await updateBookingPlan(editingPlanId, form);
        setPlans((currentPlans) =>
          currentPlans.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan)),
        );
        setSuccessMessage("Event plan updated");
      } else {
        const createdPlan = await createBookingPlan(form);
        setPlans((currentPlans) => [createdPlan, ...currentPlans]);
        setSuccessMessage("Event plan created");
      }

      closeForm();
    } catch (saveError) {
      console.error("Failed to save booking plan:", saveError);
      setError(saveError instanceof Error ? saveError.message : "Failed to save event plan");
    } finally {
      setSaving(false);
    }
  }

  function handleUseForBooking(planId: string) {
    stashPendingBookingPlanId(planId);
    router.push(`/bookings?planId=${encodeURIComponent(planId)}`);
  }

  if (!loadingAccess && !canAccessBookingPlans(role)) {
    return null;
  }

  return (
    <OnboardingGuard>
      <div className={PLANNER_WORKSPACE_SHELL_CLASS}>
        <AppNavigation />

        <PlannerWorkspacePageHeader
          title="Event Plans"
          initialRole={displayRole}
          actions={
            !formOpen && (loadingAccess || loadingPlans || plans.length > 0) ? (
              <button
                type="button"
                onClick={openCreateForm}
                className="shrink-0 cursor-pointer ftc-btn-primary px-4 py-2.5 text-sm uppercase tracking-wide"
              >
                Create event plan
              </button>
            ) : null
          }
        />

        <div className={PLANNER_WORKSPACE_CONTENT_CLASS}>
          {successMessage ? (
            <p className="mb-4 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-3 text-sm text-ftc-text-secondary">
              {successMessage}
            </p>
          ) : null}

          {!loadingAccess && formOpen ? (
            <PlannerFormCard
              title={editingPlanId ? "Edit event plan" : "Create event plan"}
              onCancel={closeForm}
              cancelDisabled={saving}
            >
              <form onSubmit={handleSavePlan} className="space-y-4">
                <PlannerFormField
                  label="Plan name"
                  value={form.name}
                  onChange={(value) => updateField("name", value)}
                  placeholder="Plan name"
                  required
                />
                <PlannerFormField
                  label="Event name"
                  value={form.eventName}
                  onChange={(value) => updateField("eventName", value)}
                  placeholder="Event name"
                  required
                />
                <PlannerFormField
                  label="Venue"
                  value={form.venue}
                  onChange={(value) => updateField("venue", value)}
                  placeholder="Venue"
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
                  eventDate={form.eventDate}
                />
                <PlannerFormField
                  label="Notes"
                  value={form.notes}
                  onChange={(value) => updateField("notes", value)}
                  placeholder="Notes"
                  multiline
                  maxLength={MAX_EVENT_NOTES_LENGTH}
                />

                {error && error !== planFormValidationError ? (
                  <PlannerInlineError message={error} />
                ) : null}

                <button
                  type="submit"
                  disabled={saving || Boolean(planFormValidationError)}
                  aria-disabled={saving || Boolean(planFormValidationError)}
                  title={planFormValidationError ? planFormValidationError : undefined}
                  className="ftc-btn-primary px-5 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingPlanId ? "Save changes" : "Save event plan"}
                </button>
              </form>
            </PlannerFormCard>
          ) : null}

          {!formOpen ? (
            <>
              <SavedEventPlansSectionHeading />
              {loadingAccess || loadingPlans ? (
                <BookingPlanListSkeleton />
              ) : error && plans.length === 0 ? (
                <PlannerInlineError message={error} />
              ) : plans.length === 0 ? (
                <div className="ftc-card-empty px-6 py-12 text-center">
                  <p className="text-base font-medium text-ftc-text-secondary">No saved event plans yet</p>
                  <p className="mt-2 text-sm text-ftc-text-muted">
                    Create an event plan to reuse details when booking DJs
                  </p>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="ftc-btn-primary mt-6 px-5 py-3 text-sm uppercase tracking-wide"
                  >
                    Create event plan
                  </button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {plans.map((plan) => (
                    <li key={plan.id} className="ftc-card ftc-card-hoverable overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-stretch">
                        <button
                          type="button"
                          onClick={() => openEditForm(plan)}
                          className="min-w-0 flex-1 cursor-pointer p-4 text-left transition active:bg-ftc-bg-elevated/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ftc-primary/35 sm:p-5"
                        >
                          <h3 className="text-lg font-semibold text-ftc-text">{plan.name}</h3>
                          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                            <PlanDetail label="Event" value={plan.event_name} />
                            <PlanDetail label="Venue" value={plan.venue} />
                          </dl>
                          {plan.notes?.trim() ? (
                            <p className="mt-3 text-sm leading-relaxed text-ftc-text-secondary">
                              {plan.notes}
                            </p>
                          ) : null}
                        </button>

                        <div className="shrink-0 border-t border-ftc-border-subtle p-4 sm:flex sm:items-start sm:border-l sm:border-t-0 sm:p-5">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleUseForBooking(plan.id);
                            }}
                            className="ftc-btn-primary w-full px-4 py-2.5 text-xs uppercase tracking-wide sm:w-auto sm:px-3 sm:py-1.5"
                          >
                            Use for booking
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </div>
      </div>
    </OnboardingGuard>
  );
}

function PlanDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">{label}</dt>
      <dd className="mt-0.5 text-ftc-text">{value}</dd>
    </div>
  );
}
