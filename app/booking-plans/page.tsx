"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import AppNavigation from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import {
  PlannerWorkspacePageHeader,
  PLANNER_WORKSPACE_CONTENT_CLASS,
  PLANNER_WORKSPACE_SECONDARY_TABS_ROW_CLASS,
  PLANNER_WORKSPACE_SHELL_CLASS,
} from "@/app/components/planner/PlannerWorkspaceLayout";
import { PlannerFormCard, PlannerFormField, PlannerInlineError } from "@/app/components/planner/PlannerUi";
import {
  BookingPlanListSkeleton,
  SavedEventPlansSectionHeading,
} from "@/app/components/skeleton/Skeleton";
import { BookingDateField, BookingSetTimeRangeField } from "@/app/components/BookingDateTimeFields";
import {
  HistoryManageButton,
  HistorySelectionCheckbox,
  HistorySelectionToolbar,
  useHistoryBulkManage,
} from "@/app/components/history/HistoryBulkManage";
import { getEventDateValidationError } from "@/lib/bookingDateTime";
import { getEventNotesValidationError, MAX_EVENT_NOTES_LENGTH } from "@/lib/events/eventNotes";
import {
  createBookingPlan,
  deleteBookingPlans,
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

function EventPlanDeleteConfirmDialog({
  open,
  count,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  count: number;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !mounted) {
    return null;
  }

  const title = count === 1 ? "Delete Event Plan?" : "Delete Event Plans?";

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black p-0 sm:items-center sm:p-4"
      onClick={() => {
        if (!loading) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-plan-delete-title"
        className="isolate max-h-[90dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl border border-ftc-border-subtle bg-ftc-surface sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-ftc-border-subtle px-5 py-4">
          <h2 id="event-plan-delete-title" className="text-base font-semibold text-ftc-text">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ftc-text-secondary">
            These Event Plans will be permanently deleted.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ftc-text-secondary">
            Existing events, bookings, booking requests and messages created from these plans will
            NOT be affected.
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-2 border-t border-ftc-border-subtle bg-ftc-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={loading ? undefined : onCancel}
            aria-disabled={loading}
            tabIndex={loading ? -1 : 0}
            className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-ftc-text-secondary disabled:cursor-not-allowed sm:w-auto"
          >
            Cancel
          </button>
          {loading ? (
            <button
              type="button"
              aria-busy="true"
              tabIndex={-1}
              className="inline-flex min-h-[2.75rem] w-full cursor-not-allowed items-center justify-center rounded-xl border-0 bg-[var(--ftc-color-danger)] px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-ftc-bg sm:w-auto"
            >
              Deleting...
            </button>
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl border-0 bg-[var(--ftc-color-danger)] px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-ftc-bg transition hover:opacity-90 sm:w-auto"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
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

  const planBulkManage = useHistoryBulkManage(plans);

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

  const visiblePlans = useMemo(() => {
    if (planBulkManage.removingIds.size === 0) {
      return plans;
    }

    return plans.filter((plan) => !planBulkManage.removingIds.has(plan.id));
  }, [plans, planBulkManage.removingIds]);

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
    planBulkManage.cancelSelectionMode();
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

  async function handleDeletePlans(ids: string[]) {
    await deleteBookingPlans(ids);
    setPlans((currentPlans) => currentPlans.filter((plan) => !ids.includes(plan.id)));
    setSuccessMessage(
      ids.length === 1 ? "Event plan deleted" : `${ids.length} event plans deleted`,
    );
  }

  function handlePlanCardClick(plan: BookingPlan) {
    if (planBulkManage.selectionMode) {
      planBulkManage.toggleItem(plan.id);
      return;
    }

    openEditForm(plan);
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
              !planBulkManage.selectionMode ? (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="shrink-0 cursor-pointer ftc-btn-primary px-4 py-2.5 text-sm uppercase tracking-wide"
                >
                  Create event plan
                </button>
              ) : null
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
              <div className={PLANNER_WORKSPACE_SECONDARY_TABS_ROW_CLASS}>
                <SavedEventPlansSectionHeading className="mb-0" />
                {!loadingAccess &&
                !loadingPlans &&
                planBulkManage.showManageControl &&
                !planBulkManage.selectionMode ? (
                  <HistoryManageButton
                    ariaLabel="Delete event plans"
                    onClick={planBulkManage.enterSelectionMode}
                  />
                ) : null}
              </div>
              {planBulkManage.showSelectionToolbar ? (
                <HistorySelectionToolbar
                  selectedCount={planBulkManage.selectedCount}
                  allSelected={planBulkManage.allSelected}
                  removing={planBulkManage.removing}
                  onCancel={planBulkManage.cancelSelectionMode}
                  onSelectAll={planBulkManage.selectAll}
                  onRemove={planBulkManage.openConfirm}
                  removeLabel="Delete selected"
                  removingLabel="Deleting..."
                />
              ) : null}
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
                <ul className="space-y-2.5">
                  {visiblePlans.map((plan) => (
                    <EventPlanCard
                      key={plan.id}
                      plan={plan}
                      selectionMode={planBulkManage.selectionMode}
                      selected={planBulkManage.selectedIds.has(plan.id)}
                      onCardClick={() => handlePlanCardClick(plan)}
                      onUseForBooking={() => handleUseForBooking(plan.id)}
                    />
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </div>

        <EventPlanDeleteConfirmDialog
          open={planBulkManage.confirmOpen}
          count={planBulkManage.confirmCount}
          loading={planBulkManage.removing}
          onCancel={planBulkManage.closeConfirm}
          onConfirm={() => {
            void planBulkManage.confirmRemove(handleDeletePlans);
          }}
        />
      </div>
    </OnboardingGuard>
  );
}

function EventPlanCard({
  plan,
  selectionMode,
  selected,
  onCardClick,
  onUseForBooking,
}: {
  plan: BookingPlan;
  selectionMode: boolean;
  selected: boolean;
  onCardClick: () => void;
  onUseForBooking: () => void;
}) {
  const selectionLabel = selected
    ? `Deselect ${plan.name}`
    : `Select ${plan.name}`;

  return (
    <li
      className={`ftc-card overflow-hidden transition ${
        selectionMode
          ? selected
            ? "ftc-option-card-selected"
            : "border-ftc-border-subtle bg-ftc-surface"
          : "ftc-card-hoverable"
      }`}
    >
      <div
        className={`flex flex-col gap-2 p-3 sm:flex-row sm:gap-3 sm:p-3.5 ${
          selectionMode ? "sm:items-start" : "sm:items-end"
        }`}
      >
        <button
          type="button"
          onClick={onCardClick}
          className="flex min-w-0 flex-1 items-start gap-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ftc-primary/35 active:bg-ftc-bg-elevated/60"
        >
          {selectionMode ? (
            <HistorySelectionCheckbox
              checked={selected}
              label={selectionLabel}
              presentational
            />
          ) : null}
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold text-ftc-text">{plan.name}</span>
            <dl className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
              <PlanDetail label="Event" value={plan.event_name} />
              <PlanDetail label="Venue" value={plan.venue} />
            </dl>
            {plan.notes?.trim() ? (
              <span className="mt-2 block text-sm leading-snug text-ftc-text-secondary">
                {plan.notes}
              </span>
            ) : null}
          </span>
        </button>

        {!selectionMode ? (
          <div className="flex justify-end sm:shrink-0">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onUseForBooking();
              }}
              className="ftc-btn-primary min-h-11 px-3 py-2 text-xs uppercase tracking-wide"
            >
              Use for booking
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function PlanDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">{label}</dt>
      <dd className="mt-px text-ftc-text">{value}</dd>
    </div>
  );
}
