// @ts-nocheck
// Exercises the real useChatScroll hook (not a reimplementation) through the
// inbox -> conversation -> inbox -> same conversation lifecycle to prove the
// reopen-lands-on-newest behaviour, and to prove the underlying gap it closes
// is real (a control run without the fresh-open signal must stay stuck).
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
    /** Flushes queued rAF callbacks in waves until none remain (bounded). */
    flushAllRaf: (maxWaves = 8) => {
      for (let wave = 0; wave < maxWaves && queue.length > 0; wave += 1) {
        const batch = queue;
        queue = [];
        batch.forEach((entry) => entry.callback(0));
      }
    },
  };
}

/** Gives the test full control over scrollHeight/clientHeight/scrollTop, which happy-dom doesn't lay out for real. */
function mockScrollMetrics(container: HTMLElement, initial: { scrollHeight: number; clientHeight: number }) {
  let scrollHeightValue = initial.scrollHeight;
  const clientHeightValue = initial.clientHeight;
  let scrollTopValue = 0;

  Object.defineProperty(container, "scrollHeight", { configurable: true, get: () => scrollHeightValue });
  Object.defineProperty(container, "clientHeight", { configurable: true, get: () => clientHeightValue });
  Object.defineProperty(container, "scrollTop", {
    configurable: true,
    get: () => scrollTopValue,
    set: (value: number) => {
      scrollTopValue = value;
      container.dispatchEvent(new (container.ownerDocument.defaultView as unknown as { Event: typeof Event }).Event("scroll"));
    },
  });
  (container as unknown as { scrollTo: (opts: { top: number }) => void }).scrollTo = ({ top }) => {
    scrollTopValue = Math.max(0, top);
    container.dispatchEvent(new (container.ownerDocument.defaultView as unknown as { Event: typeof Event }).Event("scroll"));
  };

  return {
    setScrollHeight: (value: number) => {
      scrollHeightValue = value;
    },
    setScrollTopDirect: (value: number) => {
      scrollTopValue = value;
      container.dispatchEvent(new (container.ownerDocument.defaultView as unknown as { Event: typeof Event }).Event("scroll"));
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

/**
 * Reproduces: DM inbox -> open conversation -> return to inbox -> reopen the
 * *same* conversation, without unmounting the surrounding page (the scenario
 * where a component instance can persist across an away-and-back navigation).
 *
 * Two assertions:
 * 1. Control (no fresh-open signal): a reused instance whose user had
 *    scrolled up before leaving stays stuck where it was on reopen — this is
 *    the real gap `freshOpenToken` exists to close. If this ever stops
 *    failing, the underlying assumption motivating the fix no longer holds
 *    and this test should be revisited.
 * 2. Main case (with the fresh-open signal, matching current DmChatPage
 *    wiring): the same reused-instance reopen correctly lands on the newest
 *    message.
 */
export async function runDmChatReopenScrollTest(): Promise<void> {
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
  const longConversation = messagesOfLength(20);

  try {
    // --- Control: reopen WITHOUT a fresh-open signal must stay stuck. ---
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
    const metrics = mockScrollMetrics(scroller, { scrollHeight: 2000, clientHeight: 600 });

    await act(async () => {
      root?.render(
        React.createElement(ChatScrollHarness, {
          loading: false,
          messages: longConversation,
          suppressAutoScrollRef,
          apiRef,
        }),
      );
    });
    doubles.flushAllRaf();
    assert.equal(metrics.getScrollTop(), metrics.getMaxScrollTop(), "first open must land on the newest message");

    await act(async () => {
      metrics.setScrollTopDirect(0);
    });

    // Reopen with the SAME instance and NO fresh-open signal (control).
    await act(async () => {
      root?.render(
        React.createElement(ChatScrollHarness, {
          loading: false,
          messages: longConversation,
          suppressAutoScrollRef,
          apiRef,
        }),
      );
    });
    doubles.flushAllRaf();
    assert.equal(
      metrics.getScrollTop(),
      0,
      "control: reopen without a fresh-open signal is expected to stay stuck (proves the gap freshOpenToken closes is real)",
    );

    // --- Main case: reopen WITH the fresh-open signal (current DmChatPage
    // wiring) must land back on the newest message. ---
    await act(async () => {
      metrics.setScrollTopDirect(0);
    });

    await act(async () => {
      root?.render(
        React.createElement(ChatScrollHarness, {
          loading: false,
          messages: longConversation,
          freshOpenToken: "reopen-token-1",
          suppressAutoScrollRef,
          apiRef,
        }),
      );
    });
    doubles.flushAllRaf();
    assert.equal(
      metrics.getScrollTop(),
      metrics.getMaxScrollTop(),
      "reopen with a fresh-open signal must land on the newest message",
    );

    // --- Repeat reopen (a second away-and-back cycle) must also work. ---
    await act(async () => {
      metrics.setScrollTopDirect(0);
    });
    await act(async () => {
      root?.render(
        React.createElement(ChatScrollHarness, {
          loading: false,
          messages: longConversation,
          freshOpenToken: "reopen-token-2",
          suppressAutoScrollRef,
          apiRef,
        }),
      );
    });
    doubles.flushAllRaf();
    assert.equal(
      metrics.getScrollTop(),
      metrics.getMaxScrollTop(),
      "a second repeat reopen must also land on the newest message",
    );

    // --- Image-heavy variant: short list that only overflows once an
    // attachment finishes loading after the reopen's own scroll already ran. ---
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
    const imageScroller = apiRef.current!.scrollRef.current as HTMLElement;
    const imageMetrics = mockScrollMetrics(imageScroller, { scrollHeight: 300, clientHeight: 600 });
    const shortConversation = messagesOfLength(2);

    await act(async () => {
      root?.render(
        React.createElement(ChatScrollHarness, {
          loading: false,
          messages: shortConversation,
          suppressAutoScrollRef,
          apiRef,
        }),
      );
    });
    doubles.flushAllRaf();
    assert.equal(imageMetrics.getScrollTop(), 0, "image-heavy first open: fits before images decode");

    await act(async () => {
      root?.render(
        React.createElement(ChatScrollHarness, {
          loading: false,
          messages: shortConversation,
          freshOpenToken: "reopen-token-image",
          suppressAutoScrollRef,
          apiRef,
        }),
      );
    });
    doubles.flushAllRaf();
    imageMetrics.setScrollHeight(900);
    doubles.triggerResize();
    doubles.flushAllRaf();
    assert.equal(
      imageMetrics.getScrollTop(),
      imageMetrics.getMaxScrollTop(),
      "image-heavy reopen must land on newest once the attachment grows the layout",
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
