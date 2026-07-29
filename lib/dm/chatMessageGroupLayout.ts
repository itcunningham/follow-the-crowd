import { DM_CHAT_MEANINGFUL_TIME_GAP_MS } from "@/lib/dm/dmChatTimestampVisibility";

export type ChatMessageGroupParticipant = {
  id: string;
  user_id: string;
  /** ISO timestamp — consecutive same-sender groups break after the meaningful time gap. */
  created_at?: string;
  /** When false, breaks same-sender grouping (booking cards). */
  groupable?: boolean;
};

export type ChatMessageGroupPosition = "standalone" | "first" | "middle" | "last";

export type ChatMessageGroupLayout = {
  position: ChatMessageGroupPosition;
  /** Group cluster end — show avatar (group chat) or visible timestamp (DM). */
  showAvatar: boolean;
  /** Pull toward the visually older message above (flex-col-reverse safe). */
  tightWithPrevious: boolean;
};

/** Avatar slot — width reservation only; height comes from the avatar on cluster end. */
export const CHAT_INCOMING_AVATAR_SLOT_CLASS = "block w-8 shrink-0";

/** Fixed avatar column — wide enough for a single-line timestamp beneath the avatar. */
export const CHAT_INCOMING_AVATAR_COLUMN_WIDTH_CLASS = "w-12";

/** Incoming row grid: fixed avatar column + message column. */
export const CHAT_INCOMING_ROW_GRID_CLASS =
  "grid grid-cols-[3rem_minmax(0,1fr)] gap-x-1";

/** Bottom-align avatar with the bubble on row 1 (cluster end only). */
export const CHAT_INCOMING_AVATAR_CELL_CLASS =
  "col-start-1 row-start-1 justify-self-center self-end";

/** Bubble column on incoming rows. */
export const CHAT_INCOMING_BUBBLE_CELL_CLASS =
  "col-start-2 row-start-1 min-w-0 w-full flex flex-col items-start";

/** @deprecated Use CHAT_INCOMING_BUBBLE_CELL_CLASS */
export const CHAT_INCOMING_MESSAGE_COLUMN_CLASS = CHAT_INCOMING_BUBBLE_CELL_CLASS;

/** DM incoming column — no avatar column; bubbles align flush left. */
export const DM_INCOMING_MESSAGE_COLUMN_CLASS =
  "flex min-w-0 w-full flex-col items-start gap-0.5";

/** DM timestamp beneath the bubble/reactions stack at cluster end. */
export const DM_INCOMING_TIMESTAMP_CLASS =
  "self-start whitespace-nowrap px-0.5 text-[10px] leading-none text-ftc-text-muted";

/** @deprecated Reactions anchor to the bubble via absolute positioning. */
export const CHAT_INCOMING_REACTIONS_INLINE_CLASS = "min-w-0";

/** @deprecated Reactions anchor to the bubble via absolute positioning. */
export const CHAT_INCOMING_REACTIONS_CELL_CLASS = "col-start-2 row-start-2 min-w-0 -mt-0.5";

/** Timestamp sits under the avatar, never wraps. */
export const CHAT_INCOMING_TIMESTAMP_CELL_CLASS =
  "col-start-1 row-start-2 justify-self-center whitespace-nowrap text-[10px] leading-none text-ftc-text-muted";

/** @deprecated Group chat still uses legacy outgoing tight class. */
export const CHAT_INCOMING_ROW_GRID_CLUSTER_END_CLASS = "grid-rows-[auto_auto] gap-y-0.5";

/** @deprecated Group chat still uses legacy outgoing tight class. */
export const CHAT_INCOMING_BUBBLE_STACK_CLASS = "gap-0.5";

/** @deprecated Group chat still uses legacy outgoing tight class. */
export const CHAT_MESSAGE_BUBBLE_GRID_BUBBLE_CLASS =
  "col-start-2 row-start-1 relative w-fit max-w-full min-w-0 overflow-visible";

/** @deprecated Group chat still uses legacy outgoing tight class. */
export const CHAT_MESSAGE_BUBBLE_GRID_GUTTER_CLASS = "h-2.5 shrink-0 col-start-2 row-start-2";

/** @deprecated Reactions are in-flow; gutter spacer removed. */
export const CHAT_MESSAGE_REACTION_GUTTER_CLASS = "h-2.5 shrink-0";

/** @deprecated Group chat still uses legacy outgoing tight class. */
export const CHAT_OUTGOING_GROUP_TIGHT_PREVIOUS_CLASS = "-mt-2.5";

/** @deprecated Negative-margin tightening removed — use spacing tokens below. */
export const CHAT_INCOMING_GROUP_TIGHT_MIDDLE_CLASS = "-mb-4";

/** @deprecated Negative-margin tightening removed — use spacing tokens below. */
export const CHAT_INCOMING_GROUP_TIGHT_LAST_CLASS = "-mb-3.5";

/** @deprecated Use CHAT_LIST_ITEM_CLUSTER_END_SPACING_CLASS */
export const CHAT_INCOMING_GROUP_CLUSTER_END_CLASS = "mb-1.5";

/* -------------------------------------------------------------------------- */
/* Vertical rhythm — single source of truth (flex-col-reverse message list)    */
/* -------------------------------------------------------------------------- */

/**
 * Message list uses gap-0; every `<li>` spacing comes from resolveMessageGroupLiClass.
 * flex-col-reverse: positive margin-bottom opens space toward the visually older item above.
 */

/** Consecutive bubbles from the same sender (small Instagram-style gap). */
export const CHAT_LIST_ITEM_WITHIN_GROUP_SPACING_CLASS = "mb-1";

/** Same sender, but the visually older bubble had a reaction (pill needs room). */
export const CHAT_LIST_ITEM_AFTER_REACTION_SPACING_CLASS = "mb-2.5";

/** End of a sender cluster before a different sender or time band. */
export const CHAT_LIST_ITEM_CLUSTER_END_SPACING_CLASS = "mb-5";

/** Centred timestamp separator — compact band, no stacked list gap. */
export const CHAT_TIME_SEPARATOR_SPACING_CLASS = "my-2";

/** Scroll list — flex-col-reverse: `pb-*` clears the fixed header at the visual top. */
export const CHAT_MESSAGE_LIST_CLASS = "flex flex-col-reverse gap-0 pb-4 pt-2";

/** DM / group chat message scroller — asymmetric padding keeps header clearance at scroll top. */
export const CHAT_MESSAGE_SCROLLER_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [overflow-anchor:none] px-3 pb-4 pt-2 sm:px-4";

/** Compact Instagram-style pill — hugs emoji content on both sides. */
export const CHAT_MESSAGE_REACTION_PILL_CLASS =
  "inline-flex max-w-none flex-nowrap items-center gap-0 rounded-full border border-ftc-border-subtle bg-ftc-bg-elevated px-0 py-0 shadow-[0_1px_3px_rgba(0,0,0,0.22)]";

/** Pill enter/exit animation — scale 0.8 ↔ 1.0 with light spring. */
export const CHAT_MESSAGE_REACTION_PILL_ANIMATION_MS = 160;

export const CHAT_MESSAGE_REACTION_PILL_TRANSITION_CLASS =
  "transition-[opacity,transform] duration-[160ms] ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none motion-reduce:transform-none";

export const CHAT_MESSAGE_REACTION_PILL_VISIBLE_CLASS = "scale-100 opacity-100";

export const CHAT_MESSAGE_REACTION_PILL_HIDDEN_CLASS =
  "scale-[0.8] opacity-0 pointer-events-none";

/** Emoji tap target — compact visual, adequate touch area via min dimensions. */
export const CHAT_MESSAGE_REACTION_EMOJI_BUTTON_CLASS =
  "inline-flex min-h-[1.125rem] min-w-[1.125rem] shrink-0 items-center justify-center rounded-full p-0 text-xs leading-none";

/** Interactive controls inside the pill wrapper. */
export const CHAT_MESSAGE_REACTIONS_STACK_CLASS = "pointer-events-auto";

/**
 * In-flow reaction row — sits below the bubble, overlaps the corner via negative margin,
 * and reserves space so the next bubble never collides with the pill.
 */
export function resolveMessageReactionRowClass(isOwnMessage: boolean): string {
  const corner = isOwnMessage ? "justify-end pr-0.5" : "justify-start pl-0.5";

  return `flex w-full -mt-2.5 pt-0.5 ${corner}`;
}

/** @deprecated Absolute overlay removed — reactions are in-flow. */
export function resolveMessageReactionsOverlayClass(isOwnMessage: boolean): string {
  const base = "pointer-events-none absolute bottom-0 z-10 translate-y-1/2";

  return isOwnMessage ? `${base} right-0` : `${base} left-0`;
}

export function isIncomingClusterEnd(
  groupPosition: ChatMessageGroupPosition,
): boolean {
  return groupPosition === "last" || groupPosition === "standalone";
}

function resolveMessageListItemSpacingClass({
  position,
  isClusterEnd,
  previousInGroupHadReactions,
}: {
  position: ChatMessageGroupPosition;
  isClusterEnd: boolean;
  previousInGroupHadReactions: boolean;
}): string {
  if (isClusterEnd) {
    return CHAT_LIST_ITEM_CLUSTER_END_SPACING_CLASS;
  }

  if (position === "middle" || position === "last") {
    return previousInGroupHadReactions
      ? CHAT_LIST_ITEM_AFTER_REACTION_SPACING_CLASS
      : CHAT_LIST_ITEM_WITHIN_GROUP_SPACING_CLASS;
  }

  return "";
}

/** Shared list-item spacing for incoming and outgoing DM bubbles. */
export function resolveMessageGroupLiClass({
  isOwnMessage,
  position,
  isClusterEnd,
  previousInGroupHadReactions = false,
}: {
  isOwnMessage: boolean;
  position: ChatMessageGroupPosition;
  isClusterEnd: boolean;
  /** Visually older message in the same sender group had reactions. */
  previousInGroupHadReactions?: boolean;
}): string {
  return [
    "group/message flex",
    isOwnMessage ? "justify-end" : "justify-start",
    resolveMessageListItemSpacingClass({
      position,
      isClusterEnd,
      previousInGroupHadReactions,
    }),
  ]
    .filter(Boolean)
    .join(" ");
}

function resolveMessageTimestampMs(createdAt: string | undefined): number {
  if (!createdAt) {
    return 0;
  }

  const timestampMs = new Date(createdAt).getTime();

  return Number.isNaN(timestampMs) ? 0 : timestampMs;
}

function hasMeaningfulTimeGapBetweenParticipants(
  earlier: ChatMessageGroupParticipant,
  later: ChatMessageGroupParticipant,
): boolean {
  const earlierMs = resolveMessageTimestampMs(earlier.created_at);
  const laterMs = resolveMessageTimestampMs(later.created_at);

  if (earlierMs === 0 || laterMs === 0) {
    return false;
  }

  return laterMs - earlierMs >= DM_CHAT_MEANINGFUL_TIME_GAP_MS;
}

/** Outgoing row — same flex-col-reverse grouping margins as incoming. */
export function resolveOutgoingGroupLiClass({
  position,
  isClusterEnd,
  previousInGroupHadReactions = false,
}: {
  position: ChatMessageGroupPosition;
  isClusterEnd: boolean;
  previousInGroupHadReactions?: boolean;
  /** @deprecated Reactions no longer affect grouping margins. */
  hasReactions?: boolean;
}): string {
  return resolveMessageGroupLiClass({
    isOwnMessage: true,
    position,
    isClusterEnd,
    previousInGroupHadReactions,
  });
}

function findPreviousParticipant(
  messages: readonly ChatMessageGroupParticipant[],
  index: number,
): ChatMessageGroupParticipant | null {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    return messages[cursor];
  }

  return null;
}

function findNextParticipant(
  messages: readonly ChatMessageGroupParticipant[],
  index: number,
): ChatMessageGroupParticipant | null {
  for (let cursor = index + 1; cursor < messages.length; cursor += 1) {
    return messages[cursor];
  }

  return null;
}

function isGroupableParticipant(participant: ChatMessageGroupParticipant): boolean {
  return participant.groupable !== false;
}

function isSameSenderGroup(
  earlier: ChatMessageGroupParticipant | null,
  later: ChatMessageGroupParticipant | null,
): boolean {
  if (!earlier || !later) {
    return false;
  }

  if (earlier.user_id !== later.user_id) {
    return false;
  }

  if (!isGroupableParticipant(earlier) || !isGroupableParticipant(later)) {
    return false;
  }

  if (hasMeaningfulTimeGapBetweenParticipants(earlier, later)) {
    return false;
  }

  return true;
}

function resolveGroupPosition(
  sameSenderAsPrevious: boolean,
  sameSenderAsNext: boolean,
): ChatMessageGroupPosition {
  if (!sameSenderAsPrevious && !sameSenderAsNext) {
    return "standalone";
  }

  if (!sameSenderAsPrevious && sameSenderAsNext) {
    return "first";
  }

  if (sameSenderAsPrevious && sameSenderAsNext) {
    return "middle";
  }

  return "last";
}

/** Group consecutive text bubbles from the same sender for spacing + avatar layout. */
export function buildChatMessageGroupLayout(
  messages: readonly ChatMessageGroupParticipant[],
): Map<string, ChatMessageGroupLayout> {
  const layoutByMessageId = new Map<string, ChatMessageGroupLayout>();

  for (let index = 0; index < messages.length; index += 1) {
    const current = messages[index];
    const previous = findPreviousParticipant(messages, index);
    const next = findNextParticipant(messages, index);
    const sameSenderAsPrevious = isSameSenderGroup(previous, current);
    const sameSenderAsNext = isSameSenderGroup(current, next);
    const position = resolveGroupPosition(sameSenderAsPrevious, sameSenderAsNext);

    layoutByMessageId.set(current.id, {
      position,
      showAvatar: position === "last" || position === "standalone",
      tightWithPrevious: sameSenderAsPrevious,
    });
  }

  return layoutByMessageId;
}

export function resolveIncomingGroupLiClass({
  position,
  isClusterEnd,
  previousInGroupHadReactions = false,
}: {
  position: ChatMessageGroupPosition;
  isClusterEnd: boolean;
  previousInGroupHadReactions?: boolean;
  showTimestamp?: boolean;
  /** @deprecated Reactions no longer affect grouping margins. */
  hasReactions?: boolean;
}): string {
  return resolveMessageGroupLiClass({
    isOwnMessage: false,
    position,
    isClusterEnd,
    previousInGroupHadReactions,
  });
}
