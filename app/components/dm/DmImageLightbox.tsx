"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DmMediaViewerCloseButton from "@/app/components/dm/DmMediaViewerCloseButton";
import { useDmMediaViewerDismiss } from "@/lib/dm/useDmMediaViewerDismiss";

const VIEWER_TRANSITION_MS = 220;
const SWIPE_NAV_THRESHOLD_PX = 50;
/** Minimum raw movement before a gesture's direction (horizontal vs vertical) is locked in. */
const GESTURE_LOCK_THRESHOLD_PX = 10;
const DOUBLE_TAP_ZOOM_SCALE = 2.5;
const MAX_PINCH_ZOOM_SCALE = 4;
const PAGE_TRACK_TRANSITION_MS = 300;
const PAGE_TRACK_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
/** Matches iOS `UIScrollView`'s own damping constant for edge rubber-banding. */
const RUBBER_BAND_RESISTANCE = 0.55;

type LightboxImage = {
  url: string;
  name: string;
};

function distanceBetweenTouches(touches: React.TouchList): number {
  const first = touches[0];
  const second = touches[1];
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}

/**
 * Diminishing resistance for a drag past the first/last image — asymptotically
 * approaches one viewport width of visual travel no matter how far the finger
 * moves, instead of a hard stop or unbounded 1:1 tracking.
 */
function applyRubberBandResistance(overflowPx: number, viewportWidthPx: number): number {
  if (overflowPx === 0) {
    return 0;
  }

  const sign = overflowPx < 0 ? -1 : 1;
  const magnitude = Math.abs(overflowPx);

  return (
    (sign * (magnitude * viewportWidthPx * RUBBER_BAND_RESISTANCE)) /
    (viewportWidthPx + RUBBER_BAND_RESISTANCE * magnitude)
  );
}

/**
 * Full-group DM image viewer — opens on the tapped image, swipes through
 * every image in the message (including ones hidden behind a "+N" grid
 * tile), and supports pinch/double-tap zoom. Dismissal is the top-right
 * close button only — there is no swipe-to-dismiss gesture. Replaces the
 * old per-tile `window.open` for multi-image messages only; single-image
 * messages keep their existing new-tab behaviour untouched.
 *
 * Paging is a real horizontal track: every image is mounted once as an
 * adjacent slide (never remounted while paging) and the whole track
 * translates together, so the next page is already in position the instant
 * a swipe starts — no floating card, no exposed backdrop, no crossfade swap.
 *
 * Gesture direction is locked once per touch: the first move past
 * `GESTURE_LOCK_THRESHOLD_PX` decides horizontal (page) vs vertical, and
 * that decision holds for the rest of the gesture. A horizontal gesture
 * never moves the image vertically (no drift, no diagonal float); a
 * vertical gesture never pages. Zoomed panning (scale > 1) is a separate
 * mode entirely and is unaffected by this lock.
 */
export default function DmImageLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: LightboxImage[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(1);
  // Pan offset for the current image while zoomed in (scale > 1) only.
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  // Live, uncommitted horizontal page-track offset while not zoomed. No `y`
  // field on purpose — a horizontal (paging) gesture never moves the image
  // vertically, so there is nothing for a vertical component to drive.
  const [dragOffset, setDragOffset] = useState({ x: 0 });

  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    // "none": direction not yet decided. "swipe": locked horizontal, pages
    // between images. "vertical": locked vertical, intentionally inert (no
    // swipe-to-dismiss in this viewer — the close button is the only way to
    // dismiss). "pan": zoomed (scale > 1), free horizontal + vertical pan.
    mode: "none" | "swipe" | "vertical" | "pan";
  } | null>(null);
  const pinchStateRef = useRef<{ startDistance: number; startScale: number } | null>(null);
  const lastTapRef = useRef(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    return () => cancelAnimationFrame(frame);
  }, []);

  const requestClose = useCallback(() => {
    setVisible(false);
    window.setTimeout(onClose, VIEWER_TRANSITION_MS);
  }, [onClose]);

  useDmMediaViewerDismiss(requestClose);

  useEffect(() => {
    function handleArrowKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        goToIndex(index - 1);
      } else if (event.key === "ArrowRight") {
        goToIndex(index + 1);
      }
    }

    window.addEventListener("keydown", handleArrowKeyDown);
    return () => window.removeEventListener("keydown", handleArrowKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function resetZoom() {
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
  }

  function goToIndex(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= images.length) {
      return;
    }
    setIndex(nextIndex);
    resetZoom();
  }

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      pinchStateRef.current = {
        startDistance: distanceBetweenTouches(event.touches),
        startScale: scale,
      };
      dragStateRef.current = null;
      return;
    }

    const touch = event.touches[0];
    dragStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastY: touch.clientY,
      mode: scale > 1 ? "pan" : "none",
    };

    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      setScale((current) => (current > 1 ? 1 : DOUBLE_TAP_ZOOM_SCALE));
      setPanOffset({ x: 0, y: 0 });
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  const handleTouchMove = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (event.touches.length === 2 && pinchStateRef.current) {
        const nextDistance = distanceBetweenTouches(event.touches);
        const ratio = nextDistance / pinchStateRef.current.startDistance;
        const nextScale = Math.min(
          MAX_PINCH_ZOOM_SCALE,
          Math.max(1, pinchStateRef.current.startScale * ratio),
        );
        setScale(nextScale);
        // Pinching back down to 1 hands control back to page-swiping — clear
        // any leftover pan so the image is centred again when it does.
        if (nextScale <= 1) {
          setPanOffset({ x: 0, y: 0 });
        }
        return;
      }

      const drag = dragStateRef.current;
      if (!drag) {
        return;
      }

      const touch = event.touches[0];
      const rawDeltaX = touch.clientX - drag.startX;
      const rawDeltaY = touch.clientY - drag.startY;
      drag.lastX = touch.clientX;
      drag.lastY = touch.clientY;

      if (drag.mode === "pan") {
        setPanOffset({ x: rawDeltaX, y: rawDeltaY });
        return;
      }

      if (drag.mode === "vertical") {
        // Direction already locked to vertical for this gesture — a
        // vertical drag never pages and never moves the image, so there is
        // nothing further to do until the finger lifts.
        return;
      }

      if (drag.mode === "none") {
        if (Math.hypot(rawDeltaX, rawDeltaY) <= GESTURE_LOCK_THRESHOLD_PX) {
          return;
        }

        // Decide once, from whichever axis dominates at the exact moment
        // the lock threshold is crossed, and hold that decision for the
        // rest of the gesture — this is what stops small accidental
        // vertical noise during an otherwise-horizontal drag from ever
        // being able to move the image, and equally stops a genuinely
        // vertical drag from suddenly starting to page mid-gesture.
        drag.mode = Math.abs(rawDeltaX) >= Math.abs(rawDeltaY) ? "swipe" : "vertical";

        if (drag.mode === "vertical") {
          return;
        }
      }

      const atFirstImage = index === 0;
      const atLastImage = index === images.length - 1;
      let pageDeltaX = rawDeltaX;

      if ((atFirstImage && pageDeltaX > 0) || (atLastImage && pageDeltaX < 0)) {
        pageDeltaX = applyRubberBandResistance(pageDeltaX, window.innerWidth);
      }

      setDragOffset({ x: pageDeltaX });
    },
    [scale, index, images.length],
  );

  const handleTouchEnd = useCallback(() => {
    pinchStateRef.current = null;

    const drag = dragStateRef.current;
    dragStateRef.current = null;
    if (!drag) {
      return;
    }

    if (drag.mode === "pan" || drag.mode === "vertical") {
      return;
    }

    if (drag.mode === "swipe") {
      const deltaX = drag.lastX - drag.startX;

      if (Math.abs(deltaX) > SWIPE_NAV_THRESHOLD_PX) {
        goToIndex(deltaX < 0 ? index + 1 : index - 1);
      }
    }

    setDragOffset({ x: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const hasPrevious = index > 0;
  const hasNext = index < images.length - 1;
  const isDragging = dragStateRef.current !== null || pinchStateRef.current !== null;
  const slicePercent = 100 / images.length;
  const trackTransform = `translate3d(calc(${-index * slicePercent}% + ${dragOffset.x}px), 0, 0)`;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${images.length}`}
    >
      <div
        className={`absolute inset-0 bg-black/90 transition-opacity duration-200 ease-out motion-reduce:transition-none ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={requestClose}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4 text-white">
        <span className="text-sm font-medium tabular-nums">
          {index + 1} / {images.length}
        </span>
        <DmMediaViewerCloseButton onClose={requestClose} label="Close photo viewer" />
      </div>

      <div
        className={`absolute inset-0 overflow-hidden [touch-action:none] transition-opacity duration-200 ease-out motion-reduce:transition-none ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          className="flex h-full"
          style={{
            width: `${images.length * 100}%`,
            transform: trackTransform,
            transition: isDragging
              ? "none"
              : `transform ${PAGE_TRACK_TRANSITION_MS}ms ${PAGE_TRACK_EASING}`,
          }}
        >
          {images.map((image, i) => {
            const isCurrent = i === index;

            return (
              <div
                key={image.url}
                className="flex h-full shrink-0 items-center justify-center"
                style={{ width: `${slicePercent}%` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.name}
                  draggable={false}
                  onClick={(event) => event.stopPropagation()}
                  // dvh (not vh) -- vh resolves against the browser's large
                  // viewport even while the address bar/toolbar is showing,
                  // so on mobile Safari/Chrome the image could size itself
                  // taller than what's actually visible and get cut off
                  // behind browser chrome. Matches the dvh convention already
                  // used by every other full-screen mobile sheet/modal here.
                  className="pointer-events-auto max-h-[90dvh] max-w-[92vw] select-none object-contain"
                  style={
                    isCurrent
                      ? {
                          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
                          transition: isDragging ? "none" : "transform 200ms ease-out",
                        }
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      {hasPrevious ? (
        <button
          type="button"
          aria-label="Previous photo"
          onClick={() => goToIndex(index - 1)}
          className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-xl text-white sm:flex"
        >
          ‹
        </button>
      ) : null}

      {hasNext ? (
        <button
          type="button"
          aria-label="Next photo"
          onClick={() => goToIndex(index + 1)}
          className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-xl text-white sm:flex"
        >
          ›
        </button>
      ) : null}
    </div>
  );
}
