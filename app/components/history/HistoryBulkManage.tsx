"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FTC_ICON_BUTTON_SM_CLASS } from "@/lib/design/ftcDesignSystem";

export function filterOutRemovingHistoryItems<T extends { id: string }>(
  items: T[],
  removingIds: ReadonlySet<string>,
): T[] {
  if (removingIds.size === 0) {
    return items;
  }

  return items.filter((item) => !removingIds.has(item.id));
}

function ManageHistoryIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function useHistoryBulkManage<T extends { id: string }>(items: T[]) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCount, setConfirmCount] = useState(0);
  const [pendingRemoveIds, setPendingRemoveIds] = useState<string[]>([]);
  const [removingIds, setRemovingIds] = useState<Set<string>>(() => new Set());
  const [removing, setRemoving] = useState(false);

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const selectedCount = selectedIds.size;
  const allSelected = itemIds.length > 0 && selectedCount === itemIds.length;
  const showSelectionToolbar = selectionMode && !confirmOpen && !removing;

  function resetSelectionState() {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setConfirmOpen(false);
    setConfirmCount(0);
    setPendingRemoveIds([]);
    setRemovingIds(new Set());
  }

  function enterSelectionMode() {
    setSelectionMode(true);
    setSelectedIds(new Set());
    setConfirmOpen(false);
    setConfirmCount(0);
    setPendingRemoveIds([]);
    setRemovingIds(new Set());
    setRemoving(false);
  }

  function cancelSelectionMode() {
    resetSelectionState();
    setRemoving(false);
  }

  function toggleItem(id: string) {
    if (removing) {
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function selectAll() {
    if (removing) {
      return;
    }

    setSelectedIds(new Set(itemIds));
  }

  function openConfirm() {
    if (removing || selectedCount === 0) {
      return;
    }

    const ids = [...selectedIds];
    setConfirmCount(ids.length);
    setPendingRemoveIds(ids);
    setConfirmOpen(true);
  }

  function closeConfirm() {
    if (removing) {
      return;
    }

    setConfirmOpen(false);
    setConfirmCount(0);
    setPendingRemoveIds([]);
  }

  async function confirmRemove(onRemove: (ids: string[]) => Promise<void>) {
    if (removing) {
      return;
    }

    const ids = pendingRemoveIds.length > 0 ? [...pendingRemoveIds] : [...selectedIds];

    if (ids.length === 0) {
      return;
    }

    setRemoving(true);
    setRemovingIds(new Set(ids));

    try {
      await onRemove(ids);
      resetSelectionState();
    } catch {
      setRemovingIds(new Set());
      setSelectionMode(true);
      setSelectedIds(new Set(ids));
      setConfirmOpen(true);
      setConfirmCount(ids.length);
      setPendingRemoveIds(ids);
    } finally {
      setRemoving(false);
    }
  }

  return {
    selectionMode,
    selectedIds,
    selectedCount,
    confirmCount,
    allSelected,
    confirmOpen,
    removing,
    removingIds,
    showSelectionToolbar,
    enterSelectionMode,
    cancelSelectionMode,
    toggleItem,
    selectAll,
    openConfirm,
    closeConfirm,
    confirmRemove,
    showManageControl: items.length > 0,
  };
}

export function HistoryManageButton({
  onClick,
  disabled = false,
  ariaLabel = "Manage history",
  className = FTC_ICON_BUTTON_SM_CLASS,
}: {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={className}
    >
      <ManageHistoryIcon />
    </button>
  );
}

export function HistorySelectionToolbar({
  selectedCount,
  allSelected,
  removing,
  onCancel,
  onSelectAll,
  onRemove,
  removeLabel = "Remove from history",
  removingLabel = "Removing...",
  className = "",
}: {
  selectedCount: number;
  allSelected: boolean;
  removing: boolean;
  onCancel: () => void;
  onSelectAll: () => void;
  onRemove: () => void;
  removeLabel?: string;
  removingLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated/60 px-3 py-2.5 ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={removing}
          className="rounded-lg border border-ftc-border-subtle bg-ftc-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSelectAll}
          disabled={removing || allSelected}
          className="rounded-lg border border-ftc-border-subtle bg-ftc-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          Select all
        </button>
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={removing || selectedCount === 0}
        aria-busy={removing}
        className="rounded-lg border-0 bg-[var(--ftc-color-danger)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ftc-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {removing ? removingLabel : removeLabel}
      </button>
    </div>
  );
}

function HistoryConfirmDangerButton({
  loading,
  onConfirm,
  label = "Remove from history",
  loadingLabel = "Removing...",
}: {
  loading: boolean;
  onConfirm: () => void;
  label?: string;
  loadingLabel?: string;
}) {
  const buttonClassName =
    "inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl border-0 bg-[var(--ftc-color-danger)] px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-ftc-bg sm:w-auto";

  if (loading) {
    return (
      <button
        type="button"
        aria-busy="true"
        tabIndex={-1}
        className={`${buttonClassName} cursor-not-allowed`}
      >
        {loadingLabel}
      </button>
    );
  }

  return (
    <button type="button" onClick={onConfirm} className={buttonClassName}>
      {label}
    </button>
  );
}

function HistoryConfirmSecondaryButton({
  loading,
  onClick,
  children,
}: {
  loading: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={loading ? undefined : onClick}
      aria-disabled={loading}
      tabIndex={loading ? -1 : 0}
      className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-ftc-text-secondary disabled:cursor-not-allowed sm:w-auto"
    >
      {children}
    </button>
  );
}

function HistoryRemoveConfirmDialogPanel({
  count,
  loading,
  title,
  description,
  cancelLabel,
  confirmLabel,
  confirmLoadingLabel,
  onCancel,
  onConfirm,
}: {
  count: number;
  loading: boolean;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmLoadingLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
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
        aria-labelledby="history-remove-confirm-title"
        className="isolate max-h-[90dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl border border-ftc-border-subtle bg-ftc-surface sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-ftc-border-subtle px-5 py-4">
          <h2 id="history-remove-confirm-title" className="text-base font-semibold text-ftc-text">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ftc-text-secondary">{description}</p>
        </div>

        <div className="relative z-10 flex flex-col gap-2 border-t border-ftc-border-subtle bg-ftc-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
          <HistoryConfirmSecondaryButton loading={loading} onClick={onCancel}>
            {cancelLabel}
          </HistoryConfirmSecondaryButton>
          <HistoryConfirmDangerButton
            loading={loading}
            onConfirm={onConfirm}
            label={confirmLabel}
            loadingLabel={confirmLoadingLabel}
          />
        </div>
      </div>
    </div>
  );
}

export function HistoryRemoveConfirmDialog({
  open,
  count,
  loading,
  title = "Remove from history?",
  description,
  cancelLabel = "Keep items",
  confirmLabel = "Remove from history",
  confirmLoadingLabel = "Removing...",
  onCancel,
  onConfirm,
}: {
  open: boolean;
  count: number;
  loading: boolean;
  title?: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmLoadingLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const resolvedDescription =
    description ??
    `This removes ${count} selected item${count === 1 ? "" : "s"} from your History view only. It does not delete the event, booking, chat, or any records`;

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

  return createPortal(
    <HistoryRemoveConfirmDialogPanel
      count={count}
      loading={loading}
      title={title}
      description={resolvedDescription}
      cancelLabel={cancelLabel}
      confirmLabel={confirmLabel}
      confirmLoadingLabel={confirmLoadingLabel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />,
    document.body,
  );
}

export function HistorySelectionCheckbox({
  checked,
  label,
  onToggle,
  disabled = false,
  presentational = false,
}: {
  checked: boolean;
  label: string;
  onToggle?: () => void;
  disabled?: boolean;
  presentational?: boolean;
}) {
  const className = `mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
    checked
      ? "border-0 bg-ftc-primary text-ftc-bg"
      : "border-ftc-border-strong bg-ftc-bg-elevated text-transparent"
  } disabled:opacity-50`;

  if (presentational) {
    return (
      <span aria-hidden="true" className={className}>
        ✓
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={label}
      aria-pressed={checked}
      className={className}
    >
      <span aria-hidden="true">✓</span>
    </button>
  );
}
