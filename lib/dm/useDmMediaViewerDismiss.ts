"use client";

import { useEffect } from "react";

/**
 * Shared dismiss behaviour for DM fullscreen media overlays (the image
 * lightbox and the gallery overview): locks background scroll while
 * mounted and closes on Escape. Both overlays need this identically; kept
 * as one hook instead of a second copy-pasted effect.
 */
export function useDmMediaViewerDismiss(onClose: () => void) {
  useEffect(() => {
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
  }, [onClose]);
}
