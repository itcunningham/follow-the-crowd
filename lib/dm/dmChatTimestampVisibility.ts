import {
  evaluateDmBookingCardVisibility,
  isBookingActivityDmMessage,
  isBookingRequestMessage,
  parseEventCancellationActivityEventName,
  type BookingRequest,
} from "@/lib/bookingRequests";
import { isDmBookingSystemMessage } from "@/lib/dm/dmBookingSystemMessages";

/** Gap after which a new timestamp adds value (matches common messaging app clustering). */
export const DM_CHAT_MEANINGFUL_TIME_GAP_MS = 5 * 60 * 1000;

export type DmChatVisibleMessageKind = "timeline" | "chat" | "booking_card" | "hidden";

export type DmChatTimestampLayout = {
  showTimestamp: boolean;
  compactBelow: boolean;
};

type TimestampVisibilityMessage = {
  id: string;
  created_at: string;
  kind: DmChatVisibleMessageKind;
};

function resolveMessageTimestampMs(createdAt: string): number {
  const timestampMs = new Date(createdAt).getTime();

  return Number.isNaN(timestampMs) ? 0 : timestampMs;
}

function hasMeaningfulGapFromPrevious(
  currentCreatedAt: string,
  previousCreatedAt: string | undefined,
): boolean {
  if (!previousCreatedAt) {
    return false;
  }

  const currentMs = resolveMessageTimestampMs(currentCreatedAt);
  const previousMs = resolveMessageTimestampMs(previousCreatedAt);

  if (currentMs === 0 || previousMs === 0) {
    return false;
  }

  return currentMs - previousMs >= DM_CHAT_MEANINGFUL_TIME_GAP_MS;
}

/** Decide when booking timeline rows show a visible timestamp. */
export function resolveDmBookingTimelineTimestampLayout(
  messages: readonly TimestampVisibilityMessage[],
): Map<string, DmChatTimestampLayout> {
  const layoutByMessageId = new Map<string, DmChatTimestampLayout>();
  const visibleMessages = messages.filter((message) => message.kind !== "hidden");

  for (let index = 0; index < visibleMessages.length; index += 1) {
    const message = visibleMessages[index];

    if (message.kind !== "timeline") {
      continue;
    }

    const previous = visibleMessages[index - 1];
    const next = visibleMessages[index + 1];
    const nextIsTimeline = next?.kind === "timeline";
    const isLastInTimelineRun = !nextIsTimeline;

    layoutByMessageId.set(message.id, {
      showTimestamp:
        isLastInTimelineRun ||
        hasMeaningfulGapFromPrevious(message.created_at, previous?.created_at),
      compactBelow: nextIsTimeline,
    });
  }

  return layoutByMessageId;
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

export function buildDmBookingTimelineTimestampLayout(
  messages: readonly { id: string; created_at: string; text: string }[],
  options: {
    bookings: BookingRequest[];
    conversationId: string;
  },
): Map<string, DmChatTimestampLayout> {
  return resolveDmBookingTimelineTimestampLayout(
    messages.map((message) => ({
      id: message.id,
      created_at: message.created_at,
      kind: classifyDmConversationMessageKind(message.text, options),
    })),
  );
}
