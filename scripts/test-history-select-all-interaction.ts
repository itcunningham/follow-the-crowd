// @ts-nocheck
import assert from "node:assert/strict";
import React, { useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { Window } from "happy-dom";
import {
  HistorySelectionToolbar,
  resolveHistoryBulkSelectAllToggle,
} from "../app/components/history/HistoryBulkManage";

const visibleHistoryIds = ["event-a", "event-b", "event-c"];

function HistorySelectAllHarness({
  onSelectAllInvoked,
}: {
  onSelectAllInvoked: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const allSelected =
    visibleHistoryIds.length > 0 &&
    visibleHistoryIds.every((id) => selectedIds.has(id));
  const canToggleAll = visibleHistoryIds.length > 0;
  const canDelete = selectedIds.size > 0;

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(HistorySelectionToolbar, {
      embedded: true,
      selectAllToggle: true,
      centeredSelectAll: true,
      cancelVariant: "backIcon",
      selectedCount: selectedIds.size,
      allSelected,
      removing: false,
      onCancel: () => undefined,
      onSelectAll: () => {
        onSelectAllInvoked();
        setSelectedIds((current) =>
          resolveHistoryBulkSelectAllToggle(visibleHistoryIds, current),
        );
      },
      onRemove: () => undefined,
      canToggleAll,
      canDelete,
      selectAllLabel: "ALL",
      removeLabel: "Delete",
    }),
    React.createElement(
      "output",
      { "data-testid": "selected-ids" },
      [...selectedIds].sort().join(","),
    ),
  );
}

export async function runHistorySelectAllInteractionTest() {
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
  let invokeCount = 0;

  try {
    await act(async () => {
      root?.render(
        React.createElement(HistorySelectAllHarness, {
          onSelectAllInvoked: () => {
            invokeCount += 1;
          },
        }),
      );
    });

    const allButton = container.querySelector(
      '[data-testid="events-history-select-all"]',
    ) as HTMLButtonElement | null;
    const deleteButton = container.querySelector(
      '[data-testid="events-history-delete"]',
    ) as HTMLButtonElement | null;
    assert.ok(allButton, "ALL button should render");
    assert.ok(deleteButton, "Delete button should render");
    assert.equal(allButton.type, "button");
    assert.equal(allButton.disabled, false, "ALL enabled with visible cards and no selection");
    assert.equal(deleteButton.disabled, true, "Delete disabled with no selection");

    await act(async () => {
      allButton.click();
    });

    assert.equal(invokeCount, 1, "ALL click should invoke handler once");
    assert.equal(
      container.querySelector('[data-testid="selected-ids"]')?.textContent,
      "event-a,event-b,event-c",
    );
    assert.equal(deleteButton.disabled, false, "Delete enabled after ALL selects every card");
    assert.equal(allButton.disabled, false, "ALL stays enabled after selecting all");

    await act(async () => {
      allButton.click();
    });

    assert.equal(invokeCount, 2, "second ALL click should invoke handler once");
    assert.equal(container.querySelector('[data-testid="selected-ids"]')?.textContent, "");
    assert.equal(deleteButton.disabled, true, "Delete disabled after ALL clears selection");
    assert.equal(allButton.disabled, false, "ALL stays enabled with visible cards");
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
