"use client";

import { useLayoutEffect, useRef, useState } from "react";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function ProfileBioText({ bio }: { bio: string }) {
  const text = bio.trim();
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const [bioHeights, setBioHeights] = useState<{ collapsed: number; full: number } | null>(
    null,
  );
  const [animatedHeight, setAnimatedHeight] = useState<number | null>(null);
  const bioRef = useRef<HTMLParagraphElement>(null);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  useLayoutEffect(() => {
    const element = bioRef.current;

    if (!element) {
      return;
    }

    function measureHeights() {
      const node = bioRef.current;

      if (!node) {
        return;
      }

      const isExpanded = expandedRef.current;

      node.classList.remove("line-clamp-4");
      const fullHeight = node.scrollHeight;

      if (!isExpanded) {
        node.classList.add("line-clamp-4");
      }

      const collapsedHeight = isExpanded
        ? (() => {
            node.classList.add("line-clamp-4");
            const height = node.clientHeight;
            node.classList.remove("line-clamp-4");
            return height;
          })()
        : node.clientHeight;

      const needsToggle = fullHeight > collapsedHeight + 1;

      if (!isExpanded) {
        setShowToggle(needsToggle);
      }

      if (needsToggle || isExpanded) {
        setBioHeights({ collapsed: collapsedHeight, full: fullHeight });
        setAnimatedHeight(isExpanded ? fullHeight : collapsedHeight);
      } else {
        setBioHeights(null);
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
  }, [text, expanded]);

  if (!text) {
    return null;
  }

  const canToggle = showToggle || expanded;
  const useMeasuredHeight =
    bioHeights != null && animatedHeight != null && (expanded || showToggle);

  function handleToggle() {
    if (!bioHeights) {
      setExpanded((prev) => !prev);
      return;
    }

    const nextExpanded = !expanded;
    const nextHeight = nextExpanded ? bioHeights.full : bioHeights.collapsed;
    const startHeight = nextExpanded ? bioHeights.collapsed : bioHeights.full;

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
    <div className="mt-4">
      <div
        className="overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none"
        style={useMeasuredHeight ? { height: animatedHeight } : undefined}
      >
        <p
          ref={bioRef}
          className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-ftc-text-secondary [overflow-wrap:anywhere] ${
            expanded ? "block overflow-visible" : "line-clamp-4"
          }`}
        >
          {text}
        </p>
      </div>
      {canToggle ? (
        <button
          type="button"
          onClick={handleToggle}
          className="mt-2 text-xs font-semibold text-ftc-primary transition hover:text-ftc-primary-dim"
        >
          {expanded ? "See less" : "See more"}
        </button>
      ) : null}
    </div>
  );
}
