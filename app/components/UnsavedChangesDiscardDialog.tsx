"use client";

/** Shared discard sheet for dirty edit surfaces (profile, event detail, …). */
export default function UnsavedChangesDiscardDialog({
  open,
  onKeepEditing,
  onDiscard,
  titleId = "discard-unsaved-changes-title",
}: {
  open: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
  titleId?: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onKeepEditing}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-t-2xl border border-ftc-border-strong bg-ftc-bg-elevated p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-ftc-card sm:rounded-2xl sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-semibold text-ftc-text">
          Discard unsaved changes?
        </h2>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onKeepEditing}
            className="rounded-xl border border-ftc-border-strong bg-ftc-surface/80 px-4 py-2.5 text-sm font-semibold text-ftc-text transition hover:border-ftc-border-strong"
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:border-red-500/50 hover:bg-red-500/15"
          >
            Discard changes
          </button>
        </div>
      </div>
    </div>
  );
}
