import {
  DM_CHAT_MEANINGFUL_TIME_GAP_MS,
  formatDmDaySeparatorLabel,
} from "@/lib/dm/dmChatTimestampVisibility";
import {
  isGroupChatSystemUpdateMessage,
  isHiddenCrewRosterNotice,
} from "@/lib/groupChatSystemMessages";

/** Enough of a crew-chat row to decide whether it paints anything. */
export type GroupChatTimestampMessage = {
  id: string;
  created_at: string;
  text: string;
  /** Image/file rows carry no text — they are still visible messages. */
  hasAttachments?: boolean;
};

/**
 * Whether a row actually paints something.
 *
 * A separator must only ever mark a boundary between two *visible* message
 * groups. Clustering over rows that render nothing is what produced runs of
 * centred timestamps with no message between them, so this mirrors DM, whose
 * builder classifies and drops `hidden` rows before clustering.
 *
 * The three invisible cases, all of which really occur:
 *  - legacy crew-roster notices, hidden at read time (see groupChatSystemMessages);
 *  - a row with neither text nor attachments, which GroupChatMessageBubble
 *    early-returns `null` for (a failed upload, or an image row observed
 *    before its attachment rows arrive).
 * Everything else — chat text, images, event-update cards, system notices —
 * paints, so it clusters.
 */
export function isVisibleGroupChatMessage(message: {
  text: string;
  hasAttachments?: boolean;
}): boolean {
  const trimmed = message.text.trim();

  if (isHiddenCrewRosterNotice(trimmed)) {
    return false;
  }

  if (isGroupChatSystemUpdateMessage(trimmed)) {
    return true;
  }

  return trimmed.length > 0 || Boolean(message.hasAttachments);
}

export type GroupChatTimestampLayout = {
  /** Centred time-only separator before this message when a new time cluster begins on the same day. */
  showTimeSeparatorBefore: boolean;
  /**
   * Centred day separator (TODAY / YESTERDAY / date) before this message when it starts a
   * new calendar day — including the first message in the loaded history. Takes precedence
   * over showTimeSeparatorBefore (never show both for the same boundary).
   */
  showDaySeparatorBefore: boolean;
  /** Label for the day separator; set only when showDaySeparatorBefore is true. */
  daySeparatorLabel: string | undefined;
};

function resolveMessageTimestampMs(createdAt: string): number {
  const timestampMs = new Date(createdAt).getTime();

  return Number.isNaN(timestampMs) ? 0 : timestampMs;
}

function hasMeaningfulGapBetween(
  earlierCreatedAt: string,
  laterCreatedAt: string | undefined,
): boolean {
  if (!laterCreatedAt) {
    return false;
  }

  const earlierMs = resolveMessageTimestampMs(earlierCreatedAt);
  const laterMs = resolveMessageTimestampMs(laterCreatedAt);

  if (earlierMs === 0 || laterMs === 0) {
    return false;
  }

  return laterMs - earlierMs >= DM_CHAT_MEANINGFUL_TIME_GAP_MS;
}

function toValidDate(createdAt: string): Date | null {
  const timestampMs = new Date(createdAt).getTime();

  return Number.isNaN(timestampMs) ? null : new Date(timestampMs);
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Crew chat's day/time separator clustering — the same rhythm and the same
 * shape as DM (see `buildDmConversationTimestampLayout`): classify first,
 * drop what never paints, then cluster over what is left. Crew chat needs no
 * booking-card/timeline classification, so its visibility rule is simpler,
 * but the "cluster only over visible rows" guarantee is identical.
 *
 * Rows that paint nothing get no entry in the returned map at all, so their
 * caller renders no separator for them.
 */
export function buildGroupChatTimestampLayout(
  messages: readonly GroupChatTimestampMessage[],
  options?: {
    /** Reference "now" for TODAY/YESTERDAY day labels — injectable for deterministic tests. */
    now?: Date;
  },
): Map<string, GroupChatTimestampLayout> {
  const now = options?.now ?? new Date();
  const layoutByMessageId = new Map<string, GroupChatTimestampLayout>();
  const visibleMessages = messages.filter(isVisibleGroupChatMessage);

  for (let index = 0; index < visibleMessages.length; index += 1) {
    const message = visibleMessages[index];
    const previous = visibleMessages[index - 1];
    const messageDate = toValidDate(message.created_at);
    const previousDate = previous ? toValidDate(previous.created_at) : null;

    // First message in the loaded history always gets a day marker
    // (Instagram always shows a date header above the earliest loaded messages).
    const showDaySeparatorBefore = Boolean(
      messageDate && (!previous || !previousDate || !isSameCalendarDay(previousDate, messageDate)),
    );
    const daySeparatorLabel =
      showDaySeparatorBefore && messageDate
        ? formatDmDaySeparatorLabel(messageDate, now)
        : undefined;
    // A day separator already marks this boundary — never stack a redundant time separator on it.
    const showTimeSeparatorBefore =
      !showDaySeparatorBefore &&
      Boolean(previous && hasMeaningfulGapBetween(previous.created_at, message.created_at));

    layoutByMessageId.set(message.id, {
      showTimeSeparatorBefore,
      showDaySeparatorBefore,
      daySeparatorLabel,
    });
  }

  return layoutByMessageId;
}
