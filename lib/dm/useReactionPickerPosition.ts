"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import {
  computeReactionPickerPosition,
  getReactionPickerViewportBounds,
  type ReactionPickerPlacement,
} from "@/lib/dm/reactionPickerPosition";

type ReactionPickerPosition = {
  top: number;
  left: number;
  placement: ReactionPickerPlacement;
  ready: boolean;
};

const INITIAL_POSITION: ReactionPickerPosition = {
  top: 0,
  left: 0,
  placement: "above",
  ready: false,
};

export function useReactionPickerPosition({
  show,
  anchorRef,
  pickerRef,
  isOwnMessage,
  scrollContainerRef,
}: {
  show: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  pickerRef: React.RefObject<HTMLElement | null>;
  isOwnMessage: boolean;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}) {
  const [position, setPosition] = useState<ReactionPickerPosition>(INITIAL_POSITION);

  const measurePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const picker = pickerRef.current;

    if (!anchor || !picker) {
      return;
    }

    const anchorRect = anchor.getBoundingClientRect();
    const pickerRect = picker.getBoundingClientRect();
    const pickerWidth = pickerRect.width > 0 ? pickerRect.width : picker.offsetWidth;
    const pickerHeight = pickerRect.height > 0 ? pickerRect.height : picker.offsetHeight;

    if (pickerWidth <= 0 || pickerHeight <= 0) {
      return;
    }

    const next = computeReactionPickerPosition({
      anchorRect,
      pickerWidth,
      pickerHeight,
      isOwnMessage,
      viewport: getReactionPickerViewportBounds(),
    });

    setPosition({
      top: next.top,
      left: next.left,
      placement: next.placement,
      ready: true,
    });
  }, [anchorRef, isOwnMessage, pickerRef]);

  useLayoutEffect(() => {
    if (!show) {
      setPosition(INITIAL_POSITION);
      return;
    }

    measurePosition();

    const scrollContainer = scrollContainerRef?.current;

    function handleViewportChange() {
      measurePosition();
    }

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);
    scrollContainer?.addEventListener("scroll", handleViewportChange, { passive: true });

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
      scrollContainer?.removeEventListener("scroll", handleViewportChange);
    };
  }, [measurePosition, scrollContainerRef, show]);

  return { position, remeasure: measurePosition };
}
