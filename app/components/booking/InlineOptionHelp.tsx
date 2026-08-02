"use client";

export function InlineOptionHelpButton({
  label,
  open,
  onToggle,
  disabled = false,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`${label} help`}
      aria-expanded={open}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ftc-border-subtle bg-ftc-bg text-xs font-semibold text-ftc-text-muted transition hover:border-ftc-border-strong hover:text-ftc-text disabled:cursor-not-allowed disabled:opacity-50"
    >
      ?
    </button>
  );
}

export function InlineOptionHelpPanel({
  label,
  help,
}: {
  /**
   * Small heading naming what the help is about, rendered on its own line above
   * the body so the subject is identifiable at a glance. Optional: omit when the
   * panel has no name to carry.
   */
  label?: string;
  help: string;
}) {
  return (
    <div className="rounded-lg border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-2 text-xs leading-relaxed text-ftc-text-muted">
      {label ? <p className="font-semibold text-ftc-text">{label}</p> : null}
      <p className={label ? "mt-0.5" : undefined}>{help}</p>
    </div>
  );
}
