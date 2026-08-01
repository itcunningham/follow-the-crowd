"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DmMediaViewerCloseButton from "@/app/components/dm/DmMediaViewerCloseButton";
import { useDmMediaViewerDismiss } from "@/lib/dm/useDmMediaViewerDismiss";

const VIEWER_TRANSITION_MS = 220;
const SWIPE_DISMISS_THRESHOLD_PX = 90;
const SWIPE_NAV_THRESHOLD_PX = 50;
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
 * tile), and supports pinch/double-tap zoom + swipe-down dismiss. Replaces
 * the old per-tile `window.open` for multi-image messages only; single-image
 * messages keep their existing new-tab behaviour untouched.
 *
 * Paging is a real horizontal track: every image is mounted once as an
 * adjacent slide (never remounted while paging) and the whole track
 * translates together, so the next page is already in position the instant
 * a swipe starts — no floating card, no exposed backdrop, no crossfade swap.
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
  // Live, uncommitted drag while not zoomed: `x` moves the page track,
  // `y` moves only the current slide's image for the dismiss gesture.
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    mode: "none" | "swipe" | "pan";
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

      if (drag.mode === "none" && Math.hypot(rawDeltaX, rawDeltaY) > 10) {
        drag.mode = "swipe";
      }

      if (drag.mode === "swipe") {
        const atFirstImage = index === 0;
        const atLastImage = index === images.length - 1;
        let pageDeltaX = rawDeltaX;

        if ((atFirstImage && pageDeltaX > 0) || (atLastImage && pageDeltaX < 0)) {
          pageDeltaX = applyRubberBandResistance(pageDeltaX, window.innerWidth);
        }

        setDragOffset({ x: pageDeltaX, y: rawDeltaY * 0.4 });
      }
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

    if (drag.mode === "pan") {
      return;
    }

    if (drag.mode === "swipe") {
      const deltaX = drag.lastX - drag.startX;
      const deltaY = drag.lastY - drag.startY;

      if (deltaY > SWIPE_DISMISS_THRESHOLD_PX && Math.abs(deltaX) < 60) {
        requestClose();
      } else if (Math.abs(deltaX) > SWIPE_NAV_THRESHOLD_PX) {
        goToIndex(deltaX < 0 ? index + 1 : index - 1);
      }
    }

    setDragOffset({ x: 0, y: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, requestClose]);

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
                  className="pointer-events-auto max-h-[90vh] max-w-[92vw] select-none object-contain"
                  style={
                    isCurrent
                      ? {
                          transform: `translate(${panOffset.x}px, ${panOffset.y + dragOffset.y}px) scale(${scale})`,
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
