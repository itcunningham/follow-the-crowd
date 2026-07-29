"use client";

import { useCallback, useEffect, useRef } from "react";

export const DM_MESSAGE_LONG_PRESS_MS = 500;
export const DM_MESSAGE_LONG_PRESS_MOVE_THRESHOLD_PX = 10;

function prefersFinePointer(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(pointer: fine)").matches;
}

export function useMessageReactionLongPress(onOpenPicker: () => void) {
  const longPressActivatedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const activePointerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetGesture = useCallback(() => {
    clearTimer();
    startRef.current = null;
    activePointerRef.current = null;
    longPressActivatedRef.current = false;
  }, [clearTimer]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!event.isPrimary || event.button !== 0) {
        return;
      }

      if (event.pointerType === "mouse" && prefersFinePointer()) {
        return;
      }

      longPressActivatedRef.current = false;
      activePointerRef.current = event.pointerId;
      startRef.current = { x: event.clientX, y: event.clientY };

      clearTimer();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        longPressActivatedRef.current = true;
        onOpenPicker();
      }, DM_MESSAGE_LONG_PRESS_MS);
    },
    [clearTimer, onOpenPicker],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (activePointerRef.current !== event.pointerId || !startRef.current) {
        return;
      }

      const deltaX = event.clientX - startRef.current.x;
      const deltaY = event.clientY - startRef.current.y;

      if (Math.hypot(deltaX, deltaY) > DM_MESSAGE_LONG_PRESS_MOVE_THRESHOLD_PX) {
        resetGesture();
      }
    },
    [resetGesture],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (activePointerRef.current !== event.pointerId) {
        return;
      }

      clearTimer();
      activePointerRef.current = null;
      startRef.current = null;

      if (longPressActivatedRef.current) {
        event.preventDefault();
      }
    },
    [clearTimer],
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (activePointerRef.current === event.pointerId) {
        resetGesture();
      }
    },
    [resetGesture],
  );

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault();
      onOpenPicker();
    },
    [onOpenPicker],
  );

  const consumeLongPressActivation = useCallback((event: React.SyntheticEvent) => {
    if (!longPressActivatedRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    longPressActivatedRef.current = false;
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const wasLongPressActivated = useCallback(() => longPressActivatedRef.current, []);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleContextMenu,
    consumeLongPressActivation,
    wasLongPressActivated,
    resetLongPressGesture: resetGesture,
  };
}
