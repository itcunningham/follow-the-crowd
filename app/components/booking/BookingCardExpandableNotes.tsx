"use client";

import { useLayoutEffect, useRef, useState } from "react";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function BookingCardExpandableNotes({
  notes,
  label = "Notes",
  detailsOpen = true,
  onNotesExpandedChange,
}: {
  notes: string;
  label?: string;
  detailsOpen?: boolean;
  onNotesExpandedChange?: (expanded: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const [noteHeights, setNoteHeights] = useState<{ collapsed: number; full: number } | null>(
    null,
  );
  const [animatedHeight, setAnimatedHeight] = useState<number | null>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const trimmed = notes.trim();

  useLayoutEffect(() => {
    if (!detailsOpen) {
      setExpanded(false);
    }
  }, [detailsOpen]);

  useLayoutEffect(() => {
    const element = textRef.current;

    if (!element || !detailsOpen) {
      return;
    }

    function measureHeights() {
      const node = textRef.current;

      if (!node) {
        return;
      }

      const isExpanded = expandedRef.current;

      if (!isExpanded) {
        setShowToggle(node.scrollHeight > node.clientHeight + 1);
      }

      node.classList.remove("line-clamp-3");
      const fullHeight = node.scrollHeight;

      if (!isExpanded) {
        node.classList.add("line-clamp-3");
      }

      const collapsedHeight = isExpanded
        ? (() => {
            node.classList.add("line-clamp-3");
            const height = node.clientHeight;
            node.classList.remove("line-clamp-3");
            return height;
          })()
        : node.clientHeight;

      const needsToggle = fullHeight > collapsedHeight + 1;

      if (!isExpanded) {
        setShowToggle(needsToggle);
      }

      if (needsToggle || isExpanded) {
        setNoteHeights({ collapsed: collapsedHeight, full: fullHeight });
        setAnimatedHeight(isExpanded ? fullHeight : collapsedHeight);
      } else {
        setNoteHeights(null);
        setAnimatedHeight(null);
      }
    }

    measureHeights();

    const resizeObserver = new ResizeObserver(() => {
      measureHeights();
    });
    resizeObserver.observe(element);
    window.addEventListener("resize", measureHeights);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureHeights);
    };
  }, [trimmed, detailsOpen, expanded]);

  useLayoutEffect(() => {
    if (!detailsOpen || !noteHeights || expanded) {
      return;
    }

    setAnimatedHeight(noteHeights.collapsed);
  }, [detailsOpen, expanded, noteHeights]);

  if (!trimmed) {
    return null;
  }

  const canToggle = showToggle || expanded;
  const useMeasuredHeight = noteHeights != null && animatedHeight != null && (expanded || showToggle);

  function handleToggle() {
    if (!noteHeights) {
      const nextExpanded = !expanded;

      if (nextExpanded) {
        onNotesExpandedChange?.(true);
      }

      setExpanded(nextExpanded);
      return;
    }

    const nextExpanded = !expanded;
    const nextHeight = nextExpanded ? noteHeights.full : noteHeights.collapsed;
    const startHeight = nextExpanded ? noteHeights.collapsed : noteHeights.full;

    if (nextExpanded) {
      onNotesExpandedChange?.(true);
    }

    if (prefersReducedMotion()) {
      setExpanded(nextExpanded);
      setAnimatedHeight(nextHeight);
      return;
    }

    setAnimatedHeight(startHeight);
    requestAnimationFrame(() => {
      setAnimatedHeight(nextHeight);
      setExpanded(nextExpanded);
    });
  }

  return (
    <div className="pt-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ftc-text-muted">
        {label}
      </p>
      <div
        data-dm-booking-notes-expand-panel
        className="overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none"
        style={useMeasuredHeight ? { height: animatedHeight } : undefined}
      >
        <p
          ref={textRef}
          className={`mt-1 break-words text-sm leading-snug text-ftc-text-secondary ${
            expanded ? "block overflow-visible" : "line-clamp-3"
          }`}
        >
          {trimmed}
        </p>
      </div>
      {canToggle ? (
        <button
          type="button"
          data-dm-booking-notes-toggle
          onClick={handleToggle}
          className="mt-1 text-xs font-semibold text-ftc-primary transition hover:text-ftc-primary-dim"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
