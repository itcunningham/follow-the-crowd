"use client";

import { useCallback, useRef } from "react";
import { DM_QUICK_REACTIONS } from "@/lib/dmReactions";

export const DM_MESSAGE_DOUBLE_TAP_MS = 300;
export const DM_MESSAGE_DOUBLE_TAP_MOVE_THRESHOLD_PX = 10;

export const DM_DEFAULT_REACTION_EMOJI = DM_QUICK_REACTIONS[0];

function prefersFinePointer(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(pointer: fine)").matches;
}

function isInteractiveMessageTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest("a, button, [role='button'], input, textarea, select, label"));
}

export function useMessageReactionDoubleTap({
  bubbleRootRef,
  onToggleHeart,
  wasLongPressActivated,
  disabled = false,
}: {
  bubbleRootRef: React.RefObject<HTMLElement | null>;
  onToggleHeart: () => void;
  wasLongPressActivated: () => boolean;
  disabled?: boolean;
}) {
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const activePointerRef = useRef<number | null>(null);
  const doubleTapHandledRef = useRef(false);

  const resetGesture = useCallback(() => {
    startRef.current = null;
    movedRef.current = false;
    activePointerRef.current = null;
    doubleTapHandledRef.current = false;
  }, []);

  const isGestureSurface = useCallback(
    (target: EventTarget | null) => {
      const bubbleRoot = bubbleRootRef.current;

      if (!(target instanceof Element) || !bubbleRoot) {
        return false;
      }

      if (!bubbleRoot.contains(target)) {
        return false;
      }

      return !isInteractiveMessageTarget(target);
    },
    [bubbleRootRef],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!event.isPrimary || event.button !== 0 || disabled) {
        return;
      }

      if (event.pointerType === "mouse" && prefersFinePointer()) {
        return;
      }

      if (!isGestureSurface(event.target)) {
        return;
      }

      activePointerRef.current = event.pointerId;
      startRef.current = { x: event.clientX, y: event.clientY };
      movedRef.current = false;
      doubleTapHandledRef.current = false;
    },
    [disabled, isGestureSurface],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (activePointerRef.current !== event.pointerId || !startRef.current) {
        return;
      }

      const deltaX = event.clientX - startRef.current.x;
      const deltaY = event.clientY - startRef.current.y;

      if (Math.hypot(deltaX, deltaY) > DM_MESSAGE_DOUBLE_TAP_MOVE_THRESHOLD_PX) {
        movedRef.current = true;
        lastTapRef.current = null;
      }
    },
    [],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (activePointerRef.current !== event.pointerId) {
        return;
      }

      activePointerRef.current = null;
      startRef.current = null;

      if (disabled || movedRef.current || wasLongPressActivated()) {
        return;
      }

      if (!isGestureSurface(event.target)) {
        return;
      }

      const now = Date.now();
      const lastTap = lastTapRef.current;

      if (
        lastTap &&
        now - lastTap.time <= DM_MESSAGE_DOUBLE_TAP_MS &&
        Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) <=
          DM_MESSAGE_DOUBLE_TAP_MOVE_THRESHOLD_PX
      ) {
        event.preventDefault();
        event.stopPropagation();
        lastTapRef.current = null;

        if (!doubleTapHandledRef.current) {
          doubleTapHandledRef.current = true;
          onToggleHeart();
        }

        return;
      }

      lastTapRef.current = {
        time: now,
        x: event.clientX,
        y: event.clientY,
      };
    },
    [disabled, isGestureSurface, onToggleHeart, wasLongPressActivated],
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (activePointerRef.current === event.pointerId) {
        resetGesture();
        lastTapRef.current = null;
      }
    },
    [resetGesture],
  );

  const consumeDoubleTapActivation = useCallback((event: React.SyntheticEvent) => {
    if (!doubleTapHandledRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    doubleTapHandledRef.current = false;
  }, []);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    consumeDoubleTapActivation,
    resetDoubleTapGesture: resetGesture,
  };
}
