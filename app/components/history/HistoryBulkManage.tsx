"use client";

import { useMemo, useState } from "react";
import BookingSheetDialog, {
  BookingSheetDangerButton,
  BookingSheetSecondaryButton,
} from "@/app/components/booking/BookingSheetDialog";

export function filterOutRemovingHistoryItems<T extends { id: string }>(
  items: T[],
  removingIds: ReadonlySet<string>,
): T[] {
  if (removingIds.size === 0) {
    return items;
  }

  return items.filter((item) => !removingIds.has(item.id));
}

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
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

  function enterSelectionMode() {
    setSelectionMode(true);
    setSelectedIds(new Set());
    setConfirmOpen(false);
    setConfirmCount(0);
    setPendingRemoveIds([]);
    setRemovingIds(new Set());
  }

  function cancelSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setConfirmOpen(false);
    setConfirmCount(0);
    setPendingRemoveIds([]);
    setRemovingIds(new Set());
  }

  function toggleItem(id: string) {
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
    setSelectedIds(new Set(itemIds));
  }

  function openConfirm() {
    if (selectedCount > 0) {
      const ids = [...selectedIds];
      setConfirmCount(ids.length);
      setPendingRemoveIds(ids);
      setConfirmOpen(true);
    }
  }

  function closeConfirm() {
    if (!removing) {
      setConfirmOpen(false);
      setConfirmCount(0);
      setPendingRemoveIds([]);
    }
  }

  async function confirmRemove(onRemove: (ids: string[]) => Promise<void>) {
    const ids = pendingRemoveIds.length > 0 ? [...pendingRemoveIds] : [...selectedIds];

    if (ids.length === 0) {
      return;
    }

    setRemoving(true);
    setSelectedIds(new Set());
    setRemovingIds(new Set(ids));
    setSelectionMode(false);

    try {
      await onRemove(ids);
      setPendingRemoveIds([]);
      await waitForNextFrame();
      setConfirmOpen(false);
      setConfirmCount(0);
      await waitForNextFrame();
      setRemovingIds(new Set());
    } catch {
      setRemovingIds(new Set());
      setSelectionMode(true);
      setSelectedIds(new Set(ids));
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
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Manage history"
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ftc-border-subtle bg-ftc-bg-elevated text-ftc-text-muted transition hover:border-ftc-border-strong hover:text-ftc-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
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
}: {
  selectedCount: number;
  allSelected: boolean;
  removing: boolean;
  onCancel: () => void;
  onSelectAll: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated/60 px-3 py-2.5">
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
        className="rounded-lg border-0 bg-[var(--ftc-color-danger)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ftc-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {removing ? "Removing..." : "Remove from history"}
      </button>
    </div>
  );
}

export function HistoryRemoveConfirmDialog({
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
  return (
    <BookingSheetDialog
      open={open}
      title="Remove from history?"
      titleId="history-remove-confirm-title"
      description={`This removes ${count} selected item${count === 1 ? "" : "s"} from your History view only. It does not delete the event, booking, chat, or any records.`}
      loading={loading}
      onBackdropClick={onCancel}
      footer={
        <>
          <BookingSheetSecondaryButton disabled={loading} onClick={onCancel}>
            Keep items
          </BookingSheetSecondaryButton>
          <BookingSheetDangerButton disabled={loading} onClick={onConfirm}>
            {loading ? "Removing..." : "Remove from history"}
          </BookingSheetDangerButton>
        </>
      }
    />
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
