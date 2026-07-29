/** Single-line messages at or below this length render as compact pills. */
export const CHAT_BUBBLE_COMPACT_MAX_LENGTH = 42;

export function isCompactChatBubbleText(text: string): boolean {
  const trimmed = text.trim();

  if (!trimmed || trimmed.includes("\n")) {
    return false;
  }

  return trimmed.length <= CHAT_BUBBLE_COMPACT_MAX_LENGTH;
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
  const padding = hasAttachments ? "p-1" : compact ? "px-3 py-1" : "px-3.5 py-1.5";

  return `overflow-hidden ${interaction} w-fit max-w-full select-none sm:select-text ${base} ${padding}`;
}

export function resolveChatMessageBubbleTextClass(text: string): string {
  const leading = isCompactChatBubbleText(text) ? "leading-snug" : "leading-normal";

  return `text-[15px] ${leading} whitespace-pre-wrap break-words`;
}
