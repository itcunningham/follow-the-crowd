// @ts-nocheck
// Proves the state that was being lost between "DM booking card -> View event
// -> Back" is now preserved end-to-end: (1) the restoreScroll marker survives
// the round trip through Event Details' back-href resolution alongside the
// existing bookingRequestId/bookingFocus params, and (2) at runtime, a precise
// saved scroll position (when available) wins over the booking-target-scroll
// fallback, while the fallback still works standalone when no saved position
// exists (e.g. Gigs/Calendar deep links, or an expired/missing session entry).
import assert from "node:assert/strict";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { Window } from "happy-dom";
import { useChatScroll, CHAT_MESSAGE_ID_ATTR } from "../lib/useChatScroll";
import {
  useChatBookingTargetScroll,
  resolveDmBookingTarget,
  DM_BOOKING_FOCUS_SCROLL_ONLY,
} from "../lib/dm/chatBookingTarget";
import { useDmChatScrollRestoreOnProfileReturn } from "../lib/dm/useDmChatScrollRestoreOnProfileReturn";
import {
  buildDmChatScrollRestoreHref,
  DM_CHAT_SCROLL_RESTORE_PARAM,
  hasSavedDmChatScrollPosition,
  saveDmChatScrollPosition,
  consumeDmChatScrollPosition,
  shouldRestoreDmChatScroll,
} from "../lib/dm/dmChatScrollRestoration";
import { buildEventDetailFromDmHref, resolveEventDetailBackHref } from "../lib/events/eventsListNavigation";
import { buildDmThreadHref } from "../lib/dm/threadNavigation";

// ---------------------------------------------------------------------------
// Part 1: pure plumbing — the restoreScroll marker survives the round trip.
// ---------------------------------------------------------------------------

export function testBookingReturnScrollPlumbing(): void {
  const forwardHref = buildEventDetailFromDmHref("event-1", "conv-1", "booking-1", null);
  const forwardParams = new URLSearchParams(forwardHref.split("?")[1]);
  assert.equal(
    forwardParams.get(DM_CHAT_SCROLL_RESTORE_PARAM),
    "1",
    "View event href must mark itself eligible for precise scroll restore",
  );
  assert.equal(forwardParams.get("bookingRequestId"), "booking-1");
  assert.equal(forwardParams.get("conversationId"), "conv-1");
  assert.equal(forwardParams.get("from"), "dm");

  const backHref = resolveEventDetailBackHref(null, {
    from: forwardParams.get("from"),
    conversationId: forwardParams.get("conversationId"),
    bookingRequestId: forwardParams.get("bookingRequestId"),
    restoreScroll: forwardParams.get(DM_CHAT_SCROLL_RESTORE_PARAM),
  });
  const backParams = new URLSearchParams(backHref.split("?")[1]);
  assert.equal(backHref.startsWith("/dm/conv-1"), true, "Back href must return to the originating conversation");
  assert.equal(
    backParams.get(DM_CHAT_SCROLL_RESTORE_PARAM),
    "1",
    "Back href must carry restoreScroll so the DM page attempts a precise restore",
  );
  assert.equal(
    backParams.get("bookingRequestId"),
    "booking-1",
    "Back href must still carry bookingRequestId as a fallback target",
  );
  assert.equal(
    backParams.get("bookingFocus"),
    DM_BOOKING_FOCUS_SCROLL_ONLY,
    "Back href must still carry bookingFocus=scroll-only for the fallback path",
  );
  assert.equal(shouldRestoreDmChatScroll(backParams.get(DM_CHAT_SCROLL_RESTORE_PARAM)), true);

  // Gigs/Calendar deep links never go through buildEventDetailFromDmHref, so
  // they must not pick up restoreScroll — confirms this fix doesn't touch them.
  const gigsBackHref = buildDmThreadHref("conv-2", {
    from: "bookings",
    bookingRequestId: "booking-2",
    bookingFocus: DM_BOOKING_FOCUS_SCROLL_ONLY,
  });
  assert.equal(
    new URLSearchParams(gigsBackHref.split("?")[1]).get(DM_CHAT_SCROLL_RESTORE_PARAM),
    null,
    "Gigs/Calendar-style hrefs built without restoreScroll must not gain it implicitly",
  );
}

// ---------------------------------------------------------------------------
// Part 2: hasSavedDmChatScrollPosition is a true peek (does not consume).
// ---------------------------------------------------------------------------

function installMemorySessionStorage(globalRef: Record<string, unknown>) {
  const store = new Map<string, string>();
  globalRef.sessionStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
  return store;
}

export function testHasSavedDmChatScrollPositionIsNonDestructive(): void {
  const globalRef = globalThis as unknown as Record<string, unknown>;
  const previousWindow = globalRef.window;
  const previousSessionStorage = globalRef.sessionStorage;
  globalRef.window = {};
  installMemorySessionStorage(globalRef);

  try {
    const conversationId = "conv-peek-1";
    assert.equal(hasSavedDmChatScrollPosition(conversationId), false, "nothing saved yet");

    saveDmChatScrollPosition(conversationId, 456);
    assert.equal(hasSavedDmChatScrollPosition(conversationId), true, "peek sees the saved entry");
    assert.equal(hasSavedDmChatScrollPosition(conversationId), true, "peeking twice must not consume it");

    const consumed = consumeDmChatScrollPosition(conversationId);
    assert.equal(consumed, 456, "consume returns the saved value");
    assert.equal(hasSavedDmChatScrollPosition(conversationId), false, "consume must remove the entry");
    assert.equal(consumeDmChatScrollPosition(conversationId), null, "a second consume finds nothing");
  } finally {
    globalRef.window = previousWindow;
    globalRef.sessionStorage = previousSessionStorage;
  }
}

// ---------------------------------------------------------------------------
// Part 3: runtime behaviour — precise restore wins; booking-target is the
// fallback when no saved position exists. Uses the real hooks, happy-dom.
// ---------------------------------------------------------------------------

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
    set: (value: number) => {
      scrollTopValue = value;
      container.dispatchEvent(
        new (container.ownerDocument.defaultView as unknown as { Event: typeof Event }).Event("scroll"),
      );
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

function Harness({
  loading,
  messages,
  conversationId,
  shouldRestoreScroll,
  hasPendingPreciseScrollRestore,
  bookingRequestId,
  apiRef,
}: {
  loading: boolean;
  messages: FakeMessage[];
  conversationId: string;
  shouldRestoreScroll: boolean;
  hasPendingPreciseScrollRestore: boolean;
  bookingRequestId: string | null;
  apiRef: { current: any };
}) {
  // Mirrors the real DmChatPage's gating: a pending precise restore nulls out
  // the booking-target so the two mechanisms never race to set scrollTop.
  const target = bookingRequestId
    ? resolveDmBookingTarget((key) => (key === "bookingRequestId" ? bookingRequestId : null))
    : { scrollTargetBookingRequestId: null, highlightTargetBookingRequestId: null };
  const scrollTargetBookingRequestId = hasPendingPreciseScrollRestore
    ? null
    : target.scrollTargetBookingRequestId;
  const highlightTargetBookingRequestId = hasPendingPreciseScrollRestore
    ? null
    : target.highlightTargetBookingRequestId;

  const suppressAutoScrollRef = React.useRef(
    Boolean(scrollTargetBookingRequestId) || hasPendingPreciseScrollRestore,
  );
  const messageIds = messages.map((m) => m.id);
  const lastMessage = messages[messages.length - 1] ?? null;

  const chatScrollApi = useChatScroll({
    loading,
    messageIds,
    lastMessageSenderId: lastMessage?.user_id ?? null,
    lastMessageIsFromCurrentUser: false,
    currentUserId: "current-user",
    suppressAutoScrollRef,
    freshOpenToken: null,
  });

  useDmChatScrollRestoreOnProfileReturn({
    conversationId,
    loading,
    scrollRef: chatScrollApi.scrollRef,
    suppressAutoScrollRef,
    shouldRestoreScroll,
  });

  useChatBookingTargetScroll({
    scrollTargetBookingRequestId,
    highlightTargetBookingRequestId,
    loading,
    messages,
    scrollRef: chatScrollApi.scrollRef,
    highlightBookingFocus: () => {},
    suppressAutoScrollRef,
  });

  apiRef.current = chatScrollApi;

  return React.createElement(
    "div",
    { ref: chatScrollApi.scrollRef },
    loading
      ? "loading"
      : React.createElement(
          "ul",
          {},
          messages.map((m) => React.createElement("li", { key: m.id, [CHAT_MESSAGE_ID_ATTR]: m.id }, m.text)),
        ),
  );
}

function makeMessages(bookingId: string): FakeMessage[] {
  return [
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `img-${i}`,
      text: `image message ${i}`,
      user_id: "them",
      created_at: `2026-01-01T00:${String(i).padStart(2, "0")}:00Z`,
    })),
    {
      id: "booking-msg",
      text: `BOOKING REQUEST\nBooking ID: ${bookingId}\nEvent: Test\nVenue: V\nDate: D\nSet time: S\nOffer type: Fixed offer\nRate: $100\nNotes: None\nStatus: Pending`,
      user_id: "them",
      created_at: "2026-01-01T00:08:00Z",
    },
    { id: "after-1", text: "after 1", user_id: "them", created_at: "2026-01-01T00:09:00Z" },
    { id: "after-2", text: "after 2", user_id: "them", created_at: "2026-01-01T00:10:00Z" },
  ];
}

export async function runDmBookingReturnScrollRuntimeTest(): Promise<void> {
  const window = new Window();
  const globalRef = globalThis as unknown as Record<string, unknown>;
  const previousWindow = globalRef.window;
  const previousDocument = globalRef.document;
  const previousResizeObserver = globalRef.ResizeObserver;
  const previousRaf = globalRef.requestAnimationFrame;
  const previousCaf = globalRef.cancelAnimationFrame;
  const previousEvent = globalRef.Event;
  const previousCSS = globalRef.CSS;
  const previousSessionStorage = globalRef.sessionStorage;

  globalRef.IS_REACT_ACT_ENVIRONMENT = true;
  globalRef.window = window;
  globalRef.document = window.document;
  const doubles = installDoubles(window, globalRef);
  installMemorySessionStorage(globalRef);

  const container = window.document.createElement("div");
  window.document.body.appendChild(container);
  let root: Root | null = createRoot(container as unknown as HTMLElement);
  const apiRef: { current: any } = { current: null };
  const bookingId = "booking-return-1";
  const conversationId = "conv-return-1";
  const messages = makeMessages(bookingId);

  try {
    // --- Case A: a precise saved position exists -> it wins, booking-target
    // fallback must not also fire and override it. ---
    saveDmChatScrollPosition(conversationId, 77);
    const hasPendingA =
      shouldRestoreDmChatScroll("1") && hasSavedDmChatScrollPosition(conversationId);
    assert.equal(hasPendingA, true, "sanity: a saved position exists before mount");

    await act(async () => {
      root?.render(
        React.createElement(Harness, {
          loading: true,
          messages: [],
          conversationId,
          shouldRestoreScroll: true,
          hasPendingPreciseScrollRestore: hasPendingA,
          bookingRequestId: bookingId,
          apiRef,
        }),
      );
    });
    const scrollerA = apiRef.current!.scrollRef.current as HTMLElement;
    const metricsA = mockScrollMetrics(scrollerA, { scrollHeight: 1200, clientHeight: 600 });

    await act(async () => {
      root?.render(
        React.createElement(Harness, {
          loading: false,
          messages,
          conversationId,
          shouldRestoreScroll: true,
          hasPendingPreciseScrollRestore: hasPendingA,
          bookingRequestId: bookingId,
          apiRef,
        }),
      );
    });
    mockMessageRects(scrollerA, new Map(messages.map((m) => [m.id, 100])));
    doubles.flushAllRaf();

    assert.equal(
      metricsA.getScrollTop(),
      77,
      "precise saved position must win over the booking-target-scroll fallback",
    );
    assert.equal(
      hasSavedDmChatScrollPosition(conversationId),
      false,
      "the saved position must be consumed (removed) once restored",
    );

    await act(async () => {
      root?.unmount();
    });
    container.remove();

    // --- Case B: no saved position (e.g. expired/cleared) -> the existing
    // booking-target-scroll mechanism must still work standalone. ---
    root = createRoot((() => {
      const c = window.document.createElement("div");
      window.document.body.appendChild(c);
      return c;
    })() as unknown as HTMLElement);
    const conversationIdB = "conv-return-2";
    const hasPendingB =
      shouldRestoreDmChatScroll("1") && hasSavedDmChatScrollPosition(conversationIdB);
    assert.equal(hasPendingB, false, "sanity: nothing saved for this conversation");

    await act(async () => {
      root?.render(
        React.createElement(Harness, {
          loading: true,
          messages: [],
          conversationId: conversationIdB,
          shouldRestoreScroll: true,
          hasPendingPreciseScrollRestore: hasPendingB,
          bookingRequestId: bookingId,
          apiRef,
        }),
      );
    });
    const scrollerB = apiRef.current!.scrollRef.current as HTMLElement;
    const metricsB = mockScrollMetrics(scrollerB, { scrollHeight: 1200, clientHeight: 600 });

    await act(async () => {
      root?.render(
        React.createElement(Harness, {
          loading: false,
          messages,
          conversationId: conversationIdB,
          shouldRestoreScroll: true,
          hasPendingPreciseScrollRestore: hasPendingB,
          bookingRequestId: bookingId,
          apiRef,
        }),
      );
    });
    mockMessageRects(scrollerB, new Map(messages.map((m) => [m.id, 100])));
    doubles.flushAllRaf();

    assert.notEqual(
      metricsB.getScrollTop(),
      0,
      "without a saved position, the booking-target fallback must still scroll (not stay at 0)",
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
    globalRef.CSS = previousCSS;
    globalRef.sessionStorage = previousSessionStorage;
  }
}

export async function runDmBookingReturnScrollTests(): Promise<void> {
  testBookingReturnScrollPlumbing();
  testHasSavedDmChatScrollPositionIsNonDestructive();
  await runDmBookingReturnScrollRuntimeTest();
}
