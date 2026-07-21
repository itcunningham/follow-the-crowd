const MOBILE_NAVIGATION_MEDIA_QUERY = "(max-width: 767px)";
/** Visible viewport shrink that usually indicates the software keyboard on mobile. */
const SOFTWARE_KEYBOARD_THRESHOLD_PX = 80;

const listeners = new Set<() => void>();

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

function readSoftwareKeyboardObscuredHeight(): number {
  const viewport = window.visualViewport;

  if (!viewport) {
    return 0;
  }

  return Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
}

/** True when mobile layout and visual viewport is obscured while a text field is focused. */
export function isMobileSoftwareKeyboardOpen(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (!isMobileNavigationViewport()) {
    return false;
  }

  if (readSoftwareKeyboardObscuredHeight() < SOFTWARE_KEYBOARD_THRESHOLD_PX) {
    return false;
  }

  return isTextEntryElement(document.activeElement);
}

function notifyMobileSoftwareKeyboardListeners(): void {
  listeners.forEach((listener) => listener());
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

  viewport?.addEventListener("resize", handleChange);
  viewport?.addEventListener("scroll", handleChange);
  window.addEventListener("resize", handleChange);
  window.addEventListener("focusin", handleChange);
  window.addEventListener("focusout", handleChange);

  return () => {
    listeners.delete(listener);
    viewport?.removeEventListener("resize", handleChange);
    viewport?.removeEventListener("scroll", handleChange);
    window.removeEventListener("resize", handleChange);
    window.removeEventListener("focusin", handleChange);
    window.removeEventListener("focusout", handleChange);
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
