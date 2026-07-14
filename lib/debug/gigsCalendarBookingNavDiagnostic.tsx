"use client";

import { useSyncExternalStore } from "react";

export type GigsCalendarBookingNavDiagnosticSnapshot = {
  updatedAt: string;
  eventName: string;
  bookingStatus: string;
  pointerdownReceived: boolean;
  clickReceived: boolean;
  bookingId: string;
  rawEventId: string | null;
  rawEventIdType: string;
  resolvedHref: string;
  navigationKind: string;
  routerPushCalled: boolean;
  pathnameBefore: string;
  pathnameAfterPush: string;
  pathname500ms: string;
  topElementAtTap: string;
  buttonPointerEvents: string;
  buttonZIndex: string;
  ancestorPointerBlockers: string;
  isPressed: boolean;
};

function createEmptySnapshot(): GigsCalendarBookingNavDiagnosticSnapshot {
  return {
    updatedAt: "",
    eventName: "",
    bookingStatus: "",
    pointerdownReceived: false,
    clickReceived: false,
    bookingId: "",
    rawEventId: null,
    rawEventIdType: "null",
    resolvedHref: "",
    navigationKind: "",
    routerPushCalled: false,
    pathnameBefore: "",
    pathnameAfterPush: "",
    pathname500ms: "",
    topElementAtTap: "",
    buttonPointerEvents: "",
    buttonZIndex: "",
    ancestorPointerBlockers: "",
    isPressed: false,
  };
}

let snapshot: GigsCalendarBookingNavDiagnosticSnapshot | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function publishGigsCalendarBookingNavDiagnostic(
  patch: Partial<GigsCalendarBookingNavDiagnosticSnapshot>,
) {
  snapshot = {
    ...(snapshot ?? createEmptySnapshot()),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  emit();
  console.info("[gigs-calendar-booking-nav-debug]", snapshot);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

export function useGigsCalendarBookingNavDiagnostic() {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

function formatDomTarget(element: Element | null): string {
  if (!element) {
    return "(none)";
  }

  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const className = element.className;
  const firstClass =
    typeof className === "string" && className.trim()
      ? `.${className.trim().split(/\s+/)[0]}`
      : "";

  return `${tag}${id}${firstClass}`;
}

export function inspectGigsCalendarBookingNavPointerContext(
  button: HTMLButtonElement,
  clientX: number,
  clientY: number,
): Pick<
  GigsCalendarBookingNavDiagnosticSnapshot,
  "topElementAtTap" | "buttonPointerEvents" | "buttonZIndex" | "ancestorPointerBlockers"
> {
  const buttonStyle = window.getComputedStyle(button);
  const topElement = document.elementFromPoint(clientX, clientY);
  const blockers: string[] = [];
  let parent: HTMLElement | null = button.parentElement;
  let depth = 0;

  while (parent && depth < 10) {
    const style = window.getComputedStyle(parent);

    if (
      style.pointerEvents === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity) === 0
    ) {
      blockers.push(
        `${formatDomTarget(parent)} pe=${style.pointerEvents} vis=${style.visibility} op=${style.opacity}`,
      );
    }

    parent = parent.parentElement;
    depth += 1;
  }

  return {
    topElementAtTap: formatDomTarget(topElement),
    buttonPointerEvents: buttonStyle.pointerEvents,
    buttonZIndex: buttonStyle.zIndex,
    ancestorPointerBlockers: blockers.length > 0 ? blockers.join(" | ") : "(none)",
  };
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-1">
      <span className="text-ftc-text-muted">{label}</span>
      <span className="break-all text-ftc-text">{value || "—"}</span>
    </div>
  );
}

function DiagnosticFlag({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-semibold ${
        active
          ? "bg-[var(--ftc-color-success)]/20 text-[var(--ftc-color-success)]"
          : "bg-ftc-surface text-ftc-text-muted"
      }`}
    >
      {label}: {active ? "yes" : "no"}
    </span>
  );
}

export function GigsCalendarBookingNavDebugPanel() {
  const diagnostic = useGigsCalendarBookingNavDiagnostic();

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 left-2 right-2 z-[70] max-h-[45dvh] overflow-y-auto rounded-lg border border-amber-500/50 bg-ftc-bg-elevated/95 p-2 text-[10px] leading-relaxed shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-sm md:hidden"
    >
      <p className="mb-1 font-semibold uppercase tracking-wide text-amber-300">
        Gigs booking nav debug (temporary)
      </p>

      {!diagnostic ? (
        <p className="text-ftc-text-muted">Waiting for booked/pending card tap…</p>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap gap-1">
            <DiagnosticFlag label="pointerdown" active={diagnostic.pointerdownReceived} />
            <DiagnosticFlag label="click" active={diagnostic.clickReceived} />
            <DiagnosticFlag label="router.push" active={diagnostic.routerPushCalled} />
            <DiagnosticFlag label="pressed" active={diagnostic.isPressed} />
          </div>

          <DiagnosticRow label="event" value={diagnostic.eventName} />
          <DiagnosticRow label="status" value={diagnostic.bookingStatus} />
          <DiagnosticRow label="bookingId" value={diagnostic.bookingId} />
          <DiagnosticRow
            label="raw event_id"
            value={
              diagnostic.rawEventId == null
                ? `null (${diagnostic.rawEventIdType})`
                : `${diagnostic.rawEventId} (${diagnostic.rawEventIdType})`
            }
          />
          <DiagnosticRow label="nav kind" value={diagnostic.navigationKind} />
          <DiagnosticRow label="resolved href" value={diagnostic.resolvedHref} />
          <DiagnosticRow label="path before" value={diagnostic.pathnameBefore} />
          <DiagnosticRow label="path after push" value={diagnostic.pathnameAfterPush} />
          <DiagnosticRow label="path +500ms" value={diagnostic.pathname500ms} />
          <DiagnosticRow label="top at tap" value={diagnostic.topElementAtTap} />
          <DiagnosticRow label="btn pe" value={diagnostic.buttonPointerEvents} />
          <DiagnosticRow label="btn z-index" value={diagnostic.buttonZIndex} />
          <DiagnosticRow label="blockers" value={diagnostic.ancestorPointerBlockers} />
          <DiagnosticRow label="updated" value={diagnostic.updatedAt} />
        </>
      )}
    </div>
  );
}
