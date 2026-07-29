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

/** Avatar slot — matches ProfileAvatar sm (h-8 w-8). */
export const CHAT_INCOMING_AVATAR_SLOT_CLASS = "block h-8 w-8 shrink-0";

/** Fixed avatar column — wide enough for a single-line timestamp beneath the avatar. */
export const CHAT_INCOMING_AVATAR_COLUMN_WIDTH_CLASS = "w-12";

/** Incoming row grid: fixed avatar column + message column. */
export const CHAT_INCOMING_ROW_GRID_CLASS =
  "grid grid-cols-[3rem_minmax(0,1fr)] gap-x-1";

/** Cluster-end rows split bubble and metadata so avatar tracks the final bubble. */
export const CHAT_INCOMING_ROW_GRID_CLUSTER_END_CLASS = "grid-rows-[auto_auto] gap-y-0.5";

/** Bottom-align avatar with the bubble on row 1 (cluster end only). */
export const CHAT_INCOMING_AVATAR_CELL_CLASS =
  "col-start-1 row-start-1 justify-self-center self-end";

/** Bubble only on cluster end row 1. */
export const CHAT_INCOMING_BUBBLE_CELL_CLASS =
  "col-start-2 row-start-1 min-w-0 w-full flex flex-col items-start";

/** First/middle rows stack bubble content in the same column. */
export const CHAT_INCOMING_BUBBLE_STACK_CLASS = "gap-0.5";

/** @deprecated Reactions anchor to the bubble via absolute positioning. */
export const CHAT_INCOMING_REACTIONS_INLINE_CLASS = "min-w-0";

/** @deprecated Reactions anchor to the bubble via absolute positioning. */
export const CHAT_INCOMING_REACTIONS_CELL_CLASS = "col-start-2 row-start-2 min-w-0 -mt-0.5";

/** Timestamp sits under the avatar, never wraps. */
export const CHAT_INCOMING_TIMESTAMP_CELL_CLASS =
  "col-start-1 row-start-2 justify-self-center whitespace-nowrap text-[10px] leading-none text-ftc-text-muted";

/** @deprecated Use CHAT_INCOMING_BUBBLE_CELL_CLASS */
export const CHAT_INCOMING_MESSAGE_COLUMN_CLASS = CHAT_INCOMING_BUBBLE_CELL_CLASS;

/** DM incoming column — no avatar column; bubbles align flush left. */
export const DM_INCOMING_MESSAGE_COLUMN_CLASS =
  "flex min-w-0 w-full flex-col items-start gap-0.5";

/** DM timestamp beneath the bubble/reactions stack at cluster end. */
export const DM_INCOMING_TIMESTAMP_CLASS =
  "self-start whitespace-nowrap px-0.5 text-[10px] leading-none text-ftc-text-muted";

/** Minimal in-flow gutter — half the reaction pill height (pill min-h-[1.125rem]). */
export const CHAT_MESSAGE_REACTION_GUTTER_CLASS = "h-2.5 shrink-0";

/** Grid-participant layout: bubble on row 1, gutter on row 2 (incoming DM avatar alignment). */
export const CHAT_MESSAGE_BUBBLE_GRID_BUBBLE_CLASS =
  "col-start-2 row-start-1 relative w-fit max-w-full min-w-0 overflow-visible";

export const CHAT_MESSAGE_BUBBLE_GRID_GUTTER_CLASS = `col-start-2 row-start-2 ${CHAT_MESSAGE_REACTION_GUTTER_CLASS}`;

/**
 * Corner-anchored overlay — vertically centred on the bubble bottom edge (50% overlap).
 * Horizontal edge aligns with the bubble corner; no arbitrary pixel offsets.
 */
export function resolveMessageReactionsOverlayClass(isOwnMessage: boolean): string {
  const base = "pointer-events-none absolute bottom-0 z-10 translate-y-1/2";

  return isOwnMessage ? `${base} right-0` : `${base} left-0`;
}

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

export function isIncomingClusterEnd(
  groupPosition: ChatMessageGroupPosition,
): boolean {
  return groupPosition === "last" || groupPosition === "standalone";
}

/**
 * Tighten stacked incoming bubbles. Uses negative bottom margin because the message
 * list is `flex-col-reverse` (newer DOM nodes sit visually below older ones).
 */
export const CHAT_INCOMING_GROUP_TIGHT_MIDDLE_CLASS = "-mb-4";
export const CHAT_INCOMING_GROUP_TIGHT_LAST_CLASS = "-mb-3.5";

/** Breathing room after a cluster footer before the next sender. */
export const CHAT_INCOMING_GROUP_CLUSTER_END_CLASS = "mb-1.5";

/** Scroll list padding — flex-col-reverse: `pb-*` clears the fixed header at the visual top. */
export const CHAT_MESSAGE_LIST_CLASS = "flex flex-col-reverse gap-3 pb-4 pt-2";

/** DM / group chat message scroller — asymmetric padding keeps header clearance at scroll top. */
export const CHAT_MESSAGE_SCROLLER_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [overflow-anchor:none] px-3 pb-4 pt-2 sm:px-4";

/** @deprecated Group chat still uses legacy outgoing tight class. */
export const CHAT_OUTGOING_GROUP_TIGHT_PREVIOUS_CLASS = "-mt-2.5";

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
}: {
  position: ChatMessageGroupPosition;
  isClusterEnd: boolean;
  /** @deprecated Reactions no longer affect grouping margins. */
  hasReactions?: boolean;
}): string {
  return [
    "group/message flex justify-end",
    resolveIncomingGroupTightMarginClass(position),
    isClusterEnd ? CHAT_INCOMING_GROUP_CLUSTER_END_CLASS : "",
  ]
    .filter(Boolean)
    .join(" ");
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

function resolveIncomingGroupTightMarginClass(position: ChatMessageGroupPosition): string {
  switch (position) {
    case "middle":
      return CHAT_INCOMING_GROUP_TIGHT_MIDDLE_CLASS;
    case "last":
      return CHAT_INCOMING_GROUP_TIGHT_LAST_CLASS;
    default:
      return "";
  }
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
}: {
  position: ChatMessageGroupPosition;
  isClusterEnd: boolean;
  showTimestamp?: boolean;
  /** @deprecated Reactions no longer affect grouping margins. */
  hasReactions?: boolean;
}): string {
  return [
    "group/message flex justify-start",
    resolveIncomingGroupTightMarginClass(position),
    isClusterEnd ? CHAT_INCOMING_GROUP_CLUSTER_END_CLASS : "",
  ]
    .filter(Boolean)
    .join(" ");
}
