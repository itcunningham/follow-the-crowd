"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import PlannerEventsSubNav from "@/app/components/PlannerEventsSubNav";
import { BookingDateField, BookingSetTimeRangeField } from "@/app/components/BookingDateTimeFields";
import { BookingRateField } from "@/app/components/BookingRateField";
import {
  createBookingPlan,
  listBookingPlans,
  updateBookingPlan,
  type BookingPlan,
  type BookingPlanInput,
} from "@/lib/bookingPlans";
import { formatRateDisplay, normalizeStoredRate } from "@/lib/bookingRate";
import {
  canAccessBookingPlans,
  getCurrentUserProfile,
  type UserRole,
} from "@/lib/user/currentUser";

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
      return "Booking plans table is not set up yet. Run scripts/setupBookingPlans.sql.";
    }

    if (supabaseError.message) {
      return supabaseError.message;
    }
  }

  return error instanceof Error ? error.message : "Failed to load booking plans";
}

export default function BookingPlansPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [plans, setPlans] = useState<BookingPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [form, setForm] = useState<BookingPlanInput>(emptyPlanForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
          router.replace(userRole === "dj" ? "/dm" : "/discover");
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
  }, [loadingAccess, role, loadPlans, successMessage]);

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
      fee: normalizeStoredRate(plan.fee),
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
      !form.setTime.trim() ||
      !form.fee.trim()
    ) {
      setError("Please fill in all required plan fields.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (editingPlanId) {
        await updateBookingPlan(editingPlanId, form);
        setSuccessMessage("Booking plan updated");
      } else {
        await createBookingPlan(form);
        setSuccessMessage("Booking plan created");
      }

      closeForm();
    } catch (saveError) {
      console.error("Failed to save booking plan:", saveError);
      setError(saveError instanceof Error ? saveError.message : "Failed to save booking plan");
    } finally {
      setSaving(false);
    }
  }

  function handleUseForBooking(planId: string) {
    router.push(`/bookings?planId=${planId}`);
  }

  if (loadingAccess) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-ftc-bg text-sm text-ftc-text-muted">
        Loading...
      </div>
    );
  }

  if (!canAccessBookingPlans(role)) {
    return null;
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
              <h1 className="text-xl font-semibold text-ftc-text">Booking Plans</h1>
              <p className="mt-1 text-sm text-ftc-text-muted">
                Save booking details once and reuse them when contacting DJs.
              </p>
            </div>
            {!formOpen ? (
              <button
                type="button"
                onClick={openCreateForm}
                className="ftc-btn-primary shrink-0 px-4 py-2.5 text-sm uppercase tracking-wide"
              >
                Create booking plan
              </button>
            ) : null}
          </div>
          <PlannerEventsSubNav />
        </header>

        <div className="px-4 py-4 sm:px-6">
          {successMessage ? (
            <p className="mb-4 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-3 text-sm text-ftc-text-secondary">
              {successMessage}
            </p>
          ) : null}

          {formOpen ? (
            <section className="ftc-card mb-6 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-ftc-text">
                  {editingPlanId ? "Edit booking plan" : "Create booking plan"}
                </h2>
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="text-xs font-semibold uppercase tracking-wide text-ftc-text-muted transition hover:text-ftc-text-secondary disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="space-y-4">
                <PlanField
                  label="Plan name"
                  value={form.name}
                  onChange={(value) => updateField("name", value)}
                  placeholder="Synergy Vol. 001 — Main Room"
                  required
                />
                <PlanField
                  label="Event name"
                  value={form.eventName}
                  onChange={(value) => updateField("eventName", value)}
                  placeholder="Warehouse Sessions"
                  required
                />
                <PlanField
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
                  value={form.fee}
                  onChange={(value) => updateField("fee", value)}
                  required
                />
                <PlanField
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
                  {saving ? "Saving..." : editingPlanId ? "Save changes" : "Save booking plan"}
                </button>
              </form>
            </section>
          ) : null}

          {loadingPlans ? (
            <p className="text-sm text-ftc-text-muted">Loading booking plans...</p>
          ) : error && plans.length === 0 ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : plans.length === 0 ? (
            <div className="ftc-card-empty px-6 py-12 text-center">
              <p className="text-base font-medium text-ftc-text-secondary">No saved booking plans yet.</p>
              <p className="mt-2 text-sm text-ftc-text-muted">
                Create a plan to reuse event details when booking DJs.
              </p>
              {!formOpen ? (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="ftc-btn-primary mt-6 px-5 py-3 text-sm uppercase tracking-wide"
                >
                  Create booking plan
                </button>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-3">
              {plans.map((plan) => (
                <li key={plan.id} className="ftc-card p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-primary">
                        Saved Booking Plan
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-ftc-text">{plan.name}</h3>
                      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <PlanDetail label="Event" value={plan.event_name} />
                        <PlanDetail label="Venue" value={plan.venue} />
                        <PlanDetail label="Date" value={plan.event_date} />
                        <PlanDetail label="Set time" value={plan.set_time} />
                        <PlanDetail label="Rate" value={formatRateDisplay(plan.fee)} />
                      </dl>
                      {plan.notes?.trim() ? (
                        <p className="mt-3 text-sm leading-relaxed text-ftc-text-secondary">{plan.notes}</p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                      <button
                        type="button"
                        onClick={() => openEditForm(plan)}
                        className="ftc-btn-secondary px-3 py-1.5 text-xs uppercase tracking-wide"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUseForBooking(plan.id)}
                        className="ftc-btn-primary px-3 py-1.5 text-xs uppercase tracking-wide"
                      >
                        Use for booking
                      </button>
                    </div>
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

function PlanDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">{label}</dt>
      <dd className="mt-0.5 text-ftc-text">{value}</dd>
    </div>
  );
}

function PlanField({
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
      <span className="ftc-label">{label}</span>
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
