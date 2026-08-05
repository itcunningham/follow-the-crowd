/**
 * DJ Event Details helpers for Your booking / Message CTA.
 */

/** Cap planner name in the Message CTA so long display names don't billboard the button. */
export const DJ_BOOKING_MESSAGE_NAME_MAX_CHARS = 14;

export function collectEventDetailProfileIds(
  recipientIds: string[],
  ownerId: string | null | undefined,
): string[] {
  const ids = new Set<string>();

  for (const recipientId of recipientIds) {
    const trimmed = recipientId.trim();

    if (trimmed) {
      ids.add(trimmed);
    }
  }

  const trimmedOwnerId = ownerId?.trim();

  if (trimmedOwnerId) {
    ids.add(trimmedOwnerId);
  }

  return Array.from(ids);
}

function truncatePlannerNameForMessageLabel(name: string): string {
  const chars = Array.from(name);

  if (chars.length <= DJ_BOOKING_MESSAGE_NAME_MAX_CHARS) {
    return name;
  }

  return `${chars.slice(0, DJ_BOOKING_MESSAGE_NAME_MAX_CHARS - 1).join("")}…`;
}

/** Message CTA for DJ → planner booking conversation. */
export function formatDjBookingMessageLabel(
  plannerDisplayName: string | null | undefined,
): string {
  const name = plannerDisplayName?.trim();

  if (!name) {
    return "Message";
  }

  return `Message ${truncatePlannerNameForMessageLabel(name)}`;
}
