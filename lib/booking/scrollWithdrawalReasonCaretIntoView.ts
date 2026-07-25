"use client";

const MIRROR_STYLE_PROPERTIES = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "lineHeight",
  "letterSpacing",
  "wordBreak",
  "overflowWrap",
  "textTransform",
] as const;

let caretMirror: HTMLDivElement | null = null;

function getCaretMirror(textarea: HTMLTextAreaElement): HTMLDivElement {
  if (!caretMirror) {
    caretMirror = document.createElement("div");
    caretMirror.setAttribute("aria-hidden", "true");
    Object.assign(caretMirror.style, {
      position: "absolute",
      top: "-9999px",
      left: "-9999px",
      visibility: "hidden",
      pointerEvents: "none",
      whiteSpace: "pre-wrap",
      wordWrap: "break-word",
      overflowWrap: "break-word",
      padding: "0",
      border: "0",
      margin: "0",
    });
    document.body.appendChild(caretMirror);
  }

  const computed = window.getComputedStyle(textarea);

  for (const property of MIRROR_STYLE_PROPERTIES) {
    caretMirror.style[property] = computed[property];
  }

  const paddingLeft = parseFloat(computed.paddingLeft) || 0;
  const paddingRight = parseFloat(computed.paddingRight) || 0;
  const contentWidth = Math.max(textarea.clientWidth - paddingLeft - paddingRight, 0);

  caretMirror.style.width = `${contentWidth}px`;

  return caretMirror;
}

export function scrollWithdrawalReasonCaretIntoView(textarea: HTMLTextAreaElement): void {
  const selectionStart = textarea.selectionStart ?? 0;
  const selectionEnd = textarea.selectionEnd ?? selectionStart;

  textarea.setSelectionRange(selectionStart, selectionEnd);

  const computed = window.getComputedStyle(textarea);
  const lineHeight = parseFloat(computed.lineHeight) || 21;
  const paddingTop = parseFloat(computed.paddingTop) || 0;
  const paddingBottom = parseFloat(computed.paddingBottom) || 0;
  const scrollPaddingTop = parseFloat(computed.scrollPaddingTop) || paddingTop;
  const scrollPaddingBottom = parseFloat(computed.scrollPaddingBottom) || paddingBottom;

  const mirror = getCaretMirror(textarea);
  mirror.textContent = textarea.value.slice(0, selectionStart);

  const caretTop = paddingTop + mirror.offsetHeight;
  const caretBottom = caretTop + lineHeight;
  const visibleTop = textarea.scrollTop + scrollPaddingTop;
  const visibleBottom = textarea.scrollTop + textarea.clientHeight - scrollPaddingBottom;

  if (caretTop < visibleTop) {
    textarea.scrollTop = Math.max(0, caretTop - scrollPaddingTop);
    return;
  }

  if (caretBottom > visibleBottom) {
    textarea.scrollTop = caretBottom - textarea.clientHeight + scrollPaddingBottom;
  }
}

export function resetWithdrawalReasonTextareaScroll(textarea: HTMLTextAreaElement): void {
  textarea.scrollTop = 0;
}
