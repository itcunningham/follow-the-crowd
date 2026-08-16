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
    /** Content settling after first paint -- e.g. images decoding above the
     *  target and growing the list. */
    setScrollHeight: (value: number) => {
      scrollHeightValue = value;
    },
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


/**
 * Round 10, the reported symptom: the target IS reached, then "a moment
 * later" the viewport jumps to the bottom. The first target scroll landing
 * correctly proves nothing -- what matters is whether the position survives
 * everything that settles afterwards. These exercise the full sequence:
 *
 *   A. target scroll succeeds
 *   B. late effects fire (layout changes, a message append, and an outright
 *      scroll-to-bottom request from a sibling flow)
 *   C. the viewport is STILL on the target
 */
export async function testTargetSurvivesRepeatedLateLayoutChanges(): Promise<void> {
  await withHarness(async ({ render, apiRef, doubles }) => {
    const messages = makeMessages();
    const targetMessageId = "msg-10";

    await render({ loading: true, messages: [], targetMessageId });
    const scroller = apiRef.current!.scrollRef.current as HTMLElement;
    const metrics = mockScrollMetrics(scroller, { scrollHeight: 1600, clientHeight: 600 });

    await render({ loading: false, messages, targetMessageId });
    mockMessageRects(scroller, new Map(messages.map((m) => [m.id, 80])));
    doubles.flushAllRaf();

    const onTarget = metrics.getScrollTop();
    assert.notEqual(onTarget, metrics.getMaxScrollTop(), "phase A: must not already be at the bottom");
    assert.notEqual(onTarget, 0, "phase A: target must actually be centered");

    // Phase B: several successive layout settles, the shape of multiple
    // attachment images decoding one after another.
    for (let wave = 0; wave < 4; wave += 1) {
      doubles.triggerAllResizeCallbacks();
      doubles.flushAllRaf();
    }

    assert.equal(
      metrics.getScrollTop(),
      onTarget,
      "phase C: repeated late layout changes must not drift the viewport off the target",
    );
  });
}

/**
 * The decisive one. While the target is settling, a sibling flow explicitly
 * asks to scroll to the bottom -- which is what every late effect on the real
 * page ultimately does (ResizeObserver re-pin, append effect, initial-scroll
 * effect). It must be a no-op until the target hands control back.
 */
export async function testBottomScrollIsSuppressedWhileTargetSettles(): Promise<void> {
  await withHarness(async ({ render, apiRef, doubles }) => {
    const messages = makeMessages();
    const targetMessageId = "msg-10";

    await render({ loading: true, messages: [], targetMessageId });
    const scroller = apiRef.current!.scrollRef.current as HTMLElement;
    const metrics = mockScrollMetrics(scroller, { scrollHeight: 1600, clientHeight: 600 });

    await render({ loading: false, messages, targetMessageId });
    mockMessageRects(scroller, new Map(messages.map((m) => [m.id, 80])));
    doubles.flushAllRaf();

    const onTarget = metrics.getScrollTop();

    await act(async () => {
      apiRef.current!.scrollToBottomSmooth();
    });
    doubles.flushAllRaf();

    assert.equal(
      metrics.getScrollTop(),
      onTarget,
      "a scroll-to-bottom requested while the target is still settling must be ignored",
    );

    // Once the settle window closes, normal behaviour must come back --
    // the guard is a short lease on the viewport, not a permanent lock.
    // Must exceed MESSAGE_TARGET_SETTLE_QUIET_MS (1800ms).
    await new Promise((resolve) => setTimeout(resolve, 2200));
    doubles.flushAllRaf();

    await act(async () => {
      apiRef.current!.scrollToBottomSmooth();
    });
    doubles.flushAllRaf();

    assert.equal(
      metrics.getScrollTop(),
      metrics.getMaxScrollTop(),
      "after the target settles, scroll-to-bottom must work normally again -- otherwise the guard has " +
        "permanently disabled auto-scroll for the rest of the page's life",
    );
  });
}

/** A late layout change arriving AFTER the settle window must behave normally
 *  again: the reader is parked in history, so it must still not yank them. */
export async function testTargetHoldsAfterSettleWindowCloses(): Promise<void> {
  await withHarness(async ({ render, apiRef, doubles }) => {
    const messages = makeMessages();
    const targetMessageId = "msg-10";

    await render({ loading: true, messages: [], targetMessageId });
    const scroller = apiRef.current!.scrollRef.current as HTMLElement;
    const metrics = mockScrollMetrics(scroller, { scrollHeight: 1600, clientHeight: 600 });

    await render({ loading: false, messages, targetMessageId });
    mockMessageRects(scroller, new Map(messages.map((m) => [m.id, 80])));
    doubles.flushAllRaf();

    const onTarget = metrics.getScrollTop();

    // Must exceed MESSAGE_TARGET_SETTLE_QUIET_MS (1800ms) so the lease has
    // genuinely ended -- otherwise this asserts nothing about post-lease state.
    await new Promise((resolve) => setTimeout(resolve, 2200));
    doubles.flushAllRaf();

    doubles.triggerAllResizeCallbacks();
    doubles.flushAllRaf();

    assert.equal(
      metrics.getScrollTop(),
      onTarget,
      "once suppression is handed back, pinnedToBottomRef must still say 'not pinned' so a reader " +
        "parked in history is left alone",
    );
  });
}

/** A message arriving while the reader sits on a deep-linked target must not
 *  drag them to the bottom -- it should behave like reading history. */
export async function testIncomingMessageDoesNotStealTheTarget(): Promise<void> {
  await withHarness(async ({ render, apiRef, doubles }) => {
    const messages = makeMessages();
    const targetMessageId = "msg-10";

    await render({ loading: true, messages: [], targetMessageId });
    const scroller = apiRef.current!.scrollRef.current as HTMLElement;
    const metrics = mockScrollMetrics(scroller, { scrollHeight: 1600, clientHeight: 600 });

    await render({ loading: false, messages, targetMessageId });
    mockMessageRects(scroller, new Map(messages.map((m) => [m.id, 80])));
    doubles.flushAllRaf();

    const onTarget = metrics.getScrollTop();

    const withIncoming = [
      ...messages,
      { id: "msg-late", text: "late arrival", user_id: "them", created_at: "2026-01-01T01:00:00Z" },
    ];
    await render({ loading: false, messages: withIncoming, targetMessageId });
    mockMessageRects(scroller, new Map(withIncoming.map((m) => [m.id, 80])));
    doubles.triggerAllResizeCallbacks();
    doubles.flushAllRaf();

    assert.equal(
      metrics.getScrollTop(),
      onTarget,
      "a message arriving after a deep link must not pull the reader off the targeted message",
    );
  });
}


/**
 * Round 12: the drift that survived the first lease. Real Production tracing
 * at 320px showed content settling in bursts -- ~2.06s, then a 1.46s GAP,
 * then ~3.62/3.72/3.83s, then ~4.6-5.3s. The original 400ms quiet window
 * expired inside that gap, so every later change ran unguarded, and because
 * the container is `[overflow-anchor:none]`, content growing above the target
 * slides it down the viewport without moving scrollTop. Measured drift: 163px
 * (crew @320) and 83px (DM image @320).
 *
 * This asserts the target's VERTICAL OFFSET stays put across a late change
 * that lands after the old window would have closed -- not merely that the
 * target is "still visible", which the pre-fix code also satisfied.
 */
export async function testTargetHoldsThroughLateSettleBurst(): Promise<void> {
  await withHarness(async ({ render, apiRef, doubles }) => {
    const messages = makeMessages();
    const targetMessageId = "msg-10";
    const heights = new Map(messages.map((m) => [m.id, 80]));

    await render({ loading: true, messages: [], targetMessageId });
    const scroller = apiRef.current!.scrollRef.current as HTMLElement;
    const metrics = mockScrollMetrics(scroller, { scrollHeight: 1600, clientHeight: 600 });

    await render({ loading: false, messages, targetMessageId });
    mockMessageRects(scroller, heights);
    doubles.flushAllRaf();

    const targetEl = scroller.querySelector(
      `[${CHAT_MESSAGE_ID_ATTR}="${targetMessageId}"]`,
    ) as HTMLElement;
    const landedRectTop = targetEl.getBoundingClientRect().top;
    assert.notEqual(metrics.getScrollTop(), metrics.getMaxScrollTop(), "phase A: not at the bottom");

    // Phase B: content ABOVE the target grows -- ten 80px messages become
    // 120px as their images decode. This is the real mechanism: scrollTop does
    // not move (the container is [overflow-anchor:none]), so the target slides
    // DOWN the viewport by 400px unless something corrects for it.
    //
    // Timed past the OLD 400ms quiet window, which is precisely when the
    // real-device drift landed.
    await new Promise((resolve) => setTimeout(resolve, 900));
    for (let i = 0; i < 10; i += 1) heights.set(`msg-${i}`, 120);
    metrics.setScrollHeight(2000);
    mockMessageRects(scroller, heights);
    doubles.triggerAllResizeCallbacks();
    doubles.flushAllRaf();

    const afterRectTop = targetEl.getBoundingClientRect().top;
    assert.ok(
      Math.abs(afterRectTop - landedRectTop) <= 4,
      `phase C: the target must stay put when content above it grows. Landed at rectTop ` +
        `${landedRectTop}, ended at ${afterRectTop} (drift ${Math.round(afterRectTop - landedRectTop)}px). ` +
        `This is the exact downward drift real-device QA reported.`,
    );
  });
}

/** The lease must still be a lease. After the hard budget, control returns. */
export async function testLeaseStillEndsAfterItsBudget(): Promise<void> {
  await withHarness(async ({ render, apiRef, doubles }) => {
    const messages = makeMessages();
    await render({ loading: true, messages: [], targetMessageId: "msg-10" });
    const scroller = apiRef.current!.scrollRef.current as HTMLElement;
    const metrics = mockScrollMetrics(scroller, { scrollHeight: 1600, clientHeight: 600 });
    await render({ loading: false, messages, targetMessageId: "msg-10" });
    mockMessageRects(scroller, new Map(messages.map((m) => [m.id, 80])));
    doubles.flushAllRaf();

    // Quiet for longer than the quiet window -> lease ends -> normal resumes.
    await new Promise((resolve) => setTimeout(resolve, 2200));
    doubles.flushAllRaf();

    await act(async () => {
      apiRef.current!.scrollToBottomSmooth();
    });
    doubles.flushAllRaf();

    assert.equal(
      metrics.getScrollTop(),
      metrics.getMaxScrollTop(),
      "once the quiet window elapses the lease must release, or auto-scroll is disabled for good",
    );
  });
}

/** User takeover must still cancel the (now longer) lease immediately. */
export async function testUserTakeoverCancelsTheLongerLease(): Promise<void> {
  await withHarness(async ({ render, apiRef, doubles }) => {
    const messages = makeMessages();
    await render({ loading: true, messages: [], targetMessageId: "msg-10" });
    const scroller = apiRef.current!.scrollRef.current as HTMLElement;
    const metrics = mockScrollMetrics(scroller, { scrollHeight: 1600, clientHeight: 600 });
    await render({ loading: false, messages, targetMessageId: "msg-10" });
    mockMessageRects(scroller, new Map(messages.map((m) => [m.id, 80])));
    doubles.flushAllRaf();

    // Reader takes over well inside the lease.
    await act(async () => {
      scroller.dispatchEvent(
        new (scroller.ownerDocument.defaultView as unknown as { Event: typeof Event }).Event(
          "pointerdown",
        ),
      );
    });
    doubles.flushAllRaf();

    await act(async () => {
      apiRef.current!.scrollToBottomSmooth();
    });
    doubles.flushAllRaf();

    assert.equal(
      metrics.getScrollTop(),
      metrics.getMaxScrollTop(),
      "a real user gesture must end the lease immediately, however long its budget is",
    );
  });
}

/**
 * Round 16: tapping Accept on a booking request card scrolled the DM straight
 * to the bottom. Accepting inserts a "booking accepted" DM message SERVER-side
 * under the responder's own user id, so it arrives through the messages
 * realtime INSERT handler with isFromCurrentUser === true --
 * captureScrollBeforeIncomingInsert then pinned to bottom unconditionally,
 * and the append effect's own-message branch scrolled there.
 *
 * A: booking card sits above later messages. B: the user acts on it.
 * C/D: a message attributed to that same user is appended. E: the viewport
 * must still hold the card.
 */
async function actOnBookingCardWhileReadingHistory(fromCurrentUser: boolean) {
  let heldRectTop = 0;
  let endedAtBottom = false;

  await withHarness(async ({ render, apiRef, doubles }) => {
    const messages = makeMessages();
    const bookingId = "msg-4"; // well above the fold

    await render({ loading: true, messages: [], targetMessageId: null });
    const scroller = apiRef.current!.scrollRef.current as HTMLElement;
    const metrics = mockScrollMetrics(scroller, { scrollHeight: 1600, clientHeight: 600 });

    await render({ loading: false, messages, targetMessageId: null });
    mockMessageRects(scroller, new Map(messages.map((m) => [m.id, 80])));
    doubles.flushAllRaf();

    // A: the reader scrolls up to the booking card and parks there.
    await act(async () => {
      (scroller as unknown as { scrollTo: (o: { top: number }) => void }).scrollTo({ top: 320 });
    });
    doubles.flushAllRaf();

    const card = scroller.querySelector(
      `[${CHAT_MESSAGE_ID_ATTR}="${bookingId}"]`,
    ) as HTMLElement;
    const beforeRectTop = card.getBoundingClientRect().top;

    // B + C: they accept; the server inserts a DM message under their own id,
    // which reaches the client through the realtime INSERT path.
    await act(async () => {
      apiRef.current!.captureScrollBeforeIncomingInsert(fromCurrentUser);
    });

    const withAccepted = [
      ...messages,
      {
        id: "msg-accepted",
        text: "Booking accepted",
        user_id: fromCurrentUser ? "current-user" : "them",
        created_at: "2026-01-01T02:00:00Z",
      },
    ];
    metrics.setScrollHeight(1680);
    await render({ loading: false, messages: withAccepted, targetMessageId: null });
    mockMessageRects(scroller, new Map(withAccepted.map((m) => [m.id, 80])));
    doubles.triggerAllResizeCallbacks();
    doubles.flushAllRaf();

    heldRectTop = card.getBoundingClientRect().top - beforeRectTop;
    endedAtBottom = Math.abs(metrics.getMaxScrollTop() - metrics.getScrollTop()) < 40;
  });

  return { drift: heldRectTop, endedAtBottom };
}

/** Accept: the booking card must stay put. */
export async function testAcceptingABookingKeepsTheCardAnchored(): Promise<void> {
  const { drift, endedAtBottom } = await actOnBookingCardWhileReadingHistory(true);
  assert.equal(
    endedAtBottom,
    false,
    "accepting a booking from a card up in the history must not jump the DM to the bottom",
  );
  assert.ok(
    Math.abs(drift) <= 4,
    `the booking card must stay visually put while acting on it (drifted ${drift}px)`,
  );
}

/** Decline uses the same update path, so it must behave identically. */
export async function testDecliningABookingKeepsTheCardAnchored(): Promise<void> {
  const { drift, endedAtBottom } = await actOnBookingCardWhileReadingHistory(true);
  assert.equal(endedAtBottom, false, "declining must not jump to the bottom either");
  assert.ok(Math.abs(drift) <= 4, `card drifted ${drift}px on decline`);
}

/** The other half of the contract: a genuinely-pinned reader still follows. */
export async function testOwnMessageStillFollowsWhenPinnedToBottom(): Promise<void> {
  await withHarness(async ({ render, apiRef, doubles }) => {
    const messages = makeMessages();
    await render({ loading: true, messages: [], targetMessageId: null });
    const scroller = apiRef.current!.scrollRef.current as HTMLElement;
    const metrics = mockScrollMetrics(scroller, { scrollHeight: 1600, clientHeight: 600 });
    await render({ loading: false, messages, targetMessageId: null });
    mockMessageRects(scroller, new Map(messages.map((m) => [m.id, 80])));
    doubles.flushAllRaf();

    // Sitting at the bottom, as after a normal manual open.
    assert.equal(metrics.getScrollTop(), metrics.getMaxScrollTop());

    await act(async () => {
      apiRef.current!.captureScrollBeforeIncomingInsert(true);
    });
    const withNew = [
      ...messages,
      { id: "msg-new", text: "mine", user_id: "current-user", created_at: "2026-01-01T02:00:00Z" },
    ];
    metrics.setScrollHeight(1680);
    await render({ loading: false, messages: withNew, targetMessageId: null });
    mockMessageRects(scroller, new Map(withNew.map((m) => [m.id, 80])));
    doubles.flushAllRaf();

    assert.equal(
      metrics.getScrollTop(),
      metrics.getMaxScrollTop(),
      "a reader already at the bottom must still follow their own new message down",
    );
  });
}

export async function runMessageTargetScrollPriorityTests(): Promise<void> {
  await testTargetScrollSurvivesLayoutChangeAfterRelease();
  await testTargetSurvivesRepeatedLateLayoutChanges();
  await testBottomScrollIsSuppressedWhileTargetSettles();
  await testTargetHoldsAfterSettleWindowCloses();
  await testIncomingMessageDoesNotStealTheTarget();
  await testTargetHoldsThroughLateSettleBurst();
  await testLeaseStillEndsAfterItsBudget();
  await testUserTakeoverCancelsTheLongerLease();
  await testAcceptingABookingKeepsTheCardAnchored();
  await testDecliningABookingKeepsTheCardAnchored();
  await testOwnMessageStillFollowsWhenPinnedToBottom();
  await testNoTargetStillLandsAtBottom();
  await testMissingTargetFallsBackToBottom();
}
