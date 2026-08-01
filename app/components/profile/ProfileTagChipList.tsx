"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shared pill base for every profile tag chip — read-only display (this
 * file) and the editable genre/event-brand pickers all build on this same
 * border/background/rounding/typography so the two chip types stay visually
 * identical wherever they appear; only padding varies (editable chips are
 * taller, and an inline remove icon needs asymmetric horizontal padding).
 */
export const PROFILE_TAG_CHIP_BASE_CLASS =
  "inline-flex items-center rounded-full border border-ftc-border-subtle bg-ftc-bg-elevated text-xs font-medium";

/**
 * Safe upper bound for one chip's overall width, regardless of viewport or
 * content. Genre tags come from a short curated list and never approach
 * this; Event Brands are free text up to 40 characters and CAN be one
 * unbroken word with no natural break point, which — with no width cap —
 * would force the chip (and the page) wider than the viewport instead of
 * wrapping. Paired with `min-w-0 truncate` (see below) so the browser is
 * actually allowed to shrink the chip below its unbroken content's natural
 * width before clipping it.
 */
export const PROFILE_TAG_CHIP_MAX_WIDTH_CLASS = "max-w-[12rem]";

type PopoverAlign = "left" | "center" | "right";

/** Distance (px) from a viewport edge inside which the popover anchors to that edge instead of centering, so it can never push the page into horizontal scroll. */
const EDGE_ALIGN_THRESHOLD_PX = 96;

const POPOVER_ALIGN_CLASS: Record<PopoverAlign, string> = {
  left: "left-0",
  right: "right-0",
  center: "left-1/2 -translate-x-1/2",
};

/** Shared read-only chip row for profile tag lists (music genres, event brands). Tapping a chip whose text is actually truncated reveals the full value in a lightweight popover anchored to that chip; tapping elsewhere or Escape dismisses it. Chips that already show their full text are unaffected by tapping. */
export default function ProfileTagChipList({ tags }: { tags: string[] }) {
  const [expanded, setExpanded] = useState<{ tag: string; align: PopoverAlign } | null>(null);
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!expanded) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (chipRefs.current.get(expanded!.tag)?.contains(target)) {
        return;
      }

      setExpanded(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExpanded(null);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [expanded]);

  if (tags.length === 0) {
    return null;
  }

  function handleChipClick(tag: string, chipEl: HTMLButtonElement) {
    if (chipEl.scrollWidth <= chipEl.clientWidth) {
      // Full text already visible — nothing to reveal.
      return;
    }

    setExpanded((current) => {
      if (current?.tag === tag) {
        return null;
      }

      const rect = chipEl.getBoundingClientRect();
      const align: PopoverAlign =
        rect.left < EDGE_ALIGN_THRESHOLD_PX
          ? "left"
          : window.innerWidth - rect.right < EDGE_ALIGN_THRESHOLD_PX
            ? "right"
            : "center";

      return { tag, align };
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span key={tag} className="relative inline-block">
          <button
            ref={(el) => {
              if (el) {
                chipRefs.current.set(tag, el);
              } else {
                chipRefs.current.delete(tag);
              }
            }}
            type="button"
            title={tag}
            aria-expanded={expanded?.tag === tag}
            aria-haspopup="true"
            onClick={(event) => handleChipClick(tag, event.currentTarget)}
            className={`${PROFILE_TAG_CHIP_BASE_CLASS} ${PROFILE_TAG_CHIP_MAX_WIDTH_CLASS} min-w-0 truncate px-3 py-1 text-ftc-text-secondary`}
          >
            {tag}
          </button>

          {expanded?.tag === tag ? (
            <div
              role="tooltip"
              className={`absolute top-full z-40 mt-1.5 max-w-[min(80vw,18rem)] whitespace-normal break-words rounded-lg border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-2 text-xs font-medium text-ftc-text shadow-[0_12px_40px_rgba(0,0,0,0.45)] ${POPOVER_ALIGN_CLASS[expanded.align]}`}
            >
              {tag}
            </div>
          ) : null}
        </span>
      ))}
    </div>
  );
}
