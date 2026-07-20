// @ts-nocheck
import assert from "node:assert/strict";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { Window } from "happy-dom";
import {
  HistoryRemoveConfirmDialog,
  useHistoryBulkManage,
} from "../app/components/history/HistoryBulkManage";

function HistoryRemoveConfirmHarness({
  onRemove,
  bulkRef,
}: {
  onRemove: (ids: string[]) => Promise<void>;
  bulkRef: { current: ReturnType<typeof useHistoryBulkManage> | null };
}) {
  const bulk = useHistoryBulkManage([{ id: "event-a" }, { id: "event-b" }]);
  bulkRef.current = bulk;

  return React.createElement(HistoryRemoveConfirmDialog, {
    open: bulk.confirmOpen,
    count: bulk.confirmCount,
    loading: bulk.removing,
    title: "Delete selected history?",
    cancelLabel: "Cancel",
    confirmLabel: "Delete",
    confirmLoadingLabel: "Deleting...",
    onCancel: bulk.closeConfirm,
    onConfirm: () => {
      void bulk.confirmRemove(onRemove);
    },
  });
}

export async function runHistoryRemoveConfirmInteractionTest() {
  const window = new Window();
  const globalRef = globalThis as Record<string, unknown>;
  const previousWindow = globalRef.window;
  const previousDocument = globalRef.document;

  globalRef.IS_REACT_ACT_ENVIRONMENT = true;
  globalRef.window = window;
  globalRef.document = window.document;

  const container = window.document.createElement("div");
  window.document.body.appendChild(container);
  let root: Root | null = createRoot(container as unknown as HTMLElement);
  const bulkRef = { current: null as ReturnType<typeof useHistoryBulkManage> | null };
  let removeCalls = 0;
  let removedIds: string[] = [];

  const onRemove = async (ids: string[]) => {
    removeCalls += 1;
    removedIds = ids;
  };

  try {
    await act(async () => {
      root?.render(
        React.createElement(HistoryRemoveConfirmHarness, {
          onRemove,
          bulkRef,
        }),
      );
    });

    await act(async () => {
      bulkRef.current?.enterSelectionMode();
    });
    await act(async () => {
      bulkRef.current?.toggleItem("event-a");
    });
    await act(async () => {
      bulkRef.current?.openConfirm();
    });

    const confirmButton = window.document.querySelector(
      '[data-testid="history-remove-confirm-delete"]',
    ) as HTMLButtonElement | null;
    assert.ok(confirmButton, "modal Delete button should render");
    assert.equal(confirmButton.disabled, false);

    await act(async () => {
      await bulkRef.current!.confirmRemove(onRemove);
    });

    assert.equal(removeCalls, 1, "confirm handler should fire once");
    assert.deepEqual(removedIds, ["event-a"], "selected ids passed to removal handler");

    let resolveRemove: () => void = () => undefined;
    const slowRemove = () =>
      new Promise<void>((resolve) => {
        resolveRemove = resolve;
      });

    await act(async () => {
      bulkRef.current?.enterSelectionMode();
      bulkRef.current?.toggleItem("event-a");
      bulkRef.current?.openConfirm();
    });

    let inFlight: Promise<void> | undefined;
    await act(async () => {
      inFlight = bulkRef.current!.confirmRemove(slowRemove);
    });

    bulkRef.current!.confirmRemove(slowRemove);
    resolveRemove();
    await act(async () => {
      await inFlight;
    });

    assert.equal(removeCalls, 1, "duplicate confirm while removing should not run twice");
  } finally {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container.remove();
    globalRef.window = previousWindow;
    globalRef.document = previousDocument;
  }
}

export async function runHistoryRemoveConfirmFailureTest() {
  const window = new Window();
  const globalRef = globalThis as Record<string, unknown>;
  const previousWindow = globalRef.window;
  const previousDocument = globalRef.document;

  globalRef.IS_REACT_ACT_ENVIRONMENT = true;
  globalRef.window = window;
  globalRef.document = window.document;

  const container = window.document.createElement("div");
  window.document.body.appendChild(container);
  let root: Root | null = createRoot(container as unknown as HTMLElement);
  const bulkRef = { current: null as ReturnType<typeof useHistoryBulkManage> | null };
  let removeCalls = 0;

  const onRemove = async () => {
    removeCalls += 1;
    throw new Error("Could not remove selected events from history.");
  };

  try {
    await act(async () => {
      root?.render(
        React.createElement(HistoryRemoveConfirmHarness, {
          onRemove,
          bulkRef,
        }),
      );
    });

    await act(async () => {
      bulkRef.current?.enterSelectionMode();
      bulkRef.current?.toggleItem("event-a");
      bulkRef.current?.openConfirm();
    });

    await act(async () => {
      await bulkRef.current!.confirmRemove(onRemove);
    });

    assert.equal(removeCalls, 1, "failed removal still invokes handler once");
    assert.equal(bulkRef.current?.confirmOpen, true, "confirm stays open after failure");
    assert.equal(bulkRef.current?.removing, false, "removing resets after failure");

    const confirmButton = window.document.querySelector(
      '[data-testid="history-remove-confirm-delete"]',
    ) as HTMLButtonElement;
    assert.equal(confirmButton.disabled, false, "confirm Delete is clickable again");
  } finally {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container.remove();
    globalRef.window = previousWindow;
    globalRef.document = previousDocument;
  }
}
