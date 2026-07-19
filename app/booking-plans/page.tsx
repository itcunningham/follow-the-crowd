"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import { useGuardProfile } from "@/app/components/GuardProfileContext";
import { PlannerWorkspacePage } from "@/app/components/planner/PlannerWorkspaceLayout";
import { PlannerFormCard, PlannerFormField, PlannerInlineError } from "@/app/components/planner/PlannerUi";
import {
  BookingPlanListSkeleton,
  SavedEventPlansSectionHeader,
} from "@/app/components/skeleton/Skeleton";
import {
  HistorySelectionToolbar,
  useHistoryBulkManage,
} from "@/app/components/history/HistoryBulkManage";
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
import {
  consumeBookingPlansSuccessMessage,
  stashPendingBookingPlanId,
} from "@/lib/bookings/planDeepLink";
import {
  FTC_LIST_GAP_CLASS,
  EVENT_PLAN_ACTION_RESERVE_CLASS,
  EVENT_PLAN_USE_BUTTON_CLASS,
  EVENT_PLAN_USE_BUTTON_WRAP_CLASS,
  EVENT_PLANS_CREATE_BUTTON_CLASS,
} from "@/lib/design/ftcDesignSystem";

const emptyPlanForm: BookingPlanInput = {
  name: "",
  eventName: "",
  venue: "",
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
  const guardProfile = useGuardProfile();
  const [cachedRole] = useState<UserRole | null>(() => readCachedNavRole());
  const [role, setRole] = useState<UserRole | null>(
    () => guardProfile?.role ?? cachedRole,
  );
  const displayRole = role ?? cachedRole;
  const [loadingAccess, setLoadingAccess] = useState(
    () => !guardProfile?.role && !cachedRole,
  );
  const [plans, setPlans] = useState<BookingPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [form, setForm] = useState<BookingPlanInput>(emptyPlanForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const planBulkManage = useHistoryBulkManage(plans);

  const planFormNotesValidationError = useMemo(() => {
    if (!formOpen) {
      return null;
    }

    return getEventNotesValidationError(form.notes);
  }, [formOpen, form.notes]);
  const planFormValidationError = planFormNotesValidationError;

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
    const message = consumeBookingPlansSuccessMessage();

    if (message) {
      setSuccessMessage(message);
    }
  }, []);

  useEffect(() => {
    if (guardProfile?.role) {
      setRole(guardProfile.role);

      if (!canAccessBookingPlans(guardProfile.role)) {
        router.replace(getDefaultRouteForRole(guardProfile.role));
        return;
      }

      setLoadingAccess(false);
      return;
    }

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
  }, [guardProfile?.role, router]);

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

    if (!form.name.trim() || !form.eventName.trim() || !form.venue.trim()) {
      setError("Please fill in all required plan fields.");
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

  const plansLoadSettled = !loadingAccess && !loadingPlans;
  const showTrashButton = !planBulkManage.selectionMode && (!plansLoadSettled || plans.length > 0);
  const trashButtonDisabled = !plansLoadSettled || plans.length === 0;
  const showEventPlansToolbar = !formOpen && (planBulkManage.selectionMode || showTrashButton);

  return (
    <OnboardingGuard>
      <PlannerWorkspacePage
        initialRole={displayRole}
        actions={
          !formOpen ? (
            planBulkManage.selectionMode ? (
              <span
                aria-hidden="true"
                className={`pointer-events-none invisible ${EVENT_PLANS_CREATE_BUTTON_CLASS}`}
              >
                Create event plan
              </span>
            ) : (
              <button
                type="button"
                onClick={openCreateForm}
                className={`cursor-pointer ${EVENT_PLANS_CREATE_BUTTON_CLASS}`}
              >
                Create event plan
              </button>
            )
          ) : undefined
        }
        secondaryControlsSlot={
          showEventPlansToolbar ? (
            <SavedEventPlansSectionHeader
              selectionMode={planBulkManage.selectionMode}
              trashButtonDisabled={trashButtonDisabled}
              onTrashClick={planBulkManage.enterSelectionMode}
              selectionToolbar={
                <HistorySelectionToolbar
                  embedded
                  selectedCount={planBulkManage.selectedCount}
                  allSelected={planBulkManage.allSelected}
                  removing={planBulkManage.removing}
                  onCancel={planBulkManage.cancelSelectionMode}
                  onSelectAll={planBulkManage.selectAll}
                  onRemove={planBulkManage.openConfirm}
                  removeLabel="Delete selected"
                  removingLabel="Deleting..."
                />
              }
            />
          ) : undefined
        }
        secondaryControlsPlaceholder={formOpen}
      >
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
                <ul className={FTC_LIST_GAP_CLASS}>
                  {visiblePlans.map((plan) => (
                    <EventPlanCard
                      key={plan.id}
                      plan={plan}
                      selectionMode={planBulkManage.showSelectionToolbar}
                      selected={planBulkManage.selectedIds.has(plan.id)}
                      onCardClick={() => handlePlanCardClick(plan)}
                      onUseForBooking={() => handleUseForBooking(plan.id)}
                    />
                  ))}
                </ul>
              )}
            </>
          ) : null}

        <EventPlanDeleteConfirmDialog
          open={planBulkManage.confirmOpen}
          count={planBulkManage.confirmCount}
          loading={planBulkManage.removing}
          onCancel={planBulkManage.closeConfirm}
          onConfirm={() => {
            void planBulkManage.confirmRemove(handleDeletePlans);
          }}
        />
      </PlannerWorkspacePage>
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
  const notesText = plan.notes.trim();
  const hasNotes = notesText.length > 0;
  const selectionLabel = selected
    ? `Deselect ${plan.name}`
    : `Select ${plan.name} for deletion`;
  const cardClassName = selectionMode
    ? `ftc-card relative overflow-hidden${selected ? " ring-1 ring-ftc-primary/40" : ""}`
    : "ftc-card relative overflow-hidden ftc-card-hoverable";

  return (
    <li
      className={cardClassName}
      aria-selected={selectionMode ? selected : undefined}
    >
      {selectionMode ? (
        <button
          type="button"
          onClick={onCardClick}
          aria-label={selectionLabel}
          aria-pressed={selected}
          className="absolute inset-0 z-10 rounded-[inherit] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ftc-primary/35"
        />
      ) : null}

      <div className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
        {selectionMode ? (
          <div className="min-w-0 flex-1 text-left">
            <EventPlanCardBody plan={plan} notesText={notesText} hasNotes={hasNotes} />
          </div>
        ) : (
          <button
            type="button"
            onClick={onCardClick}
            className="flex min-w-0 flex-1 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ftc-primary/35 active:bg-ftc-bg-elevated/60"
          >
            <EventPlanCardBody plan={plan} notesText={notesText} hasNotes={hasNotes} />
          </button>
        )}

        {selectionMode ? (
          <div aria-hidden="true" className={EVENT_PLAN_ACTION_RESERVE_CLASS} />
        ) : (
          <div className={EVENT_PLAN_USE_BUTTON_WRAP_CLASS}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onUseForBooking();
              }}
              className={EVENT_PLAN_USE_BUTTON_CLASS}
            >
              Use plan
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function EventPlanCardBody({
  plan,
  notesText,
  hasNotes,
}: {
  plan: BookingPlan;
  notesText: string;
  hasNotes: boolean;
}) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-[1.0625rem] font-bold leading-snug text-ftc-text sm:text-lg">
        {plan.name}
      </span>
      <MobilePlanEventVenueRow eventName={plan.event_name} venue={plan.venue} />
      {hasNotes ? (
        <div className="mt-2 sm:hidden">
          <PlanFieldLabel as="p">Notes</PlanFieldLabel>
          <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-ftc-text-muted">
            {notesText}
          </p>
        </div>
      ) : null}
      <dl className="mt-2.5 hidden gap-2 text-sm sm:grid sm:grid-cols-2">
        <PlanDetail label="Event" value={plan.event_name} />
        <PlanDetail label="Venue" value={plan.venue} />
        {hasNotes ? (
          <PlanDetail label="Notes" value={notesText} className="sm:col-span-2" clampLines />
        ) : null}
      </dl>
    </span>
  );
}

function PlanFieldLabel({
  children,
  as: Tag = "dt",
}: {
  children: React.ReactNode;
  as?: "dt" | "p" | "span";
}) {
  return (
    <Tag className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
      {children}
    </Tag>
  );
}

function MobilePlanEventVenueRow({
  eventName,
  venue,
}: {
  eventName: string;
  venue: string;
}) {
  const event = eventName.trim();
  const venueName = venue.trim();

  if (!event && !venueName) {
    return null;
  }

  return (
    <p className="mt-1.5 min-w-0 text-sm sm:hidden">
      {event ? (
        <>
          <PlanFieldLabel as="span">Event</PlanFieldLabel>{" "}
          <span className="text-ftc-text">{event}</span>
        </>
      ) : null}
      {event && venueName ? <span className="text-ftc-text-muted"> • </span> : null}
      {venueName ? (
        <>
          <PlanFieldLabel as="span">Venue</PlanFieldLabel>{" "}
          <span className="text-ftc-text">{venueName}</span>
        </>
      ) : null}
    </p>
  );
}

function PlanDetail({
  label,
  value,
  className = "",
  clampLines = false,
}: {
  label: string;
  value: string;
  className?: string;
  clampLines?: boolean;
}) {
  return (
    <div className={className}>
      <PlanFieldLabel>{label}</PlanFieldLabel>
      <dd
        className={`mt-0.5 min-w-0 ${
          clampLines
            ? "line-clamp-2 leading-snug text-ftc-text-muted"
            : "text-ftc-text"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
