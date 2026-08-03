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
export const CHAT_LIST_ITEM_WITHIN_GROUP_SPACING_CLASS = "mb-1.5";

/**
 * Crew chat's own, slightly tighter rhythm — used only by
 * resolveIncomingGroupLiClass/resolveOutgoingGroupLiClass (crew chat's sole
 * callers). DM calls resolveMessageGroupLiClass directly and never passes
 * `spacing`, so its values above are untouched.
 */
export const GROUP_CHAT_LIST_ITEM_WITHIN_GROUP_SPACING_CLASS = "mb-1";
export const GROUP_CHAT_LIST_ITEM_CLUSTER_END_SPACING_CLASS = "mb-2.5";

/**
 * App-generated system card (crew chat event updates) — reads as a timeline
 * event rather than a turn in the conversation, so it gets a little more air
 * on BOTH sides than a normal message does.
 *
 * DIRECTION — measured in the browser, because the comment here used to claim
 * the opposite and the card's spacing was built on that claim. `column-reverse`
 * reverses the ORDER items are laid out in, not which physical edge a margin
 * sits on: `margin-bottom` is still physically below the row, and the row
 * physically below is the chronologically NEWER one. So `mb` opens the gap
 * visually BELOW and `mt` the gap visually ABOVE. Flex margins also do not
 * collapse, so adjacent rows' margins add.
 *
 * Net effect here, verified live: 24px below (`mb-6`), and 16px above — 6px of
 * `mt-1.5` plus the 10px `mb-2.5` the preceding cluster end already contributes.
 * The extra weight sits BELOW on purpose: a card closes whatever came before it
 * and the next sender group starts fresh underneath, so the larger gap is the
 * one that separates it from that new group.
 */
export const GROUP_CHAT_SYSTEM_CARD_SPACING_CLASS = "mb-6 mt-1.5";

/**
 * Same card, but with a centred day/time separator directly above it. The
 * separator already supplies the break, so the top gap stays tight (matching
 * CHAT_LIST_ITEM_CLUSTER_START_AFTER_TIMESTAMP_SPACING_CLASS) while the extra
 * space below is kept.
 *
 * The axes here were the wrong way round until the direction above was actually
 * measured: `mb-0.5 mt-1.5` put the tight 2px BELOW the card and the loose 6px
 * above, so a card following a separator glued itself to the message group
 * underneath — 2px, tighter than the 4px between two messages from one sender,
 * i.e. the opposite of the separation this constant exists to provide. Swapping
 * them delivers the documented intent: a tight top and the full gap below.
 *
 * `mt-0` rather than a small value, so the gap under a centred separator is the
 * separator's own 2px and NOTHING else — byte-identical to what a normal
 * message gets there (CHAT_LIST_ITEM_CLUSTER_START_AFTER_TIMESTAMP_SPACING_CLASS
 * declares no `mt` at all). Measured before: 2px to a bubble but 4px to a card,
 * so a timestamp sat visibly lower over an event card than over a message.
 */
export const GROUP_CHAT_SYSTEM_CARD_AFTER_TIMESTAMP_SPACING_CLASS = "mb-6 mt-0";

/** @deprecated Reaction space is reserved in-flow on the reacted message only — do not propagate list margins. */
export const CHAT_LIST_ITEM_AFTER_REACTION_SPACING_CLASS = "mb-1.5";

/** End of a sender cluster before a different sender. */
export const CHAT_LIST_ITEM_CLUSTER_END_SPACING_CLASS = "mb-3.5";

/** Cluster end immediately above a centred timestamp — must clear reaction hang below bubble. */
export const CHAT_LIST_ITEM_CLUSTER_END_BEFORE_TIMESTAMP_SPACING_CLASS =
  CHAT_LIST_ITEM_CLUSTER_END_SPACING_CLASS;

/** Cluster start (standalone) immediately below a centred timestamp. */
export const CHAT_LIST_ITEM_CLUSTER_START_AFTER_TIMESTAMP_SPACING_CLASS = "mb-0.5";

/** Centred timestamp separator — thin band, balanced above and below. */
export const CHAT_TIME_SEPARATOR_SPACING_CLASS = "my-0.5";

/** Seen / delivered label beneath the final outgoing bubble (no reactions). */
export const CHAT_SEEN_LABEL_SPACING_CLASS = "mt-0.5";

/** Seen / delivered when a reaction badge overlaps the bubble corner. */
export const CHAT_SEEN_LABEL_WITH_REACTIONS_SPACING_CLASS = "mt-2";

/** @deprecated Reactions overlap the inter-message gap — no document-flow reserve. */
export const CHAT_MESSAGE_REACTION_OVERLAP_RESERVE_CLASS = "";

/** Scroll list — flex-col-reverse: `pb-*` clears the fixed header at the visual top. */
export const CHAT_MESSAGE_LIST_CLASS = "flex flex-col-reverse gap-0 pb-4 pt-2";

/**
 * DM-only scroll list in normal chronological DOM order (oldest → newest, top → bottom).
 * `justify-end` keeps short conversations resting at the visual bottom without a reversed
 * DOM order, so `scrollTop === maxScrollTop` on the (non-reversed) scroller reliably means
 * "showing the newest message" for long conversations too.
 */
export const DM_CHAT_MESSAGE_LIST_CLASS = "flex flex-col justify-end gap-0 pt-2 pb-4";

/** DM / group chat message scroller — asymmetric padding keeps header clearance at scroll top. */
export const CHAT_MESSAGE_SCROLLER_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [overflow-anchor:none] px-3 pb-4 pt-2 sm:px-4";

/** Compact Instagram-style badge — subtle corner-attached weight. */
export const CHAT_MESSAGE_REACTION_PILL_CLASS =
  "inline-flex max-w-none flex-nowrap items-center gap-0 rounded-full border border-ftc-border-subtle/50 bg-ftc-bg-elevated/90 px-0.5 py-0 shadow-[0_1px_2px_rgba(0,0,0,0.12)]";

/** Pill enter/exit animation — scale 0.8 ↔ 1.0 with light spring. */
export const CHAT_MESSAGE_REACTION_PILL_ANIMATION_MS = 160;

export const CHAT_MESSAGE_REACTION_PILL_TRANSITION_CLASS =
  "transition-[opacity,transform] duration-[160ms] ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none motion-reduce:transform-none";

export const CHAT_MESSAGE_REACTION_PILL_VISIBLE_CLASS = "scale-100 opacity-100";

export const CHAT_MESSAGE_REACTION_PILL_HIDDEN_CLASS =
  "scale-[0.8] opacity-0 pointer-events-none";

/** Emoji control inside the pill — pill supplies horizontal padding. */
export const CHAT_MESSAGE_REACTION_EMOJI_BUTTON_CLASS =
  "inline-flex h-3.5 shrink-0 items-center justify-center rounded-full p-0 text-xs leading-none";

/** Interactive controls inside the pill wrapper. */
export const CHAT_MESSAGE_REACTIONS_STACK_CLASS = "pointer-events-auto";

/**
 * Bubble frame — positioning context for the reaction slot (zero document-flow height).
 */
export const CHAT_MESSAGE_BUBBLE_FRAME_CLASS = "relative w-fit max-w-full";

/**
 * Reaction slot base — anchored to bubble bottom edge; horizontal + overlap are
 * separate tokens so every message shape shares one overlap value.
 */
export const CHAT_MESSAGE_REACTION_SLOT_BASE_CLASS =
  "pointer-events-none absolute top-full z-10 flex";

/** Overlap ≈ 70% of pill height (h-3.5) — hugs corner, minimal gap invasion. */
export const CHAT_MESSAGE_REACTION_SLOT_OVERLAP_CLASS = "-mt-3";

export const CHAT_MESSAGE_REACTION_SLOT_OUTGOING_CLASS = "left-0";

export const CHAT_MESSAGE_REACTION_SLOT_INCOMING_CLASS = "right-0";

/** @deprecated Compose via resolveMessageReactionSlotClass. */
export const CHAT_MESSAGE_REACTION_SLOT_CLASS = [
  CHAT_MESSAGE_REACTION_SLOT_BASE_CLASS,
  CHAT_MESSAGE_REACTION_SLOT_OVERLAP_CLASS,
  CHAT_MESSAGE_REACTION_SLOT_OUTGOING_CLASS,
].join(" ");

/** @deprecated Reactions are absolutely positioned — no in-flow footer. */
export const CHAT_MESSAGE_REACTION_FOOTER_BASE_CLASS = CHAT_MESSAGE_REACTION_SLOT_CLASS;

/** @deprecated */
export const CHAT_MESSAGE_REACTION_FOOTER_ALIGN_CLASS = "";

/** @deprecated */
export const CHAT_MESSAGE_REACTION_FOOTER_OUTGOING_CLASS = "";

/** @deprecated */
export const CHAT_MESSAGE_REACTION_FOOTER_INCOMING_CLASS = "";

/** @deprecated Zero-height hanger replaced by in-flow footer with real height. */
export const CHAT_MESSAGE_REACTION_HANGER_BASE_CLASS =
  CHAT_MESSAGE_REACTION_FOOTER_BASE_CLASS;

/** @deprecated */
export const CHAT_MESSAGE_REACTION_HANGER_OUTGOING_CLASS =
  CHAT_MESSAGE_REACTION_FOOTER_OUTGOING_CLASS;

/** @deprecated */
export const CHAT_MESSAGE_REACTION_HANGER_INCOMING_CLASS =
  CHAT_MESSAGE_REACTION_FOOTER_INCOMING_CLASS;

/** @deprecated Padding hack removed — footer height reserves Seen/status clearance. */
export const CHAT_MESSAGE_REACTION_STACK_PAD_CLASS = "";

/** @deprecated Absolute overlay replaced by in-flow hanger. */
export const CHAT_MESSAGE_REACTION_ANCHOR_VERTICAL_CLASS = "";

/** @deprecated Absolute overlay replaced by in-flow hanger. */
export const CHAT_MESSAGE_REACTION_ANCHOR_TRANSLATE_Y_CLASS = "";

/** @deprecated Absolute overlay replaced by in-flow hanger. */
export const CHAT_MESSAGE_REACTION_ANCHOR_NUDGE_OUTGOING_CLASS = "";

/** @deprecated Absolute overlay replaced by in-flow hanger. */
export const CHAT_MESSAGE_REACTION_ANCHOR_NUDGE_INCOMING_CLASS = "";

/** @deprecated Use CHAT_MESSAGE_REACTION_HANGER_* alignment classes. */
export const CHAT_MESSAGE_REACTION_ANCHOR_INSET_OUTGOING_CLASS = "right-0.5";

/** @deprecated Use CHAT_MESSAGE_REACTION_HANGER_* alignment classes. */
export const CHAT_MESSAGE_REACTION_ANCHOR_INSET_INCOMING_CLASS = "left-0.5";

/**
 * Reaction badge footer — in-flow row below bubble inside the bubble frame.
 */
export function resolveSeenLabelSpacingClass(hasReactions: boolean): string {
  return hasReactions
    ? CHAT_SEEN_LABEL_WITH_REACTIONS_SPACING_CLASS
    : CHAT_SEEN_LABEL_SPACING_CLASS;
}

export function resolveMessageReactionSlotClass(isOwnMessage = false): string {
  return [
    CHAT_MESSAGE_REACTION_SLOT_BASE_CLASS,
    CHAT_MESSAGE_REACTION_SLOT_OVERLAP_CLASS,
    isOwnMessage
      ? CHAT_MESSAGE_REACTION_SLOT_OUTGOING_CLASS
      : CHAT_MESSAGE_REACTION_SLOT_INCOMING_CLASS,
  ].join(" ");
}

/** @deprecated Use resolveMessageReactionSlotClass. */
export function resolveMessageReactionFooterClass(isOwnMessage?: boolean): string {
  return resolveMessageReactionSlotClass(isOwnMessage);
}

/** @deprecated Use resolveMessageReactionFooterClass. */
export function resolveMessageReactionHangerClass(isOwnMessage: boolean): string {
  return resolveMessageReactionFooterClass(isOwnMessage);
}

/** @deprecated Use resolveMessageReactionFooterClass. */
export function resolveMessageReactionAnchorClass(isOwnMessage: boolean): string {
  return resolveMessageReactionFooterClass(isOwnMessage);
}

/** @deprecated In-flow row removed — reactions no longer affect list-item height. */
export function resolveMessageReactionRowClass(isOwnMessage: boolean): string {
  return resolveMessageReactionAnchorClass(isOwnMessage);
}

/** @deprecated Use resolveMessageReactionAnchorClass. */
export function resolveMessageReactionsOverlayClass(isOwnMessage: boolean): string {
  return resolveMessageReactionAnchorClass(isOwnMessage);
}

export function isIncomingClusterEnd(
  groupPosition: ChatMessageGroupPosition,
): boolean {
  return groupPosition === "last" || groupPosition === "standalone";
}

/** DM's own rhythm (default) vs crew chat's slightly tighter one — see the constants above. */
export type ChatMessageSpacingVariant = "default" | "compact";

function resolveMessageListItemSpacingClass({
  position,
  followedByTimeSeparator,
  precededByTimeSeparator,
  spacing,
}: {
  position: ChatMessageGroupPosition;
  followedByTimeSeparator: boolean;
  precededByTimeSeparator: boolean;
  spacing: ChatMessageSpacingVariant;
}): string {
  const withinGroupClass =
    spacing === "compact"
      ? GROUP_CHAT_LIST_ITEM_WITHIN_GROUP_SPACING_CLASS
      : CHAT_LIST_ITEM_WITHIN_GROUP_SPACING_CLASS;
  const clusterEndClass =
    spacing === "compact"
      ? GROUP_CHAT_LIST_ITEM_CLUSTER_END_SPACING_CLASS
      : CHAT_LIST_ITEM_CLUSTER_END_SPACING_CLASS;

  // flex-col-reverse: margin-bottom opens toward the visually NEWER sibling
  // below (see the direction note on GROUP_CHAT_SYSTEM_CARD_SPACING_CLASS —
  // column-reverse reverses layout order, not which edge a margin sits on).
  // Any message directly above a centred timestamp must clear absolute reaction hang.
  if (followedByTimeSeparator) {
    return spacing === "compact"
      ? clusterEndClass
      : CHAT_LIST_ITEM_CLUSTER_END_BEFORE_TIMESTAMP_SPACING_CLASS;
  }

  // Same-sender stack — uniform tight gap for every non-terminal group position.
  if (position === "first" || position === "middle") {
    return withinGroupClass;
  }

  // Newest in group — margin opens toward the next sender / timestamp below.
  if (position === "last") {
    return clusterEndClass;
  }

  // Standalone — cluster boundary toward a different sender above.
  if (precededByTimeSeparator) {
    return CHAT_LIST_ITEM_CLUSTER_START_AFTER_TIMESTAMP_SPACING_CLASS;
  }

  return clusterEndClass;
}

/** Shared list-item spacing for incoming and outgoing DM bubbles. */
export function resolveMessageGroupLiClass({
  isOwnMessage,
  position,
  isClusterEnd,
  followedByTimeSeparator = false,
  precededByTimeSeparator = false,
  spacing = "default",
}: {
  isOwnMessage: boolean;
  position: ChatMessageGroupPosition;
  isClusterEnd: boolean;
  /** A centred timestamp separator sits directly below this cluster end. */
  followedByTimeSeparator?: boolean;
  /** This message begins a time cluster — timestamp sits directly above. */
  precededByTimeSeparator?: boolean;
  /** DM never passes this — its calls always get the "default" rhythm above. */
  spacing?: ChatMessageSpacingVariant;
}): string {
  return [
    "group/message flex",
    isOwnMessage ? "justify-end" : "justify-start",
    resolveMessageListItemSpacingClass({
      position,
      followedByTimeSeparator,
      precededByTimeSeparator,
      spacing,
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

/**
 * Outgoing row — same flex-col-reverse grouping margins as incoming.
 * Crew chat's only caller, so it always requests the "compact" rhythm.
 */
export function resolveOutgoingGroupLiClass({
  position,
  isClusterEnd,
  followedByTimeSeparator = false,
  precededByTimeSeparator = false,
}: {
  position: ChatMessageGroupPosition;
  isClusterEnd: boolean;
  followedByTimeSeparator?: boolean;
  precededByTimeSeparator?: boolean;
  /** @deprecated Reactions no longer affect grouping margins. */
  hasReactions?: boolean;
  /** @deprecated Reaction space is reserved in-flow on the reacted message only. */
  previousInGroupHadReactions?: boolean;
}): string {
  return resolveMessageGroupLiClass({
    isOwnMessage: true,
    position,
    isClusterEnd,
    followedByTimeSeparator,
    precededByTimeSeparator,
    spacing: "compact",
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

/**
 * List-item class for an app-generated system card row.
 *
 * Deliberately NOT `resolveIncomingGroupLiClass(...) + extra margins`: that
 * resolver already emits `mb-2.5`, and two margin utilities on one element
 * resolve by stylesheet order, not by class-attribute order, so appending
 * `mb-4` would be a coin flip. Composing the row here instead keeps exactly
 * one margin utility per axis.
 *
 * `justify-start` is load-bearing: these cards are left-aligned on purpose,
 * for the planner who triggered the update as well as for the crew.
 */
export function resolveSystemCardGroupLiClass({
  precededByTimeSeparator = false,
}: {
  /** A centred day/time separator sits directly above this card. */
  precededByTimeSeparator?: boolean;
} = {}): string {
  return [
    "group/message flex justify-start",
    precededByTimeSeparator
      ? GROUP_CHAT_SYSTEM_CARD_AFTER_TIMESTAMP_SPACING_CLASS
      : GROUP_CHAT_SYSTEM_CARD_SPACING_CLASS,
  ].join(" ");
}

/** Crew chat's only caller, so it always requests the "compact" rhythm. */
export function resolveIncomingGroupLiClass({
  position,
  isClusterEnd,
  followedByTimeSeparator = false,
  precededByTimeSeparator = false,
}: {
  position: ChatMessageGroupPosition;
  isClusterEnd: boolean;
  followedByTimeSeparator?: boolean;
  precededByTimeSeparator?: boolean;
  /** @deprecated Reactions no longer affect grouping margins. */
  hasReactions?: boolean;
  /** @deprecated Reaction space is reserved in-flow on the reacted message only. */
  previousInGroupHadReactions?: boolean;
}): string {
  return resolveMessageGroupLiClass({
    isOwnMessage: false,
    position,
    isClusterEnd,
    followedByTimeSeparator,
    precededByTimeSeparator,
    spacing: "compact",
  });
}
