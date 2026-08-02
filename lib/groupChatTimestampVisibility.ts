import {
  DM_CHAT_MEANINGFUL_TIME_GAP_MS,
  formatDmDaySeparatorLabel,
} from "@/lib/dm/dmChatTimestampVisibility";

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
 * Crew chat's own day/time separator clustering — same rhythm as DM
 * (see dmChatTimestampVisibility.ts) but without booking-card/timeline
 * classification, since crew chat messages are always either plain chat or
 * a system notice, both of which sit in a single flat timeline.
 */
export function buildGroupChatTimestampLayout(
  messages: readonly { id: string; created_at: string }[],
  options?: {
    /** Reference "now" for TODAY/YESTERDAY day labels — injectable for deterministic tests. */
    now?: Date;
  },
): Map<string, GroupChatTimestampLayout> {
  const now = options?.now ?? new Date();
  const layoutByMessageId = new Map<string, GroupChatTimestampLayout>();

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const previous = messages[index - 1];
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
