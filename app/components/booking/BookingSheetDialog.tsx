"use client";

export function BookingSheetSecondaryButton({
  children,
  disabled,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function BookingSheetDangerButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl border-0 bg-[var(--ftc-color-danger)] px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-ftc-bg transition hover:opacity-90 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function BookingSheetWarningButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl border-0 bg-[var(--ftc-color-warning)] px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-ftc-bg transition hover:opacity-90 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function BookingSheetPrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="ftc-btn-primary flex-1 px-4 py-2.5 text-sm uppercase tracking-wide disabled:opacity-50 sm:flex-none"
    >
      {children}
    </button>
  );
}

export default function BookingSheetDialog({
  open,
  title,
  titleId,
  description,
  loading = false,
  onBackdropClick,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  titleId: string;
  description?: string;
  loading?: boolean;
  onBackdropClick?: () => void;
  children?: React.ReactNode;
  footer: React.ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={() => {
        if (!loading) {
          onBackdropClick?.();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl border border-ftc-border-subtle bg-ftc-surface sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-ftc-border-subtle px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-ftc-text">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-ftc-text-secondary">{description}</p>
          ) : null}
        </div>

        {children ? <div className="px-5 py-4">{children}</div> : null}

        <div className="flex flex-col gap-2 border-t border-ftc-border-subtle px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
          {footer}
        </div>
      </div>
    </div>
  );
}
