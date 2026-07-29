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

export function useDoubleTapGesture({
  onDoubleTap,
  wasLongPressActivated = () => false,
  onCancelCompetingGesture,
  disabled = false,
}: {
  onDoubleTap: () => void;
  wasLongPressActivated?: () => boolean;
  onCancelCompetingGesture?: () => void;
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

  const isWithinDoubleTapWindow = useCallback((clientX: number, clientY: number) => {
    const lastTap = lastTapRef.current;

    if (!lastTap) {
      return false;
    }

    const now = Date.now();

    return (
      now - lastTap.time <= DM_MESSAGE_DOUBLE_TAP_MS &&
      Math.hypot(clientX - lastTap.x, clientY - lastTap.y) <=
        DM_MESSAGE_DOUBLE_TAP_MOVE_THRESHOLD_PX
    );
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (disabled || !event.isPrimary || event.button !== 0) {
        return;
      }

      if (event.pointerType === "mouse" && prefersFinePointer()) {
        return;
      }

      if (isWithinDoubleTapWindow(event.clientX, event.clientY)) {
        onCancelCompetingGesture?.();
      }

      activePointerRef.current = event.pointerId;
      startRef.current = { x: event.clientX, y: event.clientY };
      movedRef.current = false;
      doubleTapHandledRef.current = false;
    },
    [disabled, isWithinDoubleTapWindow, onCancelCompetingGesture],
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
          onDoubleTap();
        }

        return;
      }

      lastTapRef.current = {
        time: now,
        x: event.clientX,
        y: event.clientY,
      };
    },
    [disabled, onDoubleTap, wasLongPressActivated],
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

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (disabled || !prefersFinePointer()) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onDoubleTap();
    },
    [disabled, onDoubleTap],
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
    handleDoubleClick,
    consumeDoubleTapActivation,
    resetDoubleTapGesture: resetGesture,
  };
}

export function useMessageReactionDoubleTap({
  bubbleRootRef,
  onToggleHeart,
  wasLongPressActivated,
  onCancelCompetingGesture,
}: {
  bubbleRootRef: React.RefObject<HTMLElement | null>;
  onToggleHeart: () => void;
  wasLongPressActivated: () => boolean;
  onCancelCompetingGesture?: () => void;
}) {
  const doubleTap = useDoubleTapGesture({
    onDoubleTap: onToggleHeart,
    wasLongPressActivated,
    onCancelCompetingGesture,
  });

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
      if (!isGestureSurface(event.target)) {
        return;
      }

      doubleTap.handlePointerDown(event);
    },
    [doubleTap, isGestureSurface],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!isGestureSurface(event.target)) {
        return;
      }

      doubleTap.handlePointerMove(event);
    },
    [doubleTap, isGestureSurface],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!isGestureSurface(event.target)) {
        return;
      }

      doubleTap.handlePointerUp(event);
    },
    [doubleTap, isGestureSurface],
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!isGestureSurface(event.target)) {
        return;
      }

      doubleTap.handlePointerCancel(event);
    },
    [doubleTap, isGestureSurface],
  );

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!isGestureSurface(event.target)) {
        return;
      }

      doubleTap.handleDoubleClick(event);
    },
    [doubleTap, isGestureSurface],
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleDoubleClick,
    consumeDoubleTapActivation: doubleTap.consumeDoubleTapActivation,
    resetDoubleTapGesture: doubleTap.resetDoubleTapGesture,
  };
}
