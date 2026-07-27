import {
  evaluateDmBookingCardVisibility,
  isBookingActivityDmMessage,
  isBookingRequestMessage,
  parseEventCancellationActivityEventName,
  type BookingRequest,
} from "@/lib/bookingRequests";
import { isDmBookingSystemMessage } from "@/lib/dm/dmBookingSystemMessages";

/** Gap after which the next message starts a new timestamp cluster. */
export const DM_CHAT_MEANINGFUL_TIME_GAP_MS = 5 * 60 * 1000;

export type DmChatVisibleMessageKind = "timeline" | "chat" | "booking_card" | "hidden";

export type DmConversationTimestampLayout = {
  showTimestamp: boolean;
  compactBelow: boolean;
};

type ClassifiedConversationMessage = {
  id: string;
  created_at: string;
  kind: DmChatVisibleMessageKind;
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

export function classifyDmConversationMessageKind(
  messageText: string,
  options: {
    bookings: BookingRequest[];
    conversationId: string;
  },
): DmChatVisibleMessageKind {
  if (
    isBookingActivityDmMessage(messageText) &&
    parseEventCancellationActivityEventName(messageText)
  ) {
    return "hidden";
  }

  if (isDmBookingSystemMessage(messageText)) {
    return "timeline";
  }

  if (isBookingActivityDmMessage(messageText)) {
    return "hidden";
  }

  if (isBookingRequestMessage(messageText)) {
    const hideCard = evaluateDmBookingCardVisibility(
      messageText,
      options.bookings,
      options.conversationId,
    ).hideCard;

    return hideCard ? "timeline" : "booking_card";
  }

  return "chat";
}

/** Shared timestamp clustering for every visible DM conversation item. */
export function buildDmConversationTimestampLayout(
  messages: readonly { id: string; created_at: string; text: string }[],
  options: {
    bookings: BookingRequest[];
    conversationId: string;
  },
): Map<string, DmConversationTimestampLayout> {
  const layoutByMessageId = new Map<string, DmConversationTimestampLayout>();
  const visibleMessages: ClassifiedConversationMessage[] = messages
    .map((message) => ({
      id: message.id,
      created_at: message.created_at,
      kind: classifyDmConversationMessageKind(message.text, options),
    }))
    .filter((message) => message.kind !== "hidden");

  for (let index = 0; index < visibleMessages.length; index += 1) {
    const message = visibleMessages[index];
    const next = visibleMessages[index + 1];
    const showTimestamp =
      !next || hasMeaningfulGapBetween(message.created_at, next.created_at);
    const compactBelow = Boolean(
      next &&
        !showTimestamp &&
        message.kind === "timeline" &&
        next.kind === "timeline",
    );

    layoutByMessageId.set(message.id, {
      showTimestamp,
      compactBelow,
    });
  }

  return layoutByMessageId;
}
