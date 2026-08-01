"use client";

import { useEffect, useRef, useState } from "react";
import {
  PROFILE_TAG_CHIP_BASE_CLASS,
  PROFILE_TAG_CHIP_MAX_WIDTH_CLASS,
} from "@/app/components/profile/ProfileTagChipList";
import { useBodyScrollLock } from "@/lib/ui/useBodyScrollLock";

/** Drag distance (px) on the sheet's header/handle past which releasing closes it. */
const SWIPE_DISMISS_THRESHOLD_PX = 80;

/**
 * Public-profile-only Event Brands display. Every brand renders as the same
 * shared chip (`PROFILE_TAG_CHIP_*`) used everywhere else, truncating a long
 * name with an ellipsis — but tapping ANY chip opens a bottom sheet listing
 * every saved brand in full (no truncation), scrolled to and highlighting the
 * one that was tapped, so a truncated name is always fully readable without
 * a hover-only tooltip. Tapping a different chip while the sheet is already
 * open just re-targets the highlight; it never closes and reopens. Reuses
 * the same dialog/backdrop/dismiss conventions as `ProfileGenrePicker`'s
 * "Add genres" sheet (`useBodyScrollLock`, Escape-to-close, backdrop tap).
 */
export default function EventBrandsChips({ brands }: { brands: string[] }) {
  const [open, setOpen] = useState(false);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const dragStartYRef = useRef<number | null>(null);

  useBodyScrollLock(open);

  function openSheetFor(brand: string) {
    setActiveBrand(brand);
    setOpen(true);
  }

  function closeSheet() {
    setOpen(false);
    setActiveBrand(null);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeSheet();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Dialog convention: move focus into the sheet as soon as it opens.
  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    }
  }, [open]);

  // Scroll the tapped brand into view and let its highlight className apply.
  useEffect(() => {
    if (!open || !activeBrand) {
      return;
    }

    rowRefs.current.get(activeBrand)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [open, activeBrand]);

  // Minimal focus trap: Tab/Shift+Tab cycles within the sheet's own
  // focusable elements instead of escaping to the page behind it.
  function handlePanelKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") {
      return;
    }

    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // Swipe-down-to-dismiss, scoped to the header/handle only so it can never
  // conflict with scrolling the brand list itself.
  function handleHeaderTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    dragStartYRef.current = event.touches[0].clientY;
  }

  function handleHeaderTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    const startY = dragStartYRef.current;
    const panel = panelRef.current;
    if (startY === null || !panel) {
      return;
    }

    const deltaY = event.touches[0].clientY - startY;
    panel.style.transform = deltaY > 0 ? `translateY(${deltaY}px)` : "";
  }

  function handleHeaderTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const startY = dragStartYRef.current;
    const panel = panelRef.current;
    dragStartYRef.current = null;
    if (startY === null || !panel) {
      return;
    }

    const deltaY = event.changedTouches[0].clientY - startY;
    panel.style.transition = "transform 200ms ease-out";

    if (deltaY > SWIPE_DISMISS_THRESHOLD_PX) {
      panel.style.transform = "translateY(100%)";
      window.setTimeout(closeSheet, 200);
    } else {
      panel.style.transform = "";
    }

    window.setTimeout(() => {
      if (panelRef.current) {
        panelRef.current.style.transition = "";
      }
    }, 200);
  }

  if (brands.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {brands.map((brand) => (
          <button
            key={brand}
            type="button"
            onClick={() => openSheetFor(brand)}
            className={`${PROFILE_TAG_CHIP_BASE_CLASS} ${PROFILE_TAG_CHIP_MAX_WIDTH_CLASS} min-w-0 truncate px-3 py-1 text-ftc-text-secondary`}
          >
            {brand}
          </button>
        ))}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
          onClick={closeSheet}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-brands-sheet-title"
            aria-describedby="event-brands-sheet-subtitle"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handlePanelKeyDown}
            className="ftc-event-brands-sheet-panel flex max-h-[80dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-ftc-border-strong bg-ftc-bg-elevated shadow-ftc-card outline-none"
          >
            <div
              onTouchStart={handleHeaderTouchStart}
              onTouchMove={handleHeaderTouchMove}
              onTouchEnd={handleHeaderTouchEnd}
              className="shrink-0 border-b border-ftc-border-subtle px-4 pb-4 pt-3 sm:px-5"
            >
              <div
                aria-hidden="true"
                className="mx-auto mb-3 h-1 w-10 rounded-full bg-ftc-border-strong"
              />
              <h2 id="event-brands-sheet-title" className="text-base font-semibold text-ftc-text">
                Event Brands
              </h2>
              <p id="event-brands-sheet-subtitle" className="mt-1 text-xs text-ftc-text-muted">
                {brands.length} brand{brands.length === 1 ? "" : "s"}
              </p>
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3">
              {brands.map((brand) => (
                <li
                  key={brand}
                  ref={(el) => {
                    if (el) {
                      rowRefs.current.set(brand, el);
                    } else {
                      rowRefs.current.delete(brand);
                    }
                  }}
                  className={`whitespace-normal break-words rounded-xl border px-3 py-2.5 text-sm text-ftc-text transition-colors ${
                    brand === activeBrand
                      ? "border-ftc-primary/40 bg-ftc-primary/10"
                      : "border-transparent"
                  }`}
                >
                  {brand}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
