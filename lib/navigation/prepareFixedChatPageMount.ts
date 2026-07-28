import {
  MOBILE_KEYBOARD_OPEN_HTML_ATTRIBUTE,
  resetMobileSoftwareKeyboardSession,
  syncMobileSoftwareKeyboardDocumentState,
} from "@/lib/navigation/mobileSoftwareKeyboard";
import { scrollDocumentToTop } from "@/lib/navigation/scrollPageToTop";

type DocumentScrollSnapshot = {
  htmlOverflow: string;
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
  bodyPaddingRight: string;
};

let fixedChatDocumentLockCount = 0;
let fixedChatDocumentSnapshot: DocumentScrollSnapshot | null = null;

/** Shared fixed full-viewport chat shell — dynamic viewport height, not layout `inset-0`. */
export const FIXED_CHAT_PAGE_SHELL_CLASS =
  "fixed inset-x-0 top-0 z-0 flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-ftc-bg font-sans text-ftc-text";

function clearInlineBodyPositionLock(bodyStyle: CSSStyleDeclaration): void {
  if (bodyStyle.position !== "fixed") {
    return;
  }

  bodyStyle.position = "";
  bodyStyle.top = "";
  bodyStyle.left = "";
  bodyStyle.right = "";
  bodyStyle.width = "";
  bodyStyle.paddingRight = "";
}

/** Read layout inputs that affect fixed chat composer placement (for diagnostics/tests). */
export function readFixedChatLayoutDiagnostics(): {
  windowScrollY: number;
  documentElementScrollTop: number;
  bodyScrollTop: number;
  innerHeight: number;
  visualViewportHeight: number | null;
  visualViewportOffsetTop: number | null;
  keyboardOpen: boolean;
  htmlOverflow: string;
  bodyOverflow: string;
  bodyPosition: string;
} {
  if (typeof window === "undefined") {
    return {
      windowScrollY: 0,
      documentElementScrollTop: 0,
      bodyScrollTop: 0,
      innerHeight: 0,
      visualViewportHeight: null,
      visualViewportOffsetTop: null,
      keyboardOpen: false,
      htmlOverflow: "",
      bodyOverflow: "",
      bodyPosition: "",
    };
  }

  const viewport = window.visualViewport;

  return {
    windowScrollY: window.scrollY,
    documentElementScrollTop: document.documentElement.scrollTop,
    bodyScrollTop: document.body.scrollTop,
    innerHeight: window.innerHeight,
    visualViewportHeight: viewport?.height ?? null,
    visualViewportOffsetTop: viewport?.offsetTop ?? null,
    keyboardOpen: document.documentElement.hasAttribute(MOBILE_KEYBOARD_OPEN_HTML_ATTRIBUTE),
    htmlOverflow: document.documentElement.style.overflow,
    bodyOverflow: document.body.style.overflow,
    bodyPosition: document.body.style.position,
  };
}

/** Reset keyboard + scroll state before applying the document scroll lock. */
export function prepareFixedChatPageMount(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.history.scrollRestoration = "manual";
  scrollDocumentToTop();
  clearInlineBodyPositionLock(document.body.style);
  resetMobileSoftwareKeyboardSession();
  document.documentElement.removeAttribute(MOBILE_KEYBOARD_OPEN_HTML_ATTRIBUTE);
  syncMobileSoftwareKeyboardDocumentState();
}

/**
 * Keep the document from scrolling while a fixed chat page is mounted.
 * Event Details uses document scroll; if scrollY persists on return, iOS Safari
 * mispositions `position: fixed` chat chrome above the bottom nav.
 */
export function lockFixedChatDocumentScroll(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  prepareFixedChatPageMount();

  fixedChatDocumentLockCount += 1;

  if (fixedChatDocumentLockCount === 1) {
    const html = document.documentElement;
    const body = document.body;

    fixedChatDocumentSnapshot = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyPaddingRight: body.style.paddingRight,
    };

    clearInlineBodyPositionLock(body.style);
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    scrollDocumentToTop();
  }

  return () => {
    if (typeof window === "undefined") {
      return;
    }

    fixedChatDocumentLockCount = Math.max(0, fixedChatDocumentLockCount - 1);

    if (fixedChatDocumentLockCount !== 0 || !fixedChatDocumentSnapshot) {
      return;
    }

    const html = document.documentElement;
    const body = document.body;
    const snapshot = fixedChatDocumentSnapshot;
    fixedChatDocumentSnapshot = null;

    html.style.overflow = snapshot.htmlOverflow;
    body.style.overflow = snapshot.bodyOverflow;
    body.style.position = snapshot.bodyPosition;
    body.style.top = snapshot.bodyTop;
    body.style.left = snapshot.bodyLeft;
    body.style.right = snapshot.bodyRight;
    body.style.width = snapshot.bodyWidth;
    body.style.paddingRight = snapshot.bodyPaddingRight;
  };
}
