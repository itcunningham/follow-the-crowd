"use client";

import { useState } from "react";
import {
  DM_REPORT_REASONS,
  type DmReportReason,
  type DmReportType,
} from "@/lib/userReports";

export default function DmReportFormModal({
  open,
  title,
  description,
  reportType,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description: string;
  reportType: DmReportType;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: { reason: DmReportReason; note: string }) => Promise<void>;
}) {
  const [reason, setReason] = useState<DmReportReason>("spam");
  const [note, setNote] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  async function handleSubmit() {
    setErrorMessage(null);

    try {
      await onSubmit({ reason, note });
      setSuccessMessage(
        reportType === "message"
          ? "Message reported. Thanks for helping keep Follow The Crowd safe."
          : "User reported. Thanks for helping keep Follow The Crowd safe.",
      );
    } catch (submitError) {
      setErrorMessage(
        submitError instanceof Error ? submitError.message : "Failed to submit report.",
      );
    }
  }

  function handleClose() {
    if (busy) {
      return;
    }

    setReason("spam");
    setNote("");
    setSuccessMessage(null);
    setErrorMessage(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dm-report-title"
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-ftc-border-strong bg-ftc-bg-elevated p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-ftc-card sm:rounded-2xl sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="dm-report-title" className="text-base font-semibold text-ftc-text">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ftc-text-secondary">{description}</p>

        {successMessage ? (
          <>
            <p className="mt-4 rounded-xl border border-0 bg-[var(--ftc-color-success)] px-3 py-3 text-sm text-ftc-bg">
              {successMessage}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-ftc-border-strong bg-ftc-surface/80 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <fieldset className="mt-4 space-y-2">
              <legend className="sr-only">Report reason</legend>
              {DM_REPORT_REASONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                    reason === option.value
                      ? "border-0 bg-ftc-primary text-ftc-bg"
                      : "border-ftc-border bg-ftc-surface/40 text-ftc-text-secondary hover:border-ftc-border-strong"
                  }`}
                >
                  <input
                    type="radio"
                    name={`dm-report-reason-${reportType}`}
                    value={option.value}
                    checked={reason === option.value}
                    onChange={() => setReason(option.value)}
                    className="accent-ftc-primary"
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>

            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ftc-text-muted">
                Optional note
              </span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Add any helpful details..."
                className="w-full resize-none rounded-xl border border-ftc-border bg-ftc-surface/70 px-3 py-2.5 text-sm text-ftc-text outline-none transition placeholder:text-ftc-text-muted focus:border-ftc-primary/35"
              />
            </label>

            {errorMessage ? (
              <p className="mt-3 text-sm text-red-400">{errorMessage}</p>
            ) : null}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={handleClose}
                className="rounded-xl border border-ftc-border-strong bg-ftc-surface/80 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSubmit()}
                className="rounded-xl border-0 bg-[var(--ftc-color-danger)] px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-ftc-bg transition hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Submitting..." : "Submit report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
