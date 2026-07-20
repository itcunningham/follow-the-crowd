"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
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

/** Events History ALL — toggle every visible removable id, preserving off-screen selections. */
export function resolveHistoryBulkSelectAllToggle(
  visibleHistoryIds: string[],
  selectedIds: ReadonlySet<string>,
): Set<string> {
  const visibleIds = visibleHistoryIds.map((id) => String(id));
  const currentSet = new Set(Array.from(selectedIds, (id) => String(id)));
  const areAllSelected =
    visibleIds.length > 0 && visibleIds.every((id) => currentSet.has(id));

  if (areAllSelected) {
    return new Set(Array.from(currentSet).filter((id) => !visibleIds.includes(id)));
  }

  return new Set([...currentSet, ...visibleIds]);
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
  const selectedIdsRef = useRef(selectedIds);
  const pendingRemoveIdsRef = useRef(pendingRemoveIds);
  selectedIdsRef.current = selectedIds;
  pendingRemoveIdsRef.current = pendingRemoveIds;

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const selectedCount = selectedIds.size;
  const allSelected =
    itemIds.length > 0 && itemIds.every((id) => selectedIds.has(id));
  const showSelectionToolbar = selectionMode && !confirmOpen && !removing;

  function resetSelectionState() {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setSelectionMode(false);
    setSelectedIds(new Set());
    setConfirmOpen(false);
    setConfirmCount(0);
    pendingRemoveIdsRef.current = [];
    setPendingRemoveIds([]);
    setRemovingIds(new Set());
  }

  function enterSelectionMode() {
    setSelectionMode(true);
    selectedIdsRef.current = new Set();
    setSelectedIds(new Set());
    setConfirmOpen(false);
    setConfirmCount(0);
    pendingRemoveIdsRef.current = [];
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

      selectedIdsRef.current = next;
      return next;
    });
  }

  function selectAll() {
    if (removing) {
      return;
    }

    setSelectedIds(new Set(itemIds));
  }

  function toggleSelectAll() {
    if (removing) {
      return;
    }

    setSelectedIds((current) => {
      if (itemIds.length > 0 && itemIds.every((id) => current.has(id))) {
        return new Set();
      }

      return new Set(itemIds);
    });
  }

  const toggleSelectAllForIds = useCallback(
    (ids: string[]) => {
      if (removing) {
        return;
      }

      setSelectedIds((current) => {
        const next = resolveHistoryBulkSelectAllToggle(ids, current);
        selectedIdsRef.current = next;
        return next;
      });
    },
    [removing],
  );

  function openConfirm() {
    if (removing) {
      return;
    }

    const ids = [...selectedIdsRef.current].map((id) => String(id));

    if (ids.length === 0) {
      return;
    }

    pendingRemoveIdsRef.current = ids;
    setPendingRemoveIds(ids);
    setConfirmCount(ids.length);
    setConfirmOpen(true);
  }

  function closeConfirm() {
    if (removing) {
      return;
    }

    setConfirmOpen(false);
    setConfirmCount(0);
    pendingRemoveIdsRef.current = [];
    setPendingRemoveIds([]);
  }

  async function confirmRemove(onRemove: (ids: string[]) => Promise<void>) {
    if (removing) {
      return;
    }

    const ids =
      pendingRemoveIdsRef.current.length > 0
        ? [...pendingRemoveIdsRef.current]
        : [...selectedIdsRef.current].map((id) => String(id));

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
      pendingRemoveIdsRef.current = ids;
      setPendingRemoveIds(ids);
      setConfirmOpen(true);
      setConfirmCount(ids.length);
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
    toggleSelectAll,
    toggleSelectAllForIds,
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

function HistorySelectionBackIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const HISTORY_SELECTION_NEUTRAL_BUTTON_CLASS =
  "inline-flex shrink-0 items-center justify-center rounded-lg border border-ftc-border-subtle bg-ftc-surface text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-border-strong disabled:cursor-not-allowed disabled:opacity-50";

const HISTORY_SELECTION_DELETE_BUTTON_CLASS =
  "shrink-0 rounded-lg border-0 bg-[var(--ftc-color-danger)] px-3 text-xs font-semibold uppercase tracking-wide text-ftc-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

const HISTORY_SELECTION_EMBEDDED_CONTROL_HEIGHT_CLASS = "h-[1.625rem] py-0 leading-none";

function historySelectionNeutralButtonClass(embedded: boolean) {
  return embedded
    ? `${HISTORY_SELECTION_NEUTRAL_BUTTON_CLASS} ${HISTORY_SELECTION_EMBEDDED_CONTROL_HEIGHT_CLASS}`
    : `${HISTORY_SELECTION_NEUTRAL_BUTTON_CLASS} py-1.5`;
}

function historySelectionDeleteButtonClass(embedded: boolean) {
  return embedded
    ? `${HISTORY_SELECTION_DELETE_BUTTON_CLASS} ${HISTORY_SELECTION_EMBEDDED_CONTROL_HEIGHT_CLASS}`
    : `${HISTORY_SELECTION_DELETE_BUTTON_CLASS} py-1.5`;
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
  selectAllLabel = "Select all",
  cancelVariant = "label",
  selectAllToggle = false,
  centeredSelectAll = false,
  canToggleAll,
  canDelete,
  selectableCount,
  className = "",
  embedded = false,
}: {
  selectedCount: number;
  allSelected: boolean;
  removing: boolean;
  onCancel: () => void;
  onSelectAll: () => void;
  onRemove: () => void;
  removeLabel?: string;
  removingLabel?: string;
  selectAllLabel?: string;
  cancelVariant?: "label" | "backIcon";
  selectAllToggle?: boolean;
  centeredSelectAll?: boolean;
  /** When set, ALL uses disabled={!canToggleAll} (Events History). */
  canToggleAll?: boolean;
  /** When set, Delete uses disabled={!canDelete} (plus removing). */
  canDelete?: boolean;
  /** @deprecated Prefer canToggleAll for Events History ALL enablement. */
  selectableCount?: number;
  className?: string;
  embedded?: boolean;
}) {
  const outerClassName = embedded
    ? "mb-0 box-border flex h-full w-full min-h-0 flex-nowrap items-center gap-2 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated/60 px-3 py-1.5"
    : "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ftc-border-subtle bg-ftc-bg-elevated/60 px-3 py-2.5";
  const groupClassName = embedded
    ? "flex min-w-0 flex-nowrap items-center gap-2"
    : "flex flex-wrap items-center gap-2";
  const selectAllDisabled =
    canToggleAll !== undefined
      ? !canToggleAll
      : removing ||
        (!selectAllToggle && allSelected) ||
        (selectAllToggle && selectableCount !== undefined && selectableCount === 0);
  const deleteDisabled =
    canDelete !== undefined ? removing || !canDelete : removing || selectedCount === 0;

  function handleSelectAllClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (selectAllDisabled) {
      return;
    }

    onSelectAll();
  }
  const selectAllAriaLabel = allSelected
    ? "Unselect all history events"
    : "Select all history events";

  const backControl =
    cancelVariant === "backIcon" ? (
      <button
        type="button"
        onClick={onCancel}
        disabled={removing}
        aria-label="Exit selection mode"
        className={`${historySelectionNeutralButtonClass(embedded)} px-2.5`}
      >
        <HistorySelectionBackIcon />
      </button>
    ) : (
      <button
        type="button"
        onClick={onCancel}
        disabled={removing}
        className={`${historySelectionNeutralButtonClass(embedded)} px-3 disabled:opacity-50`}
      >
        Cancel
      </button>
    );

  const selectAllControl = (
    <button
      type="button"
      data-testid="events-history-select-all"
      onClick={handleSelectAllClick}
      disabled={selectAllDisabled}
      aria-pressed={selectAllToggle ? allSelected : undefined}
      aria-label={selectAllToggle ? selectAllAriaLabel : undefined}
      className={`${historySelectionNeutralButtonClass(embedded)} px-3`}
    >
      {selectAllLabel}
    </button>
  );

  const deleteControl = (
    <button
      type="button"
      data-testid="events-history-delete"
      onClick={onRemove}
      disabled={deleteDisabled}
      aria-busy={removing}
      className={historySelectionDeleteButtonClass(embedded)}
    >
      {removing ? removingLabel : removeLabel}
    </button>
  );

  if (embedded && centeredSelectAll && cancelVariant === "backIcon") {
    return (
      <div className={`${outerClassName} ${className}`.trim()}>
        <div className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
          <div className="flex shrink-0 items-center justify-start">{backControl}</div>
          <div className="flex min-w-0 items-center justify-center">{selectAllControl}</div>
          <div className="flex shrink-0 items-center justify-end">{deleteControl}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${outerClassName} ${className}`.trim()}>
      <div className={groupClassName}>
        {backControl}
        {selectAllControl}
      </div>
      {deleteControl}
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
    <button
      type="button"
      data-testid="history-remove-confirm-delete"
      onClick={onConfirm}
      className={buttonClassName}
    >
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
