// @ts-nocheck
// Real-device QA (round 8) found that tapping a push notification's
// ?message=<id> deep link opened the right DM, but the chat still landed at
// the bottom instead of on the target message -- even though a prior
// source-level trace and an independent QA pass both concluded the
// suppression logic was correct. It wasn't: useChatMessageTargetScroll (and
// the pre-existing useChatBookingTargetScroll it copied the pattern from)
// write container.scrollTop directly, bypassing useChatScroll's internal
// pinnedToBottomRef bookkeeping entirely. That ref is what the
// ResizeObserver "keep pinned to bottom" effect actually keys off -- left
// stale `true` from mount, any layout change after suppression drops (an
// attachment image finishing decode is the concrete, real example in this
// codebase; see lib/dm/dmImageAttachmentDimensions.ts) snaps the scroll
// straight back to the bottom, wiping out the deliberate target scroll.
//
// This exercises the REAL hooks against a happy-dom container with a fake,
// manually-triggerable ResizeObserver -- reusing the harness pattern from
// scripts/test-dm-booking-return-scroll.ts -- specifically to catch this
// class of bug, which no purely source-text regex assertion could ever
// catch (the prior round's tests all passed while this was still broken).
import assert from "node:assert/strict";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { Window } from "happy-dom";
import { useChatScroll, CHAT_MESSAGE_ID_ATTR } from "../lib/useChatScroll";
import { useChatMessageTargetScroll } from "../lib/chat/messageTargetScroll";

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
  globalRef.CSS = { escape: (value: string) => value };

  return {
    flushAllRaf: (maxWaves = 20) => {
      for (let wave = 0; wave < maxWaves && queue.length > 0; wave += 1) {
        const batch = queue;
        queue = [];
        batch.forEach((entry) => entry.callback(0));
      }
    },
    // Simulates a real layout change firing every observed element's
    // ResizeObserver callback -- e.g. an attachment image's onLoad handler
    // swapping its guessed square placeholder box for its real aspect ratio.
    triggerAllResizeCallbacks: () => {
      liveResizeCallbacks.forEach((callback) => callback());
    },
  };
}

function mockScrollMetrics(container: HTMLElement, initial: { scrollHeight: number; clientHeight: number }) {
  let scrollHeightValue = initial.scrollHeight;
  const clientHeightValue = initial.clientHeight;
  let scrollTopValue = 0;
  Object.defineProperty(container, "scrollHeight", { configurable: true, get: () => scrollHeightValue });
  Object.defineProperty(container, "clientHeight", { configurable: true, get: () => clientHeightValue });
  Object.defineProperty(container, "scrollTop", {
    configurable: true,
    get: () => scrollTopValue,
    // A real browser's 'scroll' event for a direct `el.scrollTop = x` write
    // is dispatched asynchronously, not synchronously within the setter --
    // that gap is exactly what the real bug lived in (see this file's header
    // comment), so faithfully NOT firing it here matters: a synchronous
    // dispatch would let useChatScroll's native-scroll handler self-correct
    // pinnedToBottomRef before either the bug or the fix could be observed,
    // silently making this test pass regardless of which one is present.
    set: (value: number) => {
      scrollTopValue = value;
    },
  });
  (container as unknown as { scrollTo: (opts: { top: number }) => void }).scrollTo = ({ top }) => {
    scrollTopValue = Math.max(0, top);
    container.dispatchEvent(
      new (container.ownerDocument.defaultView as unknown as { Event: typeof Event }).Event("scroll"),
    );
  };
  return {
    getScrollTop: () => scrollTopValue,
    getMaxScrollTop: () => Math.max(0, scrollHeightValue - clientHeightValue),
  };
}

function mockMessageRects(container: HTMLElement, heightById: Map<string, number>) {
  let cursor = 0;
  const tops = new Map<string, number>();
  for (const [id, height] of heightById) {
    tops.set(id, cursor);
    cursor += height;
  }
  (container.getBoundingClientRect as unknown as () => DOMRect) = () =>
    ({ top: 0, bottom: 600, left: 0, right: 400, width: 400, height: 600, x: 0, y: 0, toJSON() {} }) as DOMRect;
  container.querySelectorAll(`[${CHAT_MESSAGE_ID_ATTR}]`).forEach((el) => {
    const id = el.getAttribute(CHAT_MESSAGE_ID_ATTR)!;
    const top = tops.get(id) ?? 0;
    const height = heightById.get(id) ?? 0;
    (el.getBoundingClientRect as unknown as () => DOMRect) = () =>
      ({
        top: top - (container as unknown as { scrollTop: number }).scrollTop,
        bottom: top - (container as unknown as { scrollTop: number }).scrollTop + height,
        left: 0,
        right: 400,
        width: 400,
        height,
        x: 0,
        y: top,
        toJSON() {},
      }) as DOMRect;
  });
}

type FakeMessage = { id: string; text: string; user_id: string; created_at: string };

function makeMessages(): FakeMessage[] {
  // 20 older messages, all above the fold of a 600px-tall viewport at
  // 80px/message -- the exact "older unread messages higher in the
  // conversation" shape the real-device report described.
  return Array.from({ length: 20 }, (_, i) => ({
    id: `msg-${i}`,
    text: `message ${i}`,
    user_id: "them",
    created_at: `2026-01-01T00:${String(i).padStart(2, "0")}:00Z`,
  }));
}

function Harness({
  loading,
  messages,
  targetMessageId,
  apiRef,
}: {
  loading: boolean;
  messages: FakeMessage[];
  targetMessageId: string | null;
  apiRef: { current: any };
}) {
  const messageIds = messages.map((m) => m.id);
  const lastMessage = messages[messages.length - 1] ?? null;
  const suppressAutoScrollRef = React.useRef(Boolean(targetMessageId));

  const chatScrollApi = useChatScroll({
    loading,
    messageIds,
    lastMessageSenderId: lastMessage?.user_id ?? null,
    lastMessageIsFromCurrentUser: false,
    currentUserId: "current-user",
    suppressAutoScrollRef,
  });

  useChatMessageTargetScroll({
    targetMessageId,
    loading,
    scrollRef: chatScrollApi.scrollRef,
    onTargetFound: () => {},
    onTargetMissing: chatScrollApi.scrollToBottomSmooth,
    suppressAutoScrollRef,
    pinnedToBottomRef: chatScrollApi.pinnedToBottomRef,
  });

  apiRef.current = chatScrollApi;

  return React.createElement(
    "div",
    { ref: chatScrollApi.scrollRef },
    loading
      ? "loading"
      : React.createElement(
          "ul",
          { "data-chat-content-root": "" },
          messages.map((m) => React.createElement("li", { key: m.id, [CHAT_MESSAGE_ID_ATTR]: m.id }, m.text)),
        ),
  );
}

async function withHarness(
  run: (env: {
    root: Root;
    container: HTMLElement;
    doubles: ReturnType<typeof installDoubles>;
    apiRef: { current: any };
    render: (props: { loading: boolean; messages: FakeMessage[]; targetMessageId: string | null }) => Promise<void>;
  }) => Promise<void>,
) {
  const window = new Window();
  const globalRef = globalThis as unknown as Record<string, unknown>;
  const saved = {
    window: globalRef.window,
    document: globalRef.document,
    ResizeObserver: globalRef.ResizeObserver,
    requestAnimationFrame: globalRef.requestAnimationFrame,
    cancelAnimationFrame: globalRef.cancelAnimationFrame,
    Event: globalRef.Event,
    CSS: globalRef.CSS,
  };

  globalRef.IS_REACT_ACT_ENVIRONMENT = true;
  globalRef.window = window;
  globalRef.document = window.document;
  const doubles = installDoubles(window, globalRef);

  const containerEl = window.document.createElement("div");
  window.document.body.appendChild(containerEl);
  const root = createRoot(containerEl as unknown as HTMLElement);
  const apiRef: { current: any } = { current: null };

  const render = async (props: { loading: boolean; messages: FakeMessage[]; targetMessageId: string | null }) => {
    await act(async () => {
      root.render(React.createElement(Harness, { ...props, apiRef }));
    });
  };

  try {
    await run({ root, container: containerEl as unknown as HTMLElement, doubles, apiRef, render });
  } finally {
    await act(async () => {
      root.unmount();
    });
    containerEl.remove();
    globalRef.window = saved.window;
    globalRef.document = saved.document;
    globalRef.ResizeObserver = saved.ResizeObserver;
    globalRef.requestAnimationFrame = saved.requestAnimationFrame;
    globalRef.cancelAnimationFrame = saved.cancelAnimationFrame;
    globalRef.Event = saved.Event;
    globalRef.CSS = saved.CSS;
  }
}

/**
 * The core regression: land on the target, THEN simulate a post-scroll
 * layout change (an attachment image decoding), and prove the chat does NOT
 * snap back to the bottom. Pre-fix, this assertion fails.
 */
export async function testTargetScrollSurvivesLayoutChangeAfterRelease(): Promise<void> {
  await withHarness(async ({ render, apiRef, doubles }) => {
    const messages = makeMessages();
    // msg-10 of 20 (80px each, 1600px total, 600px viewport): centering it
    // lands scrollTop around 540 -- comfortably away from both 0 (unscrolled)
    // and 1000 (the bottom), so either failure mode is distinguishable.
    const targetMessageId = "msg-10";

    await render({ loading: true, messages: [], targetMessageId });
    const scroller = apiRef.current!.scrollRef.current as HTMLElement;
    const metrics = mockScrollMetrics(scroller, { scrollHeight: 1600, clientHeight: 600 });

    await render({ loading: false, messages, targetMessageId });
    mockMessageRects(scroller, new Map(messages.map((m) => [m.id, 80])));
    doubles.flushAllRaf();

    const scrollTopAfterTarget = metrics.getScrollTop();
    assert.notEqual(
      scrollTopAfterTarget,
      metrics.getMaxScrollTop(),
      "landing on a target near the top must not leave the chat at the bottom",
    );
    assert.notEqual(scrollTopAfterTarget, 0, "the target must actually be centered, not left at scrollTop 0");

    // Simulate an attachment image finishing decode (or any other post-scroll
    // layout change) -- this is exactly what the real-device bug report hit.
    // The observer callback itself only schedules the actual scrollToBottom
    // via requestAnimationFrame, so it must be flushed too.
    doubles.triggerAllResizeCallbacks();
    doubles.flushAllRaf();

    assert.equal(
      metrics.getScrollTop(),
      scrollTopAfterTarget,
      "a layout change after the target scroll completes must not snap the chat back to the bottom",
    );
  });
}

/** No target id at all -- normal chat open must still land at the bottom. */
export async function testNoTargetStillLandsAtBottom(): Promise<void> {
  await withHarness(async ({ render, apiRef, doubles }) => {
    const messages = makeMessages();

    await render({ loading: true, messages: [], targetMessageId: null });
    const scroller = apiRef.current!.scrollRef.current as HTMLElement;
    const metrics = mockScrollMetrics(scroller, { scrollHeight: 1600, clientHeight: 600 });

    await render({ loading: false, messages, targetMessageId: null });
    mockMessageRects(scroller, new Map(messages.map((m) => [m.id, 80])));
    doubles.flushAllRaf();

    assert.equal(
      metrics.getScrollTop(),
      metrics.getMaxScrollTop(),
      "normal chat open with no target must still land at the bottom",
    );
  });
}

/** A target id that doesn't match any rendered message -- must fall back to the bottom, not stay at 0. */
export async function testMissingTargetFallsBackToBottom(): Promise<void> {
  await withHarness(async ({ render, apiRef, doubles }) => {
    const messages = makeMessages();
    const targetMessageId = "does-not-exist";

    await render({ loading: true, messages: [], targetMessageId });
    const scroller = apiRef.current!.scrollRef.current as HTMLElement;
    const metrics = mockScrollMetrics(scroller, { scrollHeight: 1600, clientHeight: 600 });

    await render({ loading: false, messages, targetMessageId });
    mockMessageRects(scroller, new Map(messages.map((m) => [m.id, 80])));

    // The retry loop is real setTimeout-based (12 attempts, 50ms apart) --
    // flushAllRaf alone won't advance it, so give it real wall-clock time to
    // exhaust and fall through to onTargetMissing.
    doubles.flushAllRaf();
    await new Promise((resolve) => setTimeout(resolve, 700));
    doubles.flushAllRaf();

    assert.equal(
      metrics.getScrollTop(),
      metrics.getMaxScrollTop(),
      "a target that can't be found must fall back to a normal bottom-scroll, not leave the chat at scrollTop 0",
    );
  });
}

export async function runMessageTargetScrollPriorityTests(): Promise<void> {
  await testTargetScrollSurvivesLayoutChangeAfterRelease();
  await testNoTargetStillLandsAtBottom();
  await testMissingTargetFallsBackToBottom();
}
