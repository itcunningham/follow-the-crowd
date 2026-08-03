import type { ChatMessageGroupPosition } from "./chatMessageGroupLayout";

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

function resolveGroupedBubbleShellBaseClass(
  isOwnMessage: boolean,
  groupPosition: ChatMessageGroupPosition,
): string {
  if (groupPosition === "first") {
    return isOwnMessage ? "ftc-bubble-own-stack" : "ftc-bubble-other-stack";
  }

  if (groupPosition === "middle") {
    return isOwnMessage ? "ftc-bubble-own-stack-middle" : "ftc-bubble-other-stack-middle";
  }

  return isOwnMessage ? "ftc-bubble-own" : "ftc-bubble-other";
}

export function resolveChatMessageBubbleShellClass({
  isOwnMessage,
  text,
  hasAttachments = false,
  attachmentOnly = false,
  groupPosition = "standalone",
}: {
  isOwnMessage: boolean;
  text: string;
  hasAttachments?: boolean;
  attachmentOnly?: boolean;
  groupPosition?: ChatMessageGroupPosition;
}): string {
  const interaction = "[touch-action:pan-y]";

  if (attachmentOnly) {
    return `overflow-hidden ${interaction}`;
  }

  const base = resolveGroupedBubbleShellBaseClass(isOwnMessage, groupPosition);
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

/**
 * Shell for an app-generated notification (crew chat event updates) — a card,
 * deliberately not a speech bubble.
 *
 * Uniform `rounded-xl` with no tail corner is what separates it from the
 * conversation: every user message has an asymmetric corner pointing at its
 * sender, so dropping that reads as "nobody said this". The dark slate
 * surface plus a low-alpha cyan hairline are existing palette tokens, so it
 * stays inside FTC's language without introducing a colour — and it never
 * uses the primary fill, which is what made these look like outgoing
 * messages in the first place. No shadow, one hairline border.
 *
 * Border alpha is deliberately below the shared `--ftc-color-primary-border`
 * token (0.28): at full token strength the outline competed with the blue
 * heading and read as a status/warning frame rather than a quiet notice.
 * `border-ftc-primary/20` keeps the same hue from the registered theme colour
 * — no duplicated literal — while letting the heading stay the one strong
 * blue in the card.
 */
export function resolveChatSystemCardShellClass(): string {
  return [
    "overflow-hidden [touch-action:pan-y] w-fit max-w-full select-none sm:select-text",
    "rounded-xl border border-ftc-primary/20",
    "bg-[var(--ftc-color-bg-surface-raised)] px-3 py-2.5",
  ].join(" ");
}

export function resolveChatMessageBubbleTextClass(_text: string): string {
  return "text-[15px] leading-normal whitespace-pre-wrap break-words";
}
