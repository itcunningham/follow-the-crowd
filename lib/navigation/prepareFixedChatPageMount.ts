import {
  MOBILE_KEYBOARD_OPEN_HTML_ATTRIBUTE,
  resetMobileSoftwareKeyboardSession,
  syncMobileSoftwareKeyboardDocumentState,
} from "@/lib/navigation/mobileSoftwareKeyboard";
import { scrollDocumentToTop } from "@/lib/navigation/scrollPageToTop";

/** Clear document scroll/lock state before painting a fixed full-viewport chat page. */
export function prepareFixedChatPageMount(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.history.scrollRestoration = "manual";
  scrollDocumentToTop();

  const { style: bodyStyle } = document.body;

  if (bodyStyle.position === "fixed") {
    bodyStyle.position = "";
    bodyStyle.top = "";
    bodyStyle.left = "";
    bodyStyle.right = "";
    bodyStyle.width = "";
    bodyStyle.overflow = "";
    bodyStyle.paddingRight = "";
    scrollDocumentToTop();
  }

  resetMobileSoftwareKeyboardSession();
  document.documentElement.removeAttribute(MOBILE_KEYBOARD_OPEN_HTML_ATTRIBUTE);
  syncMobileSoftwareKeyboardDocumentState();
}
