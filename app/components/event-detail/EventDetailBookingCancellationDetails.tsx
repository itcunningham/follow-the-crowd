"use client";

export function EventDetailBookingCancellationDetails({
  cancelledByLabel,
  cancellationReasonLabel,
  textSizeClass = "text-sm",
}: {
  cancelledByLabel?: string | null;
  cancellationReasonLabel?: string | null;
  textSizeClass?: "text-sm" | "text-xs";
}) {
  if (!cancelledByLabel && !cancellationReasonLabel) {
    return null;
  }

  return (
    <div className="mt-2 min-w-0 max-w-full space-y-1">
      {cancelledByLabel ? (
        <p className={`min-w-0 ${textSizeClass} text-ftc-text-muted`}>
          Cancelled by {cancelledByLabel}
        </p>
      ) : null}
      {cancellationReasonLabel ? (
        <div className="min-w-0 max-w-full">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
            Reason
          </p>
          <p
            className={`ftc-event-detail-cancellation-reason-text mt-0.5 ${textSizeClass} leading-snug text-ftc-text-muted`}
          >
            {cancellationReasonLabel}
          </p>
        </div>
      ) : null}
    </div>
  );
}
