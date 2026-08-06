import type { ChatMessageGroupPosition } from "./chatMessageGroupLayout";

/** Single-line messages at or below this length render as compact pills. */
export const CHAT_BUBBLE_COMPACT_MAX_LENGTH = 42;

/** Floor for short/compact pills — keeps a one- or two-character bubble tappable. */
export const CHAT_BUBBLE_MIN_WIDTH_SHORT_CLASS = "min-w-[2.75rem]";

/**
 * Floor for long/multiline bubbles. Their text sets `overflow-wrap: break-word`,
 * so min-content is one character wide and the bubble can otherwise collapse
 * into a vertical column of single letters. 8rem guarantees several words per
 * line while staying well under the natural width at every supported viewport,
 * so normal messages are unaffected.
 */
export const CHAT_BUBBLE_MIN_WIDTH_LONG_CLASS = "min-w-[8rem]";

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
  // Every branch carries a min-width floor. The long/multiline branch used to
  // be the only one without one, and it is the only branch whose text sets
  // `overflow-wrap: break-word` — meaning its min-content width is a SINGLE
  // CHARACTER. The bubble is `w-fit max-w-full`, and that `max-width: 100%`
  // resolves against an ancestor column carrying `min-w-0`, which explicitly
  // permits shrinking below min-content. Whenever that column resolved narrow,
  // the bubble followed it down to ~32px and the message rendered one
  // character per line. Measured: 251.6px -> 32px under that pressure, and the
  // floor holds it at 128px. `LONG` sits far below the natural width at every
  // supported viewport (85% of 296px = 251.6px at 320px wide), so this changes
  // nothing in normal rendering — it is purely a lower bound.
  const padding = hasAttachments
    ? "p-1"
    : veryShort
      ? `${CHAT_BUBBLE_MIN_WIDTH_SHORT_CLASS} px-3 py-1`
      : compact
        ? `${CHAT_BUBBLE_MIN_WIDTH_SHORT_CLASS} px-3.5 py-1.5`
        : `${CHAT_BUBBLE_MIN_WIDTH_LONG_CLASS} px-4 py-2.5`;

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

export function resolveChatMessageBubbleTextClass(
  _text: string,
  options?: { isOwnMessage?: boolean },
): string {
  // Own bubbles: dark text on cyan reads optically thinner than light-on-dark
  // received text at the same weight (irradiation). Slight bump matches feel.
  const weight = options?.isOwnMessage ? "font-medium" : "font-normal";
  return `text-[15px] ${weight} leading-normal whitespace-pre-wrap break-words`;
}
