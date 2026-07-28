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
 * Keep the composer DOM focus state aligned with the mobile software keyboard.
 * iOS Safari can leave :focus styling active after clearing emoji-only input even
 * when the keyboard has closed.
 */
export function syncComposerInputFocusState(input: HTMLInputElement | null | undefined): void {
  syncMobileSoftwareKeyboardDocumentState();

  if (!input || !isMobileChatViewport()) {
    return;
  }

  if (document.activeElement !== input) {
    return;
  }

  if (isMobileSoftwareKeyboardOpen()) {
    return;
  }

  input.blur();
  requestAnimationFrame(() => {
    input.focus({ preventScroll: true });
    syncMobileSoftwareKeyboardDocumentState();

    requestAnimationFrame(() => {
      if (document.activeElement === input && !isMobileSoftwareKeyboardOpen()) {
        input.blur();
      }

      syncMobileSoftwareKeyboardDocumentState();
    });
  });
}

export function restoreComposerInputFocus(input: HTMLInputElement | null | undefined): void {
  if (!input) {
    return;
  }

  requestAnimationFrame(() => {
    if (document.activeElement !== input) {
      input.focus({ preventScroll: true });
    }

    requestAnimationFrame(() => {
      syncComposerInputFocusState(input);
    });
  });
}
