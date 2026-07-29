"use client";

import {
  isMobileSoftwareKeyboardOpen,
  syncMobileSoftwareKeyboardDocumentState,
} from "@/lib/navigation/mobileSoftwareKeyboard";

const MOBILE_NAVIGATION_MEDIA_QUERY = "(max-width: 767px)";

function isMobileChatViewport(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(MOBILE_NAVIGATION_MEDIA_QUERY).matches;
}

/**
 * Returns true when the composer should stay focused after send.
 * On mobile, only when the software keyboard is already open.
 * On desktop, when the input is already focused.
 */
export function shouldKeepComposerFocusedAfterSend(
  input: HTMLInputElement | null | undefined,
): boolean {
  if (!input || document.activeElement !== input) {
    return false;
  }

  if (!isMobileChatViewport()) {
    return true;
  }

  return isMobileSoftwareKeyboardOpen();
}

/**
 * Restore composer focus after send without blurring the input.
 * Call only when shouldKeepComposerFocusedAfterSend was true at send start.
 */
export function restoreComposerInputFocus(input: HTMLInputElement | null | undefined): void {
  if (!input) {
    return;
  }

  requestAnimationFrame(() => {
    if (document.activeElement !== input) {
      input.focus({ preventScroll: true });
    }

    syncMobileSoftwareKeyboardDocumentState();
  });
}
