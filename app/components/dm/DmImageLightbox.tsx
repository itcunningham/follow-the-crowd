"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DmMediaViewerCloseButton from "@/app/components/dm/DmMediaViewerCloseButton";
import { useDmMediaViewerDismiss } from "@/lib/dm/useDmMediaViewerDismiss";

const VIEWER_TRANSITION_MS = 220;
const SWIPE_DISMISS_THRESHOLD_PX = 90;
const SWIPE_NAV_THRESHOLD_PX = 50;
const DOUBLE_TAP_ZOOM_SCALE = 2.5;
const MAX_PINCH_ZOOM_SCALE = 4;

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
 * Full-group DM image viewer — opens on the tapped image, swipes through
 * every image in the message (including ones hidden behind a "+N" grid
 * tile), and supports pinch/double-tap zoom + swipe-down dismiss. Replaces
 * the old per-tile `window.open` for multi-image messages only; single-image
 * messages keep their existing new-tab behaviour untouched.
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
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

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
    setTranslate({ x: 0, y: 0 });
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
      setTranslate({ x: 0, y: 0 });
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
        return;
      }

      const drag = dragStateRef.current;
      if (!drag) {
        return;
      }

      const touch = event.touches[0];
      const deltaX = touch.clientX - drag.startX;
      const deltaY = touch.clientY - drag.startY;
      drag.lastX = touch.clientX;
      drag.lastY = touch.clientY;

      if (scale > 1) {
        drag.mode = "pan";
        setTranslate({ x: deltaX, y: deltaY });
        return;
      }

      if (drag.mode === "none" && Math.hypot(deltaX, deltaY) > 10) {
        drag.mode = "swipe";
      }

      if (drag.mode === "swipe") {
        setTranslate({ x: deltaX, y: Math.max(0, deltaY * 0.4) });
      }
    },
    [scale],
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

    const deltaX = drag.lastX - drag.startX;
    const deltaY = drag.lastY - drag.startY;

    if (drag.mode === "swipe" && deltaY > SWIPE_DISMISS_THRESHOLD_PX && Math.abs(deltaX) < 60) {
      requestClose();
      return;
    }

    if (drag.mode === "swipe" && Math.abs(deltaX) > SWIPE_NAV_THRESHOLD_PX) {
      goToIndex(deltaX < 0 ? index + 1 : index - 1);
      return;
    }

    setTranslate({ x: 0, y: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const currentImage = images[index];
  const hasPrevious = index > 0;
  const hasNext = index < images.length - 1;
  const isPanned = scale > 1;

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
        className="absolute inset-0 flex items-center justify-center overflow-hidden [touch-action:none]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={currentImage.url}
          src={currentImage.url}
          alt={currentImage.name}
          draggable={false}
          onClick={(event) => event.stopPropagation()}
          className={`pointer-events-auto max-h-[90vh] max-w-[92vw] select-none object-contain transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transition: isPanned || dragStateRef.current ? "none" : undefined,
          }}
        />
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
