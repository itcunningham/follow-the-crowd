"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VIEWER_TRANSITION_MS = 220;
const DRAG_THRESHOLD_PX = 6;

export default function ProfilePhotoViewer({
  open,
  onClose,
  imageUrl,
  displayName,
}: {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  displayName: string;
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const isDraggingRef = useRef(false);
  const pointerActiveRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setMounted(false), VIEWER_TRANSITION_MS);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted, onClose]);

  const resetPointerState = useCallback(() => {
    pointerActiveRef.current = false;
    pointerStartRef.current = null;
    window.setTimeout(() => {
      isDraggingRef.current = false;
    }, 0);
  }, []);

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) {
        return;
      }

      if (isDraggingRef.current || pointerActiveRef.current) {
        return;
      }

      onClose();
    },
    [onClose],
  );

  const handleImagePointerDown = useCallback((event: React.PointerEvent<HTMLImageElement>) => {
    pointerActiveRef.current = true;
    isDraggingRef.current = false;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handleImagePointerMove = useCallback((event: React.PointerEvent<HTMLImageElement>) => {
    if (!pointerActiveRef.current || !pointerStartRef.current) {
      return;
    }

    const deltaX = event.clientX - pointerStartRef.current.x;
    const deltaY = event.clientY - pointerStartRef.current.y;

    if (Math.hypot(deltaX, deltaY) > DRAG_THRESHOLD_PX) {
      isDraggingRef.current = true;
    }
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={`${displayName} profile photo`}
    >
      <div
        className={`absolute inset-0 bg-black/80 transition-opacity duration-200 ease-out motion-reduce:transition-none ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleBackdropClick}
      />

      <button
        type="button"
        aria-label="Close profile photo"
        className={`absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-[52] flex h-9 w-9 items-center justify-center rounded-full border border-ftc-border-subtle bg-ftc-surface/90 text-white shadow-sm transition-[opacity,transform] duration-200 ease-out hover:border-ftc-border-strong hover:bg-ftc-surface motion-reduce:transition-none ${
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        onClick={onClose}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
        <img
          src={imageUrl}
          alt={`${displayName} profile`}
          draggable={false}
          className={`pointer-events-auto h-72 w-72 max-h-[70vh] max-w-[85vw] select-none rounded-full object-cover shadow-2xl transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none sm:h-80 sm:w-80 ${
            visible ? "scale-100 opacity-100" : "scale-[0.96] opacity-0"
          }`}
          onPointerDown={handleImagePointerDown}
          onPointerMove={handleImagePointerMove}
          onPointerUp={resetPointerState}
          onPointerCancel={resetPointerState}
          onClick={(event) => event.stopPropagation()}
        />
      </div>
    </div>
  );
}
