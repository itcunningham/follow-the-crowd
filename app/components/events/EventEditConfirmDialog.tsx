"use client";

export default function EventEditConfirmDialog({
  open,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={() => {
        if (!loading) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-edit-confirm-title"
        className="ftc-modal w-full max-w-md rounded-2xl p-4 sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="event-edit-confirm-title" className="text-base font-semibold text-ftc-text">
          Update event details?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ftc-text-secondary">
          This event has booking requests or confirmed DJs. These changes may affect their plans.
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="ftc-btn-secondary px-4 py-2.5 text-sm uppercase tracking-wide disabled:opacity-50"
          >
            Go back
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="ftc-btn-primary px-4 py-2.5 text-sm uppercase tracking-wide disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update event"}
          </button>
        </div>
      </div>
    </div>
  );
}
