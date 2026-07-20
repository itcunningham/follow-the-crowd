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

const visibleHistoryIds = ["event-a", "event-b"];

function HistorySelectAllHarness({
  onSelectAllInvoked,
}: {
  onSelectAllInvoked: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const allSelected =
    visibleHistoryIds.length > 0 &&
    visibleHistoryIds.every((id) => selectedIds.has(id));

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
      selectableCount: visibleHistoryIds.length,
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

    const button = container.querySelector(
      '[data-testid="events-history-select-all"]',
    ) as HTMLButtonElement | null;
    assert.ok(button, "ALL button should render");
    assert.equal(button.type, "button");
    assert.equal(button.disabled, false);

    await act(async () => {
      button.click();
    });

    assert.equal(invokeCount, 1, "ALL click should invoke handler once");
    const outputAfterSelect = container.querySelector('[data-testid="selected-ids"]');
    assert.equal(outputAfterSelect?.textContent, "event-a,event-b");

    await act(async () => {
      button.click();
    });

    assert.equal(invokeCount, 2, "second ALL click should invoke handler once");
    assert.equal(container.querySelector('[data-testid="selected-ids"]')?.textContent, "");
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
