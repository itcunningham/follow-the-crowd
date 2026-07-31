// @ts-nocheck
// Reproduces the actual root cause of "reopen lands mid-conversation" on
// image-heavy DM conversations, found by reading useChatScroll.ts directly
// (not inferred from timing observations in an automated browser, which
// throttles ResizeObserver/rAF for backgrounded tabs and cannot be trusted
// for this).
//
// The real browser dispatches the 'scroll' event resulting from a
// programmatic `container.scrollTo(...)` ASYNCHRONOUSLY — never in the same
// task. Growing `scrollHeight` (e.g. an attachment <img> finishing decode)
// never itself fires a 'scroll' event, since scrollTop doesn't move on its
// own when content is appended below the fold. So the sequence:
//
//   1. scrollToBottom() sets scrollTop to the CURRENT max and schedules a
//      'scroll' event (not yet dispatched).
//   2. An image decodes, growing scrollHeight — scrollTop is now stale.
//   3. The scheduled 'scroll' event FINALLY arrives. handleScroll() computes
//      isNearBottom() against the NEW (larger) max using the STALE scrollTop
//      — sees a big gap, concludes the user scrolled away, and clears
//      pinnedToBottomRef.
//   4. The ResizeObserver watching the growth fires too, but its own
//      correction checks the SAME pinnedToBottomRef — which was just (wrongly)
//      cleared by the stale scroll echo in step 3 — so it skips correcting.
//
// Net result: the view is permanently stuck short of the true bottom, even
// though nothing the user did caused it. This test drives the real hook
// through exactly that interleaving.
import assert from "node:assert/strict";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { Window } from "happy-dom";
import { useChatScroll } from "../lib/useChatScroll";

type FakeMessage = { id: string; user_id: string; created_at: string };

function messagesOfLength(count: number): FakeMessage[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `m${index}`,
    user_id: "them",
    created_at: `2026-01-01T00:${String(index).padStart(2, "0")}:00Z`,
  }));
}

function installDoubles(windowRef: Window, globalRef: Record<string, unknown>) {
  const liveResizeCallbacks = new Set<() => void>();

  class FakeResizeObserver {
    private readonly callback: () => void;
    constructor(callback: () => void) {
      this.callback = callback;
    }
    observe() {
      liveResizeCallbacks.add(this.callback);
    }
    unobserve() {}
    disconnect() {
      liveResizeCallbacks.delete(this.callback);
    }
  }

  let queue: Array<{ id: number; callback: FrameRequestCallback }> = [];
  let nextId = 1;
  const raf = (callback: FrameRequestCallback) => {
    const id = nextId++;
    queue.push({ id, callback });
    return id;
  };
  const caf = (id: number) => {
    queue = queue.filter((entry) => entry.id !== id);
  };

  (windowRef as unknown as Record<string, unknown>).ResizeObserver = FakeResizeObserver;
  (windowRef as unknown as Record<string, unknown>).requestAnimationFrame = raf;
  (windowRef as unknown as Record<string, unknown>).cancelAnimationFrame = caf;
  globalRef.ResizeObserver = FakeResizeObserver;
  globalRef.requestAnimationFrame = raf;
  globalRef.cancelAnimationFrame = caf;
  globalRef.Event = windowRef.Event;

  return {
    triggerResize: () => {
      [...liveResizeCallbacks].forEach((callback) => callback());
    },
    flushAllRaf: (maxWaves = 8) => {
      for (let wave = 0; wave < maxWaves && queue.length > 0; wave += 1) {
        const batch = queue;
        queue = [];
        batch.forEach((entry) => entry.callback(0));
      }
    },
  };
}

/**
 * Like the shared harness's scroll-metrics mock, but models the real
 * browser's async dispatch of the 'scroll' event that results from a
 * programmatic `scrollTo()` — the one behaviour the race in useChatScroll.ts
 * depends on. `scrollTo()` here does NOT dispatch immediately; the test
 * calls `flushPendingScrollEvent()` to deliver it whenever it chooses,
 * letting growth happen in between deterministically instead of racing a
 * real clock.
 */
function mockAsyncScrollMetrics(
  container: HTMLElement,
  initial: { scrollHeight: number; clientHeight: number },
) {
  let scrollHeightValue = initial.scrollHeight;
  const clientHeightValue = initial.clientHeight;
  let scrollTopValue = 0;
  let pendingScrollEvent = false;
  const EventCtor = (container.ownerDocument.defaultView as unknown as { Event: typeof Event }).Event;

  Object.defineProperty(container, "scrollHeight", { configurable: true, get: () => scrollHeightValue });
  Object.defineProperty(container, "clientHeight", { configurable: true, get: () => clientHeightValue });
  Object.defineProperty(container, "scrollTop", {
    configurable: true,
    get: () => scrollTopValue,
    set: (value: number) => {
      // Direct assignment models a real, already-processed user scroll: the
      // browser has both moved scrollTop and is about to deliver the event.
      scrollTopValue = value;
      container.dispatchEvent(new EventCtor("scroll"));
    },
  });
  (container as unknown as { scrollTo: (opts: { top: number }) => void }).scrollTo = ({ top }) => {
    scrollTopValue = Math.max(0, top);
    pendingScrollEvent = true;
  };

  return {
    setScrollHeight: (value: number) => {
      // Real browsers never fire 'scroll' just because scrollHeight grew.
      scrollHeightValue = value;
    },
    flushPendingScrollEvent: () => {
      if (!pendingScrollEvent) {
        return;
      }
      pendingScrollEvent = false;
      container.dispatchEvent(new EventCtor("scroll"));
    },
    getScrollTop: () => scrollTopValue,
    getMaxScrollTop: () => Math.max(0, scrollHeightValue - clientHeightValue),
  };
}

function ChatScrollHarness({
  loading,
  messages,
  freshOpenToken,
  suppressAutoScrollRef,
  apiRef,
}: {
  loading: boolean;
  messages: FakeMessage[];
  freshOpenToken?: string;
  suppressAutoScrollRef: { current: boolean };
  apiRef: { current: ReturnType<typeof useChatScroll> | null };
}) {
  const messageIds = messages.map((message) => message.id);
  const lastMessage = messages[messages.length - 1] ?? null;

  const api = useChatScroll({
    loading,
    messageIds,
    lastMessageSenderId: lastMessage?.user_id ?? null,
    lastMessageIsFromCurrentUser: false,
    currentUserId: "current-user",
    suppressAutoScrollRef,
    freshOpenToken,
  });
  apiRef.current = api;

  return React.createElement(
    "div",
    { ref: api.scrollRef },
    loading
      ? "loading"
      : React.createElement(
          "ul",
          { "data-chat-content-root": "true" },
          messages.map((message) =>
            React.createElement("li", { key: message.id, "data-chat-message-id": message.id }, message.id),
          ),
        ),
  );
}

export async function runDmChatGrowthScrollRaceTest(): Promise<void> {
  const window = new Window();
  const globalRef = globalThis as unknown as Record<string, unknown>;
  const previousWindow = globalRef.window;
  const previousDocument = globalRef.document;
  const previousResizeObserver = globalRef.ResizeObserver;
  const previousRaf = globalRef.requestAnimationFrame;
  const previousCaf = globalRef.cancelAnimationFrame;
  const previousEvent = globalRef.Event;

  globalRef.IS_REACT_ACT_ENVIRONMENT = true;
  globalRef.window = window;
  globalRef.document = window.document;
  const doubles = installDoubles(window, globalRef);

  const container = window.document.createElement("div");
  window.document.body.appendChild(container);
  let root: Root | null = createRoot(container as unknown as HTMLElement);
  const apiRef: { current: ReturnType<typeof useChatScroll> | null } = { current: null };
  const suppressAutoScrollRef = { current: false };
  const conversation = messagesOfLength(5);

  try {
    await act(async () => {
      root?.render(
        React.createElement(ChatScrollHarness, {
          loading: true,
          messages: [],
          suppressAutoScrollRef,
          apiRef,
        }),
      );
    });

    const scroller = apiRef.current!.scrollRef.current as HTMLElement;
    const metrics = mockAsyncScrollMetrics(scroller, { scrollHeight: 1000, clientHeight: 600 });

    // Reopen: fresh-open token forces the initial scroll-to-bottom path,
    // matching a real DM reopen.
    await act(async () => {
      root?.render(
        React.createElement(ChatScrollHarness, {
          loading: false,
          messages: conversation,
          freshOpenToken: "reopen-token",
          suppressAutoScrollRef,
          apiRef,
        }),
      );
    });
    doubles.flushAllRaf();

    assert.equal(metrics.getScrollTop(), 400, "initial scroll-to-bottom should target the pre-growth max (1000-600)");

    // An attachment <img> finishes decoding, growing the content root well
    // past the near-bottom threshold — before the browser has delivered the
    // 'scroll' event resulting from the scrollTo() above.
    metrics.setScrollHeight(1600);

    // The delayed 'scroll' event for our OWN earlier scrollTo() now arrives,
    // after the growth. This must not be misread as the user scrolling away.
    metrics.flushPendingScrollEvent();

    // The ResizeObserver watching the content root also fires for the same
    // growth; its own correction depends on pinnedToBottomRef not having
    // been wrongly cleared by the stale scroll echo above.
    doubles.triggerResize();
    doubles.flushAllRaf();

    assert.equal(
      metrics.getScrollTop(),
      metrics.getMaxScrollTop(),
      "a stale echo of the app's own scrollTo(), arriving after content grew past the near-bottom threshold, must not " +
        "strand the view short of the true bottom — the fix must distinguish 'content grew out from under a pinned " +
        "scrollTop' from a genuine user scroll before deciding to un-pin",
    );
  } finally {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container.remove();
    globalRef.window = previousWindow;
    globalRef.document = previousDocument;
    globalRef.ResizeObserver = previousResizeObserver;
    globalRef.requestAnimationFrame = previousRaf;
    globalRef.cancelAnimationFrame = previousCaf;
    globalRef.Event = previousEvent;
  }
}
