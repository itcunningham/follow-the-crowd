import type { KeyboardEvent as ReactKeyboardEvent } from "react";

/** Text on the current line before the caret (same line as selectionStart). */
export function getComposerLineBeforeCursor(value: string, cursor: number): string {
  const beforeCursor = value.slice(0, cursor);
  const lineStart = beforeCursor.lastIndexOf("\n") + 1;

  return beforeCursor.slice(lineStart);
}

/** Return may insert a newline only when the current line has visible content. */
export function canComposerInsertNewline(value: string, cursor: number): boolean {
  return getComposerLineBeforeCursor(value, cursor).trim().length > 0;
}

export function shouldPreventComposerNewlineKey(
  event: ReactKeyboardEvent<HTMLTextAreaElement>,
): boolean {
  if (event.key !== "Enter") {
    return false;
  }

  if (event.nativeEvent.isComposing) {
    return false;
  }

  const textarea = event.currentTarget;
  const { value, selectionStart, selectionEnd } = textarea;

  if (selectionStart === null || selectionEnd === null) {
    return false;
  }

  if (selectionStart !== selectionEnd) {
    const selectedText = value.slice(selectionStart, selectionEnd);

    if (selectedText.trim().length > 0) {
      return false;
    }
  }

  return !canComposerInsertNewline(value, selectionStart);
}

export function handleComposerNewlineKeyDown(
  event: ReactKeyboardEvent<HTMLTextAreaElement>,
): void {
  if (shouldPreventComposerNewlineKey(event)) {
    event.preventDefault();
  }
}
