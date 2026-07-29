/** Single-line messages at or below this length render as compact pills. */
export const CHAT_BUBBLE_COMPACT_MAX_LENGTH = 42;

/** Very short single-character or two-character bubbles. */
export const CHAT_BUBBLE_VERY_SHORT_MAX_LENGTH = 2;

export function isCompactChatBubbleText(text: string): boolean {
  const trimmed = text.trim();

  if (!trimmed || trimmed.includes("\n")) {
    return false;
  }

  return trimmed.length <= CHAT_BUBBLE_COMPACT_MAX_LENGTH;
}

export function isVeryShortChatBubbleText(text: string): boolean {
  const trimmed = text.trim();

  if (!trimmed || trimmed.includes("\n")) {
    return false;
  }

  return trimmed.length <= CHAT_BUBBLE_VERY_SHORT_MAX_LENGTH;
}

export function resolveChatMessageBubbleShellClass({
  isOwnMessage,
  text,
  hasAttachments = false,
  attachmentOnly = false,
}: {
  isOwnMessage: boolean;
  text: string;
  hasAttachments?: boolean;
  attachmentOnly?: boolean;
}): string {
  const interaction = "[touch-action:pan-y]";

  if (attachmentOnly) {
    return `overflow-hidden ${interaction}`;
  }

  const base = isOwnMessage ? "ftc-bubble-own" : "ftc-bubble-other";
  const compact = isCompactChatBubbleText(text);
  const veryShort = isVeryShortChatBubbleText(text);
  const padding = hasAttachments
    ? "p-1"
    : veryShort
      ? "min-w-[2.75rem] px-3 py-1"
      : compact
        ? "min-w-[2.75rem] px-3.5 py-1.5"
        : "px-4 py-2.5";

  return `overflow-hidden ${interaction} w-fit max-w-full select-none sm:select-text ${base} ${padding}`;
}

export function resolveChatMessageBubbleTextClass(_text: string): string {
  return "text-[15px] leading-normal whitespace-pre-wrap break-words";
}
