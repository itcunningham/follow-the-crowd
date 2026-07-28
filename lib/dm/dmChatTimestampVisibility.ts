import { formatIntegerRateDisplay } from "@/lib/bookingRate";
import {
  evaluateDmBookingCardVisibility,
  hasPendingRateProposal,
  isBookingActivityDmMessage,
  isBookingRequestMessage,
  parseEventCancellationActivityEventName,
  resolveLiveBookingForDmMessage,
  type BookingRequest,
} from "@/lib/bookingRequests";
import {
  DM_BOOKING_CANCELLED_MESSAGE,
  DM_BOOKING_CONFIRMED_MESSAGE,
  DM_BOOKING_ORIGINAL_OFFER_KEPT_MESSAGE,
  DM_BOOKING_PROPOSED_RATE_ACCEPTED_MESSAGE,
  DM_BOOKING_PROPOSED_RATE_PREFIX,
  DM_BOOKING_RATE_DECLINED_MESSAGE,
  DM_BOOKING_REQUEST_DECLINED_MESSAGE,
  formatDmBookingSystemMessageDisplay,
  isDmBookingSystemMessage,
} from "@/lib/dm/dmBookingSystemMessages";

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

function resolveVisibleBookingFromMessage(
  messageText: string,
  bookings: BookingRequest[],
  conversationId: string,
): BookingRequest | null {
  if (!isBookingRequestMessage(messageText)) {
    return null;
  }

  if (
    evaluateDmBookingCardVisibility(messageText, bookings, conversationId).hideCard
  ) {
    return null;
  }

  return resolveLiveBookingForDmMessage(messageText, bookings, conversationId);
}

function findVisibleBookingForTimelineNotice(
  messageIndex: number,
  messages: readonly { text: string }[],
  bookings: BookingRequest[],
  conversationId: string,
): BookingRequest | null {
  for (const offset of [-1, 1, -2, 2]) {
    const neighbor = messages[messageIndex + offset];

    if (!neighbor) {
      continue;
    }

    const booking = resolveVisibleBookingFromMessage(
      neighbor.text,
      bookings,
      conversationId,
    );

    if (booking) {
      return booking;
    }
  }

  for (let index = messageIndex - 1; index >= 0; index -= 1) {
    const booking = resolveVisibleBookingFromMessage(
      messages[index].text,
      bookings,
      conversationId,
    );

    if (booking) {
      return booking;
    }
  }

  return null;
}

/** Hide timeline copy when a visible booking card already reflects the same live state. */
export function shouldSuppressDmBookingTimelineNotice(
  messageText: string,
  options: {
    bookings: BookingRequest[];
    conversationId: string;
    messages: readonly { text: string }[];
    messageIndex: number;
  },
): boolean {
  if (!isDmBookingSystemMessage(messageText)) {
    return false;
  }

  const booking = findVisibleBookingForTimelineNotice(
    options.messageIndex,
    options.messages,
    options.bookings,
    options.conversationId,
  );

  if (!booking) {
    return false;
  }

  const display = formatDmBookingSystemMessageDisplay(messageText);
  const status = booking.status;

  if (display.startsWith(DM_BOOKING_PROPOSED_RATE_PREFIX)) {
    const proposedRate = display.slice(DM_BOOKING_PROPOSED_RATE_PREFIX.length).trim();

    return (
      hasPendingRateProposal(booking) &&
      formatIntegerRateDisplay(booking.proposed_rate) === proposedRate
    );
  }

  if (
    display === DM_BOOKING_RATE_DECLINED_MESSAGE ||
    display === DM_BOOKING_ORIGINAL_OFFER_KEPT_MESSAGE
  ) {
    return status === "pending" && !hasPendingRateProposal(booking);
  }

  if (
    display === DM_BOOKING_PROPOSED_RATE_ACCEPTED_MESSAGE ||
    display === DM_BOOKING_CONFIRMED_MESSAGE
  ) {
    return status === "accepted";
  }

  if (display === DM_BOOKING_REQUEST_DECLINED_MESSAGE) {
    return status === "declined";
  }

  if (display === DM_BOOKING_CANCELLED_MESSAGE) {
    return status === "cancelled";
  }

  return false;
}

export function classifyDmConversationMessageKind(
  messageText: string,
  options: {
    bookings: BookingRequest[];
    conversationId: string;
    messages?: readonly { text: string }[];
    messageIndex?: number;
  },
): DmChatVisibleMessageKind {
  if (
    isBookingActivityDmMessage(messageText) &&
    parseEventCancellationActivityEventName(messageText)
  ) {
    return "hidden";
  }

  if (isDmBookingSystemMessage(messageText)) {
    if (
      options.messages != null &&
      options.messageIndex != null &&
      shouldSuppressDmBookingTimelineNotice(messageText, {
        bookings: options.bookings,
        conversationId: options.conversationId,
        messages: options.messages,
        messageIndex: options.messageIndex,
      })
    ) {
      return "hidden";
    }

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
    .map((message, messageIndex) => ({
      id: message.id,
      created_at: message.created_at,
      kind: classifyDmConversationMessageKind(message.text, {
        ...options,
        messages,
        messageIndex,
      }),
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
