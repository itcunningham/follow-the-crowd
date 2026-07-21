const MOBILE_NAVIGATION_MEDIA_QUERY = "(max-width: 767px)";
const SOFTWARE_KEYBOARD_OPEN_GAP_PX = 80;
const SOFTWARE_KEYBOARD_DISMISSED_GAP_PX = 40;
const FOCUS_OUT_DEFER_MS = 50;

const listeners = new Set<() => void>();

let mobileKeyboardSessionActive = false;
let focusOutDeferTimer: ReturnType<typeof setTimeout> | null = null;

function isMobileNavigationViewport(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(MOBILE_NAVIGATION_MEDIA_QUERY).matches;
}

function isTextEntryElement(element: Element | null): element is HTMLElement {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }

  if (element.isContentEditable) {
    return true;
  }

  const tagName = element.tagName;

  if (tagName === "TEXTAREA" || tagName === "SELECT") {
    return true;
  }

  if (tagName !== "INPUT") {
    return false;
  }

  const inputType = (element as HTMLInputElement).type;

  return !["button", "checkbox", "file", "hidden", "radio", "submit", "reset"].includes(
    inputType,
  );
}

/** Height gap only — offsetTop changes while scrolling and must not toggle keyboard state. */
function readMobileKeyboardHeightGap(): number {
  const viewport = window.visualViewport;

  if (!viewport) {
    return 0;
  }

  return Math.max(0, window.innerHeight - viewport.height);
}

function isSoftwareKeyboardOpenByHeightGap(): boolean {
  return readMobileKeyboardHeightGap() >= SOFTWARE_KEYBOARD_OPEN_GAP_PX;
}

function isSoftwareKeyboardDismissedByHeightGap(): boolean {
  return readMobileKeyboardHeightGap() < SOFTWARE_KEYBOARD_DISMISSED_GAP_PX;
}

function hasFocusedTextEntry(): boolean {
  return isTextEntryElement(document.activeElement);
}

/**
 * Hide mobile bottom nav while the software keyboard is open.
 * Latches during a focused text-entry session so iOS visualViewport scroll
 * does not reveal the nav until the keyboard is dismissed or focus leaves.
 */
export function isMobileSoftwareKeyboardOpen(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (!isMobileNavigationViewport()) {
    mobileKeyboardSessionActive = false;
    return false;
  }

  if (!hasFocusedTextEntry()) {
    mobileKeyboardSessionActive = false;
    return false;
  }

  if (isSoftwareKeyboardOpenByHeightGap()) {
    mobileKeyboardSessionActive = true;
    return true;
  }

  if (mobileKeyboardSessionActive) {
    if (isSoftwareKeyboardDismissedByHeightGap()) {
      mobileKeyboardSessionActive = false;
      return false;
    }

    return true;
  }

  return false;
}

function notifyMobileSoftwareKeyboardListeners(): void {
  listeners.forEach((listener) => listener());
}

function scheduleDeferredFocusOutCheck(): void {
  if (focusOutDeferTimer) {
    clearTimeout(focusOutDeferTimer);
  }

  focusOutDeferTimer = setTimeout(() => {
    focusOutDeferTimer = null;
    notifyMobileSoftwareKeyboardListeners();
  }, FOCUS_OUT_DEFER_MS);
}

export function subscribeMobileSoftwareKeyboard(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  listeners.add(listener);

  const viewport = window.visualViewport;
  const handleChange = () => {
    notifyMobileSoftwareKeyboardListeners();
  };

  const handleFocusOut = () => {
    scheduleDeferredFocusOutCheck();
  };

  viewport?.addEventListener("resize", handleChange);
  viewport?.addEventListener("scroll", handleChange);
  window.addEventListener("resize", handleChange);
  window.addEventListener("focusin", handleChange);
  window.addEventListener("focusout", handleFocusOut);

  return () => {
    listeners.delete(listener);
    if (focusOutDeferTimer) {
      clearTimeout(focusOutDeferTimer);
      focusOutDeferTimer = null;
    }
    viewport?.removeEventListener("resize", handleChange);
    viewport?.removeEventListener("scroll", handleChange);
    window.removeEventListener("resize", handleChange);
    window.removeEventListener("focusin", handleChange);
    window.removeEventListener("focusout", handleFocusOut);
    mobileKeyboardSessionActive = false;
  };
}

export function getMobileSoftwareKeyboardOpenSnapshot(): boolean {
  return isMobileSoftwareKeyboardOpen();
}

export function getMobileSoftwareKeyboardOpenServerSnapshot(): boolean {
  return false;
}

export const MOBILE_KEYBOARD_OPEN_HTML_ATTRIBUTE = "data-mobile-keyboard-open";

export function syncMobileSoftwareKeyboardDocumentState(): void {
  if (typeof document === "undefined") {
    return;
  }

  if (isMobileSoftwareKeyboardOpen()) {
    document.documentElement.setAttribute(MOBILE_KEYBOARD_OPEN_HTML_ATTRIBUTE, "");
    return;
  }

  document.documentElement.removeAttribute(MOBILE_KEYBOARD_OPEN_HTML_ATTRIBUTE);
}
